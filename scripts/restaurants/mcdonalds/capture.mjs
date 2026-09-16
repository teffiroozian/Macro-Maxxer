import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data/restaurants/mcdonalds/raw");
const BASE = "https://www.mcdonalds.com";
const FULL_MENU = `${BASE}/us/en-us/full-menu.html`;
const ITEM_LIST = `${BASE}/dnaapp/itemList`;
const ITEM_DETAILS = `${BASE}/dnaapp/itemDetails`;
const PROXY = "https://r.jina.ai/";
const MANUAL_RECONCILIATIONS = new Map([
  [
    "https://www.mcdonalds.com/us/en-us/product/mocha-latte-small.html",
    {
      itemId: 202961,
      reason: "Manual exception: candidate 202961 matches the current public 290-calorie product and complete recipe; candidate 200679 is marked Core but conflicts on nutrition and components.",
    },
  ],
]);

async function fetchText(url) {
  try {
    const direct = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (direct.ok) return { text: await direct.text(), via: "direct" };
  } catch {}

  const response = await fetch(`${PROXY}${url}`, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return { text: await response.text(), via: "r.jina.ai fallback" };
}

async function fetchRenderedPage(url) {
  const response = await fetch(`${PROXY}${url}`, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return { text: await response.text(), via: "r.jina.ai rendered-page fallback" };
}

function unwrapProxy(text) {
  const marker = "Markdown Content:\n";
  const at = text.indexOf(marker);
  return at === -1 ? text : text.slice(at + marker.length).trim();
}

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/[®™*^]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenKey(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => !["and", "with", "the", "mccafe"].includes(token))
    .sort()
    .join(" ");
}

const SIZE_TOKENS = new Set(["small", "medium", "large"]);
const FAMILY_STOP_WORDS = new Set([
  "and", "with", "the", "mcdonalds", "mccafe", "meal", "combo", "deal", "bundle", "limited", "time", "only", "new",
]);
const OUNCE_TOKENS = new Set(["16", "22", "30", "oz"]);

function tokens(value) {
  return normalize(value).split(" ").filter(Boolean);
}

function sizeFrom(value) {
  const namedSize = tokens(value).find((token) => SIZE_TOKENS.has(token));
  if (namedSize) return namedSize;
  const ounces = normalize(value).match(/\b(16|22|30)\s*oz\b/)?.[1];
  return ({ 16: "small", 22: "medium", 30: "large" })[ounces] ?? null;
}

function familyKey(value) {
  let canonical = normalize(value).replace(/\bcoca cola\b/g, "coke");
  if (/\bred bull\b/.test(canonical)) {
    canonical = canonical.replace(/\b(?:reduced|zero) sugar\b/g, "zero sugar");
  }
  return tokens(canonical)
    .filter((token) => !SIZE_TOKENS.has(token) && !OUNCE_TOKENS.has(token) && !FAMILY_STOP_WORDS.has(token))
    .sort()
    .join(" ");
}

function isFamilySubset(left, right) {
  const leftTokens = new Set(familyKey(left).split(" ").filter(Boolean));
  const rightTokens = new Set(familyKey(right).split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return false;
  const [smaller, larger] = leftTokens.size <= rightTokens.size
    ? [leftTokens, rightTokens]
    : [rightTokens, leftTokens];
  return [...smaller].every((token) => larger.has(token));
}

function categoryNames(item) {
  const categories = item?.categories?.category ?? [];
  const names = (Array.isArray(categories) ? categories : [categories]).map((category) => normalize(category?.name ?? ""));
  const defaultCategory = normalize(item?.default_category?.category?.name ?? "");
  if (defaultCategory) names.push(defaultCategory);
  return [...new Set(names.filter(Boolean))];
}

function isCollectionCandidate(item) {
  if (normalize(item.item_type ?? "").includes("collection")) return true;
  const categories = categoryNames(item);
  if (categories.some((category) =>
    category.includes("extra value meal") || category.includes("meal deal") || category.includes("happy meal")
  )) return true;
  const identity = normalize(`${item.short_name ?? ""} ${item.item_marketing_name ?? ""} ${item.item_name ?? ""}`);
  return /\b(meal|combo)\b/.test(identity) && item.has_components === "No";
}

function normalizeMenuNumber(value) {
  return String(value)
    .split("-")
    .map((part) => part.replace(/^0+(?=\d)/, ""))
    .join("-");
}

function hasCanonicalMenuNumber(item) {
  const numbers = [item.external_id, item.menu_item_no, item.genesis_menu_item_no]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim());
  return numbers.some((number) => !number.includes("-") || /-000$/.test(number));
}

function imageMenuNumbers(imageUrl) {
  const filename = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop())
    .split(":")[0]
    .replace(/_\d{3,4}x\d{3,4}.*$/i, "");
  const withoutDates = filename.replace(/(?:^|_)(?:19|20)\d{4}(?=_|$)/g, "_");
  return [...withoutDates.matchAll(/(?:^|_)(\d{3,5}(?:-\d{3})?)(?=_|$)/g)]
    .map((match) => normalizeMenuNumber(match[1]));
}

function parseMenu(markdown, sourceUrl) {
  const rows = [];
  let category = null;
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) category = heading[1].trim();
    if (!category || category === "Welcome!") continue;

    const productLink = line.match(/\]\((https:\/\/www\.mcdonalds\.com\/us\/en-us\/(?:product|meal)\/[^)]+)\)\s*$/);
    if (!productLink) continue;
    const prefix = line.slice(0, productLink.index);
    const imageStart = prefix.match(/^\*\s+\[!\[[^\]]*\]\(/);
    if (!imageStart) continue;
    const imageAndName = prefix.slice(imageStart[0].length);
    let delimiter = -1;
    for (let at = imageAndName.indexOf(")"); at !== -1; at = imageAndName.indexOf(")", at + 1)) {
      const possibleName = imageAndName.slice(at + 1).trim();
      if (!possibleName || /^[:?&/]/.test(possibleName) || /^[\w-]*:nutrition-calculator\b/.test(possibleName)) continue;
      try {
        new URL(imageAndName.slice(0, at));
        delimiter = at;
        break;
      } catch {}
    }
    if (delimiter === -1) continue;
    rows.push({
      name: imageAndName.slice(delimiter + 1).replace(/\s+/g, " ").trim(),
      category,
      productUrl: productLink[1],
      imageUrl: imageAndName.slice(0, delimiter),
      discoveredFrom: sourceUrl,
    });
  }
  return rows;
}

async function enumerateOfficialItems() {
  const found = [];
  const batches = [];
  let consecutiveEmptyBatches = 0;
  // McDonald's does not expose a menu-wide enumeration contract on these
  // pages. Scan forward adaptively and stop only after a sustained empty tail,
  // instead of pinning capture coverage to a fixed 204999 ceiling.
  for (let start = 200000; start < 250000 && consecutiveEmptyBatches < 10; start += 50) {
    const ids = Array.from({ length: 50 }, (_, i) => `${start + i}()`).join("-");
    const url = `${ITEM_LIST}?country=US&language=en&showLiveData=true&nutrient_req=N&item=${ids}`;
    const { text } = await fetchText(url);
    const payload = JSON.parse(unwrapProxy(text));
    const items = payload?.items?.item ?? [];
    const records = Array.isArray(items) ? items : [items];
    found.push(...records);
    consecutiveEmptyBatches = records.length ? 0 : consecutiveEmptyBatches + 1;
    batches.push({ start, end: start + 49, count: records.length });
    console.log(`ID scan ${start}-${start + 49}: ${found.length} records`);
  }
  return { items: found, batches };
}

function scoreCandidate(row, item) {
  const slug = new URL(row.productUrl).pathname.split("/").pop().replace(/\.html$/, "");
  const slugKey = normalize(slug);
  const nameKey = normalize(row.name.replace(/^(?:Limited Time Only|New)\s+/i, ""));
  const shortKey = normalize(item.short_name ?? "");
  const marketingKey = normalize(item.item_marketing_name ?? "");
  const internalKey = normalize(item.item_name ?? "");
  const publicSize = sizeFrom(slugKey);
  const candidateSize = sizeFrom(`${shortKey} ${marketingKey} ${internalKey}`);
  const isMealPage = new URL(row.productUrl).pathname.includes("/meal/");
  const isCollection = isCollectionCandidate(item);
  const reasons = [];

  if (isMealPage !== isCollection) return { compatible: false, score: 0, reasons: ["item_type_mismatch"] };
  if (publicSize && candidateSize && publicSize !== candidateSize) {
    return { compatible: false, score: 0, reasons: [`size_mismatch:${publicSize}:${candidateSize}`] };
  }

  let score = 0;
  if (shortKey === slugKey) { score += 120; reasons.push("slug_exact"); }
  if (tokenKey(shortKey) === tokenKey(slugKey)) { score += 85; reasons.push("slug_tokens_exact"); }
  if (marketingKey === nameKey) { score += 80; reasons.push("marketing_name_exact"); }
  if (internalKey === nameKey) { score += 70; reasons.push("internal_name_exact"); }
  if (familyKey(shortKey) && familyKey(shortKey) === familyKey(slugKey)) { score += 55; reasons.push("slug_family_exact"); }
  if (familyKey(marketingKey) && familyKey(marketingKey) === familyKey(nameKey)) { score += 55; reasons.push("name_family_exact"); }
  if (isMealPage && isFamilySubset(shortKey, slugKey) && familyKey(shortKey) !== familyKey(slugKey)) {
    score += 25;
    reasons.push("meal_family_contained");
  }
  if (publicSize && candidateSize === publicSize) { score += 25; reasons.push(`size_exact:${publicSize}`); }

  const imageNumbers = imageMenuNumbers(row.imageUrl);
  const primaryImageNumber = imageNumbers.at(-1) ?? null;
  const candidateNumbers = [item.external_id, item.menu_item_no, item.genesis_menu_item_no]
    .filter((value) => value !== undefined && value !== null)
    .map(normalizeMenuNumber);
  if (primaryImageNumber && candidateNumbers.includes(primaryImageNumber)) {
    score += 85;
    reasons.push("image_menu_number_full_exact");
  } else if (primaryImageNumber && candidateNumbers.some((number) =>
    number.split("-")[0] === primaryImageNumber.split("-")[0]
  )) {
    score += 25;
    reasons.push("image_menu_number_base_match");
  } else if (imageNumbers.slice(0, -1).some((number) => candidateNumbers.includes(number))) {
    score += 25;
    reasons.push("image_menu_number_secondary_match");
  }

  const pageCategories = row.categories.map(normalize);
  const candidateCategories = categoryNames(item);
  if (pageCategories.some((pageCategory) => candidateCategories.some((candidateCategory) =>
    pageCategory === candidateCategory || pageCategory.includes(candidateCategory) || candidateCategory.includes(pageCategory)
  ))) {
    score += 12;
    reasons.push("category_compatible");
  }

  if (typeof item.do_not_show === "string" && normalize(item.do_not_show) === "core") {
    score += 30;
    reasons.push("core_record");
  }
  if (hasCanonicalMenuNumber(item)) {
    score += 30;
    reasons.push("canonical_menu_number");
  }

  const identityReasons = reasons.filter((reason) =>
    !reason.startsWith("size_exact:") &&
    reason !== "category_compatible" &&
    reason !== "core_record" &&
    reason !== "canonical_menu_number"
  );
  return { compatible: true, score: identityReasons.length ? score : 0, reasons };
}

function chooseId(row, catalog) {
  const manual = MANUAL_RECONCILIATIONS.get(row.productUrl);
  if (manual) {
    const item = catalog.find((candidate) => candidate.item_id === manual.itemId);
    if (!item) throw new Error(`Manual reconciliation candidate ${manual.itemId} is absent from itemList`);
    return {
      itemId: manual.itemId,
      status: "manual_reconciliation",
      candidateCount: 1,
      candidates: [{
        itemId: item.item_id,
        shortName: item.short_name ?? null,
        marketingName: item.item_marketing_name ?? null,
        internalName: item.item_name ?? null,
        itemType: item.item_type ?? null,
        itemStatus: item.item_status_flag ?? null,
        categories: categoryNames(item),
        score: null,
        reasons: [manual.reason],
      }],
    };
  }
  const candidates = catalog
    .map((item) => ({ item, ...scoreCandidate(row, item) }))
    .filter((candidate) => candidate.compatible && candidate.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.item.item_id) - Number(b.item.item_id));
  const winner = candidates[0];
  const runnerUp = candidates[1];
  const clearWinner = winner && winner.score >= 80 && (!runnerUp || winner.score - runnerUp.score >= 20);
  return {
    itemId: clearWinner ? winner.item.item_id : null,
    status: clearWinner ? "matched" : candidates.length ? "ambiguous" : "zero_candidates",
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 10).map(({ item, score, reasons }) => ({
      itemId: item.item_id,
      shortName: item.short_name ?? null,
      marketingName: item.item_marketing_name ?? null,
      internalName: item.item_name ?? null,
      itemType: item.item_type ?? null,
      itemStatus: item.item_status_flag ?? null,
      categories: categoryNames(item),
      score,
      reasons,
    })),
  };
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const fullMenuResponse = await fetchRenderedPage(FULL_MENU);
  const fullMenuMarkdown = unwrapProxy(fullMenuResponse.text);
  const categoryLinks = [...fullMenuMarkdown.matchAll(/\]\((https:\/\/www\.mcdonalds\.com\/us\/en-us\/full-menu\/[^)]+\.html)\)/g)]
    .map((match) => match[1]);
  const categoryUrls = [...new Set(categoryLinks)];
  const categoryPages = await mapLimit(categoryUrls, 5, async (url) => ({ url, ...(await fetchRenderedPage(url)) }));
  console.log(`Fetched ${categoryPages.length} category pages`);

  const discoveries = [
    ...parseMenu(fullMenuMarkdown, FULL_MENU),
    ...categoryPages.flatMap(({ url, text }) => parseMenu(unwrapProxy(text), url)),
  ];
  const enumeration = await enumerateOfficialItems();
  const catalog = enumeration.items;
  console.log(`Official ID catalog records: ${catalog.length}`);

  const byUrl = new Map();
  for (const row of discoveries) {
    const existing = byUrl.get(row.productUrl);
    if (existing) {
      if (!existing.categories.includes(row.category)) existing.categories.push(row.category);
      if (!existing.discoveredFrom.includes(row.discoveredFrom)) existing.discoveredFrom.push(row.discoveredFrom);
      continue;
    }
    byUrl.set(row.productUrl, {
      itemId: null,
      name: row.name,
      category: row.category,
      categories: [row.category],
      productUrl: row.productUrl,
      imageUrl: row.imageUrl,
      discoveredFrom: [row.discoveredFrom],
    });
  }

  const menuItems = [...byUrl.values()].sort((a, b) => a.productUrl.localeCompare(b.productUrl));
  for (const row of menuItems) {
    const match = chooseId(row, catalog);
    row.itemId = match.itemId;
    row.match = {
      status: match.status,
      candidateCount: match.candidateCount,
      candidates: match.candidates,
    };
  }
  const ids = [...new Set(menuItems.map((row) => row.itemId).filter(Number.isInteger))].sort((a, b) => a - b);

  const failures = [];
  const detailPairs = await mapLimit(ids, 6, async (id) => {
    const url = `${ITEM_DETAILS}?country=US&language=en&showLiveData=true&item=${id}`;
    try {
      const { text } = await fetchText(url);
      const payload = JSON.parse(unwrapProxy(text));
      if (!payload?.item?.item_id) throw new Error("response did not contain item.item_id");
      return [String(id), payload];
    } catch (error) {
      failures.push({ itemId: id, url, error: String(error) });
      return null;
    }
  });
  const itemDetails = Object.fromEntries(detailPairs.filter(Boolean));

  const duplicateNames = Object.entries(Object.groupBy(menuItems, (row) => normalize(row.name)))
    .filter(([, rows]) => rows.length > 1)
    .map(([, rows]) => rows.map(({ itemId, name, productUrl }) => ({ itemId, name, productUrl })));
  const duplicateIds = Object.entries(Object.groupBy(menuItems.filter((row) => row.itemId), (row) => row.itemId))
    .filter(([, rows]) => rows.length > 1)
    .map(([itemId, rows]) => ({ itemId: Number(itemId), productUrls: rows.map((row) => row.productUrl) }));

  const menuSource = {
    capturedAt: new Date().toISOString(),
    items: menuItems,
    diagnostics: {
      discoveredCount: menuItems.length,
      withItemIdCount: ids.length,
      duplicateNames,
      duplicateIds,
      missingIds: menuItems.filter((row) => !row.itemId).map(({ name, category, productUrl }) => ({ name, category, productUrl })),
      unresolvedByMatchStatus: Object.groupBy(
        menuItems.filter((row) => !row.itemId),
        (row) => row.match.status,
      ),
      detailFailures: failures,
    },
  };
  const sources = {
    capturedAt: menuSource.capturedAt,
    fullMenu: FULL_MENU,
    categoryPages: categoryUrls,
    itemListEndpoint: `${ITEM_LIST}?country=US&language=en&showLiveData=true&nutrient_req=N&item={itemIds}`,
    itemDetailsEndpoint: `${ITEM_DETAILS}?country=US&language=en&showLiveData=true&item={itemId}`,
    transport: {
      directAttemptedFirst: true,
      fallback: PROXY,
      note: "The fallback wraps official responses. The wrapper is removed; JSON payloads are not normalized or reshaped.",
    },
    itemListDiscovery: {
      strategy: "adaptive 50-ID batches beginning at 200000; stop after 10 consecutive empty batches",
      batches: enumeration.batches,
      catalogRecordCount: catalog.length,
    },
    manualReconciliations: [...MANUAL_RECONCILIATIONS].map(([productUrl, value]) => ({ productUrl, ...value })),
  };

  await writeFile(path.join(OUT, "menu.json"), `${JSON.stringify(menuSource, null, 2)}\n`);
  await writeFile(path.join(OUT, "item-details.json"), `${JSON.stringify(itemDetails, null, 2)}\n`);
  await writeFile(path.join(OUT, "item-list-catalog.json"), `${JSON.stringify({ items: catalog }, null, 2)}\n`);
  await writeFile(path.join(OUT, "source-metadata.json"), `${JSON.stringify(sources, null, 2)}\n`);

  console.log(JSON.stringify({
    discovered: menuItems.length,
    withItemIds: ids.length,
    detailResponses: Object.keys(itemDetails).length,
    duplicateNames: duplicateNames.length,
    duplicateIds: duplicateIds.length,
    missingIds: menuSource.diagnostics.missingIds.length,
    failedDetails: failures.length,
  }, null, 2));
}

await main();

// Words discovery looks for. Restaurant-independent.
import { ALL_NUTRIENTS, type NutrientKey } from "../pipeline/contracts";

// Text labels as they appear on nutrition panels, PDFs and pages.
// totalFat must not match "Sat Fat", "Trans Fat", "Fat Cal" or "Low-fat".
export const NUTRIENT_LABELS: Record<NutrientKey, RegExp> = {
  calories: /\b(?:calories|calorie|kcal|energy)\b/gi,
  protein: /\bproteins?\b/gi,
  carbs: /\b(?:total\s+)?(?:carbohydrates?|carbs?)\b/gi,
  totalFat: /(?<!(?:sat(?:urated)?|trans|low|non|reduced)[\s.-]*)\b(?:total\s+)?fat\b(?!\s*cal)(?!-free)/gi,
  satFat: /\b(?:sat(?:urated)?\.?\s*fat)\b/gi,
  transFat: /\btrans\.?\s*fat\b/gi,
  cholesterol: /\b(?:cholesterol|chol\.?)(?=\W)/gi,
  sodium: /\bsodium\b/gi,
  fiber: /\b(?:dietary\s+)?(?:fiber|fibre)\b/gi,
  sugars: /\b(?:total\s+)?sugars?\b/gi,
};

// JSON keys, compared after lowercasing and removing non-alphanumerics.
const KEY_SYNONYMS: Record<NutrientKey, string[]> = {
  calories: ["calories", "calorie", "cal", "kcal", "energy", "energykcal", "maxcalories", "mincalories", "basecalories", "totalcalories"],
  protein: ["protein", "proteins", "proteing", "proteingrams", "totalprotein"],
  carbs: ["carbs", "carb", "carbohydrate", "carbohydrates", "carbsg", "carbohydrateg", "carbohydratesg", "totalcarbohydrate", "totalcarbohydrates", "totalcarbs", "totalcarb"],
  totalFat: ["fat", "fatg", "totalfat", "totalfatg", "fattotal"],
  satFat: ["satfat", "saturatedfat", "satfatg", "saturatedfatg", "fatsaturated"],
  transFat: ["transfat", "transfatg", "fattrans"],
  cholesterol: ["cholesterol", "chol", "cholesterolmg"],
  sodium: ["sodium", "sodiummg"],
  fiber: ["fiber", "fibre", "dietaryfiber", "fiberg", "dietaryfiberg"],
  sugars: ["sugar", "sugars", "totalsugars", "sugarsg", "sugarg"],
};

const KEY_TO_NUTRIENT = new Map<string, NutrientKey>();
for (const nutrient of ALL_NUTRIENTS) for (const key of KEY_SYNONYMS[nutrient]) KEY_TO_NUTRIENT.set(key, nutrient);

export function nutrientForKey(key: string): NutrientKey | undefined {
  return KEY_TO_NUTRIENT.get(key.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

// How promising a URL or link text is. Used to order the crawl frontier.
const RELEVANCE: Array<[RegExp, number]> = [
  [/nutrition|nutritional|nutrient|macros?\b|calorie/i, 6],
  [/allergen|ingredient/i, 3],
  [/\bmenu\b|menus?\//i, 2],
  [/\.(?:pdf|csv|xlsx?)(?:$|\?)/i, 2],
  [/\b(?:order|ordering|store|locations?)\b/i, 1],
];

const NOISE = /(?:privacy|terms|careers?|jobs|press|news|blog|gift|franchis|login|sign-?in|account|cart|checkout|basket|rewards|cookie|accessibility|\.(?:png|jpe?g|gif|svg|webp|ico|css|woff2?|mp4)(?:$|\?))/i;

export function relevance(url: string, text = ""): number {
  const haystack = `${url} ${text}`;
  if (NOISE.test(url)) return 0;
  let score = 0;
  for (const [pattern, weight] of RELEVANCE) if (pattern.test(haystack)) score += weight;
  return score;
}

// Paths worth trying on every official domain.
// Trailing slashes are ignored when URLs are compared.
export const WELL_KNOWN_PATHS = ["/robots.txt", "/nutrition", "/nutrition-information", "/nutrition-facts", "/allergens", "/allergen", "/menu"];

export const DOCUMENT_EXTENSION = /\.(pdf|csv|xlsx?|docx?)(?:$|[?#])/i;

// Statements a reviewer should see: offers of more data, and caveats about
// the serving basis of published numbers (standards §2.2, §5).
export const NOTABLE_STATEMENTS: RegExp[] = [
  /\b(?:additional|more|further|full|complete)?\s*nutrition(?:al)?\s+(?:information|info|facts)\s+(?:is\s+|are\s+)?(?:available|provided)\s+(?:up)?on\s+request[^.\n]{0,100}/i,
  /\bcontact\s+us\s+for\s+(?:more|additional|full)\s+nutrition[^.\n]{0,100}/i,
  /\b(?:the\s+)?calories\s+(?:stated|shown|listed|displayed)\s+(?:are|is)\s+for[^.\n]{0,200}/i,
  /[^.\n]{0,80}\bmay\s+be\s+(?:less|lower)\s+for\s+(?:multiple|multi)[^.\n]{0,80}/i,
  /\bnutrition(?:al)?\s+information\s+(?:is\s+)?(?:based|calculated)\s+on[^.\n]{0,120}/i,
];

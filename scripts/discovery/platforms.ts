// Ordering and website platforms discovery recognizes, and the read-only
// endpoints worth one anonymous GET when a restaurant uses them.
//
// Discovery never extracts credentials, creates baskets, or retries with
// auth. A 401/403 is recorded as "auth_required" and reported as a lead.
// Add a platform here once and every restaurant on it benefits.

export type EndpointTemplate = {
  // Placeholders: {origin} (the official/ordering origin the platform was
  // seen on) and {storeId}.
  template: string;
  accept?: string;
  purpose: string;
};

export type Platform = {
  id: string;
  name: string;
  fingerprints: RegExp[];
  // Hosts that belong to the platform's ordering API. Responses from them are
  // the restaurant's ordering system ("ordering_system" authority).
  orderingApiHosts?: string[];
  endpoints?: EndpointTemplate[];
  note: string;
};

export const PLATFORMS: Platform[] = [
  {
    id: "koala",
    name: "Koala ordering",
    fingerprints: [/\bapi\.koala\.io\b/, /\bcms\.koala\.io\b/],
    orderingApiHosts: ["api.koala.io"],
    endpoints: [
      {
        template: "https://api.koala.io/v1/ordering/store-locations/{storeId}/menu?wanted-at=asap",
        accept: "application/json",
        purpose: "store menu (categories, products, option groups)",
      },
    ],
    note: "Koala storefronts server-render the store menu into the ordering page's __NEXT_DATA__, which has been readable anonymously. The direct menu API has required authorization.",
  },
  {
    id: "olo",
    name: "Olo ordering",
    fingerprints: [/\.olo\.com\b/i, /\bolo-(?:ordering|serve)\b/i],
    note: "Olo's ordering API needs a partner key. Use the brand's public ordering pages and nutrition pages instead.",
  },
  {
    id: "nutritionix",
    name: "Nutritionix calculator",
    fingerprints: [/\bnutritionix\.com\b/i, /\bnix[-_]?(?:calculator|widget)\b/i],
    note: "A Nutritionix-hosted calculator is official only when the restaurant's own site embeds or links it. Copies elsewhere are third-party.",
  },
  {
    id: "wordpress",
    name: "WordPress site",
    // An absolute match names the WordPress origin; a relative one means the page's own.
    fingerprints: [/(https?:\/\/[a-z0-9.-]+)?\/wp-(?:content|json)\//i, /api\.w\.org/],
    endpoints: [
      {
        template: "{origin}/wp-json/wp/v2/media?search=nutrition&per_page=50&_fields=id,link,source_url,mime_type,modified_gmt,title",
        accept: "application/json",
        purpose: "uploaded files matching \"nutrition\" (finds PDFs that no page links)",
      },
      {
        template: "{origin}/wp-json/wp/v2/pages?search=nutrition&per_page=20&_fields=id,link,modified_gmt,title",
        accept: "application/json",
        purpose: "pages matching \"nutrition\"",
      },
    ],
    note: "WordPress exposes a read-only REST index of pages and uploaded media.",
  },
  {
    id: "nextjs",
    name: "Next.js page data",
    fingerprints: [/__NEXT_DATA__/, /\/_next\/static\//],
    note: "Server-rendered page data (__NEXT_DATA__) can hold the full menu tree.",
  },
  { id: "toast", name: "Toast ordering", fingerprints: [/\btoasttab\.com\b/i], note: "Toast online ordering pages render menus client-side; inspect the ordering page's embedded data." },
  { id: "square", name: "Square Online", fingerprints: [/\bsquare\.site\b/i, /\bsquareup\.com\b/i], note: "Square Online sites; menus are per location." },
  { id: "chownow", name: "ChowNow", fingerprints: [/\bchownow\.com\b/i], note: "ChowNow ordering widget." },
];

// `origin` is set when the fingerprint itself names the host (an absolute URL).
export function detectPlatforms(content: string): Array<{ platform: Platform; evidence: string; origin?: string }> {
  const hits: Array<{ platform: Platform; evidence: string; origin?: string }> = [];
  for (const platform of PLATFORMS) {
    for (const fingerprint of platform.fingerprints) {
      const match = fingerprint.exec(content);
      if (match) {
        hits.push({ platform, evidence: match[0], origin: match[1] && /^https?:\/\//.test(match[1]) ? new URL(match[1]).origin : undefined });
        break;
      }
    }
  }
  return hits;
}

export const PLATFORM_API_HOSTS = new Set(PLATFORMS.flatMap((platform) => platform.orderingApiHosts ?? []));

// Discovery targets. A target is only what a person would know before any
// research: the restaurant's domains, where its ordering site lives, and a
// few store ids. Everything else is discovered.
//
// Any restaurant can also be run without an entry here:
//   npm run discover -- --id <id> --name "<Name>" --domain <domain> [--ordering-domain <host>] [--store <id>]…
import type { DiscoveryTarget } from "./contracts";

export const modPizzaTarget: DiscoveryTarget = {
  id: "mod",
  name: "MOD Pizza",
  officialDomains: ["modpizza.com"],
  orderingDomains: ["orders.modpizza.com"],
  seeds: ["https://modpizza.com/", "https://orders.modpizza.com/", "https://orders.modpizza.com/store/4080", "https://orders.modpizza.com/store/4168"],
  // Hamburg, KY and Mobile, AL, the two stores sampled in Oct 2026 research.
  storeIds: ["4080", "4168"],
  replay: {
    manifest: "docs/research/mod-pizza/evidence-manifest.json",
    // Research extracts derived from the raw responses, not responses.
    exclude: ["nutrition-rows.json", "menu-structure-summary.json"],
  },
};

// An existing restaurant, used to check discovery is reusable. No replay:
// it only runs live. Its nutrition calculator renders in the browser.
export const chipotleTarget: DiscoveryTarget = {
  id: "chipotle",
  name: "Chipotle",
  officialDomains: ["chipotle.com"],
  seeds: ["https://www.chipotle.com/", "https://www.chipotle.com/nutrition-calculator"],
};

export const DISCOVERY_TARGETS: Record<string, DiscoveryTarget> = {
  [modPizzaTarget.id]: modPizzaTarget,
  "mod-pizza": modPizzaTarget,
  [chipotleTarget.id]: chipotleTarget,
};

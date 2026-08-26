# Chick-fil-A Migration/Enrichment Readiness

Production menu data: `data/restaurants/chickfila.json` (restaurant id `chickfila`, registered in `data/restaurants/index.json`).
Generated data: `data/generated/chick-fil-a/restaurant.json`.
Scope: what breaks or needs preserving if the app's `chickfila` menu file is swapped for the generated dataset. No fixes applied.

## 1. Must Preserve

**Restaurant registry metadata** — lives in `data/restaurants/index.json` (name, logo, cover, description, `isMacroFriendly`, `nutritionSourceUrl`, `nutritionUpdatedAt`). Separate file from the menu content the generator produces, so it isn't touched by this migration at all. No action needed — confirmed safe, not at risk.

**`hideFromIngredientView` overrides** — lives on 5 ingredient records in `data/restaurants/chickfila.json` (Honey Roasted BBQ Sauce, Crispy Nuggets, Grilled Nuggets, Chick-fil-A Chick-n-Strips®, Hash Browns). Hides ingredient-shaped entries that are really full menu items from the generic ingredient-browsing view (`RestaurantView.tsx`, `ItemRouteModal.tsx`, Chipotle's ingredient list builder). Official Chick-fil-A data has no concept of "hide from browse list," and nothing in global logic infers it — it's a pure content-curation call. Not carried by the generated dataset at all (field doesn't exist there). **Migrate into restaurant config**, re-keyed to the new generated ingredient IDs (the old slug IDs like `hash-browns` won't exist anymore).

**"Find & Compare" walkthrough item picks** — `app/page.tsx`'s `WALKTHROUGH_FIND_ITEM_IDS`, three hand-picked Chick-fil-A items chosen specifically because each wins a different ranking method (highest protein / lowest calorie / best protein score). This editorial selection isn't derivable from any data — it required someone to actually compare the numbers. The three literal ID strings are old-format IDs. **Migrate into restaurant config or the component itself**, re-pointed to the equivalent items' new generated IDs (Cool Wrap, Chick-n-Strips, Chicken Noodle Soup all still exist in the generated data).

## 2. Can Be Removed/Replaced

- **All manually-authored menu content in `data/restaurants/chickfila.json`** — items, nutrition, variants, ingredients, per-item ingredient refs, addon groups, and modifier relationships. The generated dataset already produces every one of these in the exact shape `types/menu.ts` expects (`comboConfig`, `variants`, `ingredientNutritionContexts`, `contextualNutritionUnits`, `customization.ingredientCategories`, `addonGroups`, `customizationRules.ingredientCategories`), sourced from official data instead of hand transcription.
- **Local static image mappings** (`/restaurants/chickfila/menu/**` webp/png files referenced per item/ingredient) — superseded by official CDN image URLs already present on every generated record, once the app is configured to load them (see Blockers).
- **`lib/restaurantRules/chickfila.ts`'s combo-guessing helpers** (`isWaffleFries`, `isHashBrowns`, `isChickfilaBreakfastItem`, `sortComboSides`) and `lib/comboMeals.ts`'s `resolveLegacyChickfilaComboConfig` — this whole heuristic exists only because production items have no real `comboConfig`, so it guesses one from category strings and hardcoded IDs. `resolveComboMealConfig` already prefers `item.comboConfig` first, and the generated data supplies a real, official `comboConfig` (entree/side/drink options) on every combo item — so this heuristic path becomes dead code once the switch happens. (`resolveJustItemLabel`/`resolveJustItemIcon` in the same file are generic category-based logic, not restaurant-specific — keep those.)
- **`customizationRules.foodCategories`** in `data/restaurants/chickfila.json` (6 hand-mapped category→tab-group entries) — `resolveIngredientTabs` already prefers an item's own `customization.ingredientCategories` over this restaurant-level fallback, and the generated data supplies item-level overrides for 217/429 items. Likely fully redundant, but worth a quick spot-check of any combo-eligible item that has no item-level override before deleting it outright.

## 3. Actual Runtime Blockers

- **No image domain allowlisting.** `next.config.ts` has no `images.remotePatterns`/`domains`. Several surfaces render `item.image` through `next/image` (`components/global-search/MenuItemResultRow.tsx`, `components/menu-item-card/IngredientCompactCard.tsx`, `components/cart/CartPreviewDrawer.tsx`, `components/cart/CartItemPreviewRow.tsx`, `components/item-route-modal/PresetBuildReview.tsx`). Generated images are absolute `https://www.cfacdn.com/...` URLs; without allowlisting that host, these will fail to load / throw. (The main `MenuItemCard.tsx` grid card uses a plain `<img>`, so it's unaffected.)
- **No sellable/source-only filtering.** 130 of 429 generated items are structural containers (`sourceOnly: true` — category placeholders, variant-container parents, dynamic meal groupings). Nothing in app code currently reads `sourceOnly` or the source `sellable` flag. Rendered as-is, these would show up as broken, non-functional cards in the menu grid.
- **Raw internal IDs leak into customization tab labels.** Every generated item-level `customization.ingredientCategories[].name` carries a disambiguation suffix like `"Bread Carriers [CFA 100227:2]"`. `ItemDetailsPanel.tsx` renders `tab.label` directly as the visible tab text with no sanitization step — users would see the bracketed internal group ID.
- **Data isn't wired up yet, and old-ID references remain.** `lib/restaurants.ts` (`menuFile`) and `lib/cart/cartItemLookup.ts`'s static import map both still point at `data/restaurants/chickfila.json`, not the generated output — the actual swap hasn't happened. Separately, `app/page.tsx`'s walkthrough item IDs (see Must Preserve) and any items already sitting in a user's persisted cart reference the old ID scheme; `findCartMenuItem` matches strictly by `item.id` with no migration/fallback for the main item (only combo/ingredient customizations fall back to name matching), so pre-existing cart entries would stop resolving.

## 4. Final Recommendation

- Macro Maxxer-specific enrichment pieces that must be preserved: **2** (`hideFromIngredientView` list, walkthrough item picks), plus the already-safe registry metadata (unaffected, no action needed).
- Actual runtime blockers: **4**, all narrow and mechanical (image domain config, source-only filtering, tab-label sanitization, and finishing the data wiring/ID remap) — no unknowns, no missing upstream data.

NOT READY FOR RUNTIME TESTING

Minimum blockers to fix first:
1. Add `cfacdn.com` (and any other official CFA image hosts in use) to `next.config.ts`'s `images.remotePatterns`.
2. Filter `sourceOnly` (or source `sellable === false`) records out of any menu-grid/listing view before rendering.
3. Strip the `[CFA <id>:<index>]` suffix from generated `customization.ingredientCategories[].name` before it reaches `ItemDetailsPanel`'s tab labels.
4. Point `lib/restaurants.ts`'s `chickfila` `menuFile` and `lib/cart/cartItemLookup.ts`'s `chickfila` entry at the generated dataset, and remap the 3 hardcoded IDs in `app/page.tsx`'s `WALKTHROUGH_FIND_ITEM_IDS` to their generated-data equivalents.

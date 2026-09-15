import generatedStarbucks from "@/data/restaurants/starbucks/generated/restaurant.json";
import type { GeneratedMenuSourceIdentity, MenuItem, RestaurantMenu } from "@/types/menu";

type GeneratedStarbucksItem = (typeof generatedStarbucks.items)[number];
type GeneratedStarbucksVariant = GeneratedStarbucksItem["variants"][number];

function runtimeSource(source: GeneratedStarbucksItem["source"] | GeneratedStarbucksVariant["source"]) {
  return {
    menu: { tags: [], pins: [] },
    generated: source as GeneratedMenuSourceIdentity,
  };
}

// The generated artifact remains the source of truth. This adapter only
// places its complete Starbucks provenance behind the runtime source envelope
// expected by shared menu/cart/detail consumers; it does not alter identities,
// categories, variants, defaults, images, or nutrition.
export const STARBUCKS_GENERATED_RUNTIME_MENU: RestaurantMenu = {
  items: generatedStarbucks.items.map(
    (item): MenuItem => ({
      ...item,
      servingType: item.servingType as MenuItem["servingType"],
      source: runtimeSource(item.source),
      variants: item.variants.map((variant) => ({
        ...variant,
        servingType: variant.servingType as MenuItem["servingType"],
        source: runtimeSource(variant.source),
      })),
    }),
  ),
};

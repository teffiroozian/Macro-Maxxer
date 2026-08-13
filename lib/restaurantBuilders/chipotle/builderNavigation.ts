import type { ChipotleEntreeId, ChipotleEntreeSelection } from "@/lib/restaurantBuilders/chipotle/types";
import { isChipotleEntreeId } from "@/lib/restaurantBuilders/chipotle/types";

// Single source of truth for the Build Your Own navigation query-param
// schema (`entree`, `view`, `ingredients`, `ingredientsCategory`) — every
// read and every write of these params goes through this module so the URL
// stays the one place that owns "what page/state is the user looking at."

export type ChipotleBuilderNavState = {
  entree: ChipotleEntreeSelection;
  isViewingAllIngredients: boolean;
  allIngredientsCategory: string;
};

// Same rule ChipotleRestaurantBuilderView already used at the point it read
// `entree` at mount: valid only if it's a real entrée id AND the current
// builder config actually offers it.
function parseEntreeParam(
  value: string | null,
  entreeOptions: Record<string, unknown>,
): ChipotleEntreeSelection {
  if (value && isChipotleEntreeId(value) && value in entreeOptions) {
    return value;
  }
  return null;
}

export function parseChipotleBuilderNavState(
  searchParams: { get: (key: string) => string | null },
  entreeOptions: Record<string, unknown>,
  defaultAllIngredientsCategory: string,
): ChipotleBuilderNavState {
  const isViewingAllIngredients = searchParams.get("ingredients") === "all";
  const allIngredientsCategory = isViewingAllIngredients
    ? (searchParams.get("ingredientsCategory") ?? defaultAllIngredientsCategory)
    : defaultAllIngredientsCategory;

  return {
    entree: parseEntreeParam(searchParams.get("entree"), entreeOptions),
    isViewingAllIngredients,
    allIngredientsCategory,
  };
}

export function resolveDefaultViewForEntree(entree: ChipotleEntreeId): "menu" | "ingredients" {
  return entree === "chips-sides" || entree === "high-protein-menu" || entree === "drinks"
    ? "menu"
    : "ingredients";
}

function cloneParams(current: URLSearchParams): URLSearchParams {
  return new URLSearchParams(current.toString());
}

// Switching entrées leaves behind an unrelated in-flight cart-item edit
// (there's no live way to reach this state today, but stripping it keeps a
// stale editCartItem/editOrigin from lingering if that ever changes) and
// always exits All Ingredients, since it's a comparison layered on top of
// whichever entrée used to be selected.
export function buildEntreeSelectionParams(
  current: URLSearchParams,
  entree: ChipotleEntreeId,
): URLSearchParams {
  const next = cloneParams(current);
  next.set("entree", entree);
  next.set("view", resolveDefaultViewForEntree(entree));
  next.delete("ingredients");
  next.delete("ingredientsCategory");
  next.delete("editCartItem");
  next.delete("editOrigin");
  return next;
}

export function buildGoToEntreeChooserParams(current: URLSearchParams): URLSearchParams {
  const next = cloneParams(current);
  next.delete("entree");
  next.delete("ingredients");
  next.delete("ingredientsCategory");
  next.delete("editCartItem");
  next.delete("editOrigin");
  return next;
}

export function buildAllIngredientsEnterParams(current: URLSearchParams): URLSearchParams {
  const next = cloneParams(current);
  next.set("ingredients", "all");
  next.set("view", "ingredients");
  next.delete("ingredientsCategory");
  return next;
}

export function buildAllIngredientsExitParams(current: URLSearchParams): URLSearchParams {
  const next = cloneParams(current);
  next.delete("ingredients");
  next.delete("ingredientsCategory");
  return next;
}

export function buildAllIngredientsCategoryParams(
  current: URLSearchParams,
  categoryId: string,
  defaultCategoryId: string,
): URLSearchParams {
  const next = cloneParams(current);
  if (categoryId === defaultCategoryId) {
    next.delete("ingredientsCategory");
  } else {
    next.set("ingredientsCategory", categoryId);
  }
  return next;
}

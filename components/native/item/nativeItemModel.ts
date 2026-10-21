import { addonGroupUsesQuantitySelection } from "@/lib/addonGroups";
import type { ResolvedIngredientTab } from "@/lib/itemDetails/ingredientResolution";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

export type Macros = { calories: number; protein: number; carbs: number; totalFat: number };
export type MacroKey = keyof Macros;
export const MACRO_KEYS: MacroKey[] = ["calories", "protein", "carbs", "totalFat"];
export const MACRO_LABELS: Record<MacroKey, string> = { calories: "Calories", protein: "Protein", carbs: "Carbs", totalFat: "Fat" };

export const toMacros = (n?: Partial<Nutrition>): Macros => ({
  calories: n?.calories ?? 0,
  protein: n?.protein ?? 0,
  carbs: n?.carbs ?? 0,
  totalFat: n?.totalFat ?? 0,
});
export const scaleMacros = (m: Macros, k: number): Macros => ({
  calories: m.calories * k, protein: m.protein * k, carbs: m.carbs * k, totalFat: m.totalFat * k,
});
export const subMacros = (a: Macros, b: Macros): Macros => ({
  calories: a.calories - b.calories, protein: a.protein - b.protein, carbs: a.carbs - b.carbs, totalFat: a.totalFat - b.totalFat,
});

const MINUS = "−";
export const formatMacro = (key: MacroKey, value: number) => {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return key === "calories" ? rounded.toLocaleString("en-US") : `${rounded}g`;
};
// "+820" / "−5g"; blank when the rounded value is 0.
export const formatDelta = (key: MacroKey, value: number) => {
  const rounded = Math.round(value);
  if (!rounded) return "";
  const body = Math.abs(rounded).toLocaleString("en-US") + (key === "calories" ? "" : "g");
  return `${rounded > 0 ? "+" : MINUS}${body}`;
};
export const formatPlainCalories = (value: number) => Math.round(value).toLocaleString("en-US");

// Calorie share of protein/carbs/fat (4/4/9 kcal per gram), as whole percents summing to 100.
export function calorieShares(m: Macros) {
  const p = Math.max(0, m.protein) * 4;
  const c = Math.max(0, m.carbs) * 4;
  const f = Math.max(0, m.totalFat) * 9;
  const total = p + c + f;
  if (total === 0) return { protein: 0, carbs: 0, totalFat: 0 };
  const protein = Math.round((p / total) * 100);
  const carbs = Math.round((c / total) * 100);
  return { protein, carbs, totalFat: Math.max(0, 100 - protein - carbs) };
}

export type CustomizeTarget =
  | { type: "ingredient"; id: string; idsInTab: string[] }
  | { type: "sauce"; addon: MenuItem }
  | { type: "addon"; ref: string; addon: MenuItem | null };
export type CustomizeRow = {
  key: string;
  name: string;
  image?: string;
  macros: Macros;
  plus?: boolean;
  control: { kind: "radio"; selected: boolean } | { kind: "stepper"; count: number; max: number };
  target: CustomizeTarget;
};
export type CustomizeGroup = { id: string; title: string; rows: CustomizeRow[]; changed: boolean };

export type CustomizeState = {
  tabs: ResolvedIngredientTab[];
  ingredientCounts: Record<string, number>;
  baselineCounts: Record<string, number>;
  item: MenuItem;
  addons?: ResolvedAddonGroups;
  selectedAddons: Partial<Record<string, MenuItem>>;
  sauceCounts: Record<string, number>;
  baselineAddonNames: Record<string, string | undefined>;
  baselineSauceCounts: Record<string, number>;
};

const DEFAULT_SAUCE_MAX = 5;

export function addonSectionTitle(ref: string, label: string) {
  return ref === "dressings" || /dressing/i.test(label) ? "Dressings" : label;
}

export function buildCustomizeGroups(s: CustomizeState): CustomizeGroup[] {
  const groups: CustomizeGroup[] = [];
  const seen = new Set<string>();

  s.tabs.forEach((tab) => {
    const idsInTab = tab.ingredients.map((i) => i.id);
    const rows: CustomizeRow[] = [];
    let changed = false;
    tab.ingredients.forEach((ingredient) => {
      if (ingredient.isReadOnly || seen.has(ingredient.id)) return;
      seen.add(ingredient.id);
      const count = s.ingredientCounts[ingredient.id] ?? ingredient.defaultCount;
      const baseline = s.baselineCounts[ingredient.id] ?? ingredient.defaultCount;
      if (count !== baseline) changed = true;
      const unit = toMacros(ingredient.nutrition);
      const image = ingredient.icon && ingredient.icon !== "none" ? ingredient.icon : undefined;
      if (tab.selectionMode === "single") {
        rows.push({ key: ingredient.id, name: ingredient.label, image, macros: unit, control: { kind: "radio", selected: count > 0 }, target: { type: "ingredient", id: ingredient.id, idsInTab } });
      } else {
        rows.push({ key: ingredient.id, name: ingredient.label, image, macros: scaleMacros(unit, count), control: { kind: "stepper", count, max: ingredient.maxQuantity ?? count }, target: { type: "ingredient", id: ingredient.id, idsInTab } });
      }
    });
    if (rows.length > 0) groups.push({ id: tab.id, title: tab.sectionTitle ?? tab.label, rows, changed });
  });

  (s.item.addonRefs ?? []).forEach((ref) => {
    const group = s.addons?.[ref];
    if (!group || group.items.length === 0) return;
    const title = addonSectionTitle(ref, group.label);
    if (addonGroupUsesQuantitySelection(ref)) {
      const max = group.maxPerItem ?? DEFAULT_SAUCE_MAX;
      const total = group.items.reduce((sum, addon) => sum + (s.sauceCounts[addon.name] ?? 0), 0);
      const changed = group.items.some((addon) => (s.sauceCounts[addon.name] ?? 0) !== (s.baselineSauceCounts[addon.name] ?? 0));
      const rows = group.items.map<CustomizeRow>((addon) => {
        const count = s.sauceCounts[addon.name] ?? 0;
        return {
          key: addon.id ?? addon.name,
          name: addon.name,
          image: addon.image && addon.image !== "none" ? addon.image : undefined,
          macros: scaleMacros(toMacros(addon.nutrition), Math.max(count, 1)),
          plus: true,
          // The group-wide cap is enforced by the existing increment handler; reflect it here.
          control: { kind: "stepper", count, max: total >= max ? count : max },
          target: { type: "sauce", addon },
        };
      });
      groups.push({ id: ref, title, rows, changed });
    } else {
      const selectedName = s.selectedAddons[ref]?.name;
      const active = selectedName && selectedName !== "None" ? selectedName : undefined;
      const baseline = s.baselineAddonNames[ref] && s.baselineAddonNames[ref] !== "None" ? s.baselineAddonNames[ref] : undefined;
      const none: CustomizeRow = { key: `${ref}:none`, name: "None", macros: toMacros(undefined), plus: true, control: { kind: "radio", selected: !active }, target: { type: "addon", ref, addon: null } };
      const rows = group.items.map<CustomizeRow>((addon) => ({
        key: addon.id ?? addon.name,
        name: addon.name,
        image: addon.image && addon.image !== "none" ? addon.image : undefined,
        macros: toMacros(addon.nutrition),
        plus: true,
        control: { kind: "radio", selected: active === addon.name },
        target: { type: "addon", ref, addon },
      }));
      groups.push({ id: ref, title, rows: [none, ...rows], changed: active !== baseline });
    }
  });
  return groups;
}

export const changeCount = (groups: CustomizeGroup[]) => groups.filter((g) => g.changed).length;
export const changeLabel = (n: number) => (n === 0 ? "Standard preparation" : n === 1 ? "1 change" : `${n} changes`);

export type MealRow = { key: string; name: string; image?: string; macros: Macros; prefix?: string };
export type MealAdjustments = { added: MealRow[]; removed: MealRow[]; sauces: MealRow[] };

// Item-level changes versus the default configuration, as Meal Details lists them.
export function buildMealAdjustments(s: CustomizeState): MealAdjustments {
  const added: MealRow[] = [];
  const removed: MealRow[] = [];
  const sauces: MealRow[] = [];
  const seen = new Set<string>();
  s.tabs.forEach((tab) => {
    tab.ingredients.forEach((ingredient) => {
      if (ingredient.isReadOnly || seen.has(ingredient.id)) return;
      seen.add(ingredient.id);
      const count = s.ingredientCounts[ingredient.id] ?? ingredient.defaultCount;
      const diff = count - ingredient.defaultCount;
      if (diff === 0) return;
      const image = ingredient.icon && ingredient.icon !== "none" ? ingredient.icon : undefined;
      const unit = toMacros(ingredient.nutrition);
      if (tab.selectionMode === "single") {
        if (count > 0) {
          const previous = tab.ingredients.find((i) => i.defaultCount > 0 && i.id !== ingredient.id);
          added.push({ key: ingredient.id, name: ingredient.label, image, macros: previous ? subMacros(unit, toMacros(previous.nutrition)) : unit });
        }
        return;
      }
      const row = { key: ingredient.id, name: ingredient.label, image, macros: scaleMacros(unit, diff) };
      if (diff > 0) added.push({ ...row, prefix: diff > 1 ? `${diff}× ` : undefined });
      else removed.push(row);
    });
  });
  (s.item.addonRefs ?? []).forEach((ref) => {
    const group = s.addons?.[ref];
    if (!group) return;
    if (addonGroupUsesQuantitySelection(ref)) {
      group.items.forEach((addon) => {
        const count = s.sauceCounts[addon.name] ?? 0;
        if (count > 0) sauces.push({ key: addon.id ?? addon.name, name: addon.name, image: addon.image && addon.image !== "none" ? addon.image : undefined, macros: scaleMacros(toMacros(addon.nutrition), count), prefix: count > 1 ? `${count}× ` : undefined });
      });
    } else {
      const addon = s.selectedAddons[ref];
      if (addon && addon.name !== "None") added.push({ key: addon.id ?? addon.name, name: addon.name, image: addon.image && addon.image !== "none" ? addon.image : undefined, macros: toMacros(addon.nutrition) });
    }
  });
  return { added, removed, sauces };
}

// Daily values (FDA, 2,000 kcal diet) used for the Nutrition Facts sheet.
export const DAILY_VALUES = { totalFat: 78, satFat: 20, cholesterol: 300, sodium: 2300, carbs: 275, fiber: 28, protein: 50 } as const;
export const percentDV = (value: number | undefined, daily: number) =>
  typeof value === "number" && Number.isFinite(value) ? `${Math.round((value / daily) * 100)}%` : "";

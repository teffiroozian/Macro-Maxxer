import { formatCalories, formatMacro } from "@/lib/menuItemCalculations";
import type { MenuItem } from "@/types/menu";

type CompactOption = { id: string; label: string; disabled?: boolean };

export default function IngredientCompactCard({
  item,
  selectedItemImage,
  ingredientSelectionState,
  isIngredientSelectionDisabled,
  ingredientSelectionControl,
  ingredientDisabledReason,
  ingredientPortionBadge,
  isIngredientUnavailable,
  ingredientUnavailableReason,
  activeCompactOptions,
  selectedCompactOptionId,
  calories,
  protein,
  carbs,
  totalFat,
  onSelectionChange,
  onCompactOptionSelect,
}: {
  item: MenuItem;
  selectedItemImage?: string;
  ingredientSelectionState: boolean;
  isIngredientSelectionDisabled: boolean;
  ingredientSelectionControl: "checkbox" | "radio";
  ingredientDisabledReason?: string;
  ingredientPortionBadge?: string;
  isIngredientUnavailable?: boolean;
  ingredientUnavailableReason?: string;
  activeCompactOptions?: CompactOption[];
  selectedCompactOptionId?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  totalFat?: number;
  onSelectionChange: (selected: boolean) => void;
  onCompactOptionSelect: (optionId: string) => void;
}) {
  return (
    <li
      className={`list-none overflow-hidden rounded-2xl bg-white transition ${
        ingredientSelectionState
          ? "border-2 border-lime-500 shadow-[0_4px_12px_rgba(132,204,22,0.25)]"
          : "border border-black/15 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      }`}
    >
      <div
        role={ingredientSelectionControl}
        aria-checked={ingredientSelectionState}
        aria-label={`${isIngredientSelectionDisabled ? ingredientDisabledReason ?? "Unavailable" : "Select"} ${item.name}`}
        tabIndex={isIngredientSelectionDisabled ? -1 : 0}
        className={`flex items-start gap-3 px-4 py-3 lg:items-center lg:gap-4 ${isIngredientSelectionDisabled ? "cursor-not-allowed opacity-95" : "cursor-pointer"}`}
        onClick={() => {
          if (isIngredientSelectionDisabled) return;
          const nextSelected =
            ingredientSelectionControl === "radio" ? true : !ingredientSelectionState;
          onSelectionChange(nextSelected);
        }}
        onKeyDown={(event) => {
          if (isIngredientSelectionDisabled) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const nextSelected =
            ingredientSelectionControl === "radio" ? true : !ingredientSelectionState;
          onSelectionChange(nextSelected);
        }}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center border text-sm font-bold transition ${
            ingredientSelectionState
              ? "border-lime-500 bg-lime-500 text-black"
              : "border-black/40 bg-white text-transparent"
          } ${ingredientSelectionControl === "radio" ? "rounded-full" : "rounded-md"}`}
          aria-hidden="true"
        >
          {ingredientSelectionControl === "radio" ? "●" : "✓"}
        </span>

        {selectedItemImage ? (
          <img className="h-24 w-24 shrink-0 rounded-xl bg-[#efefef] object-cover" src={selectedItemImage} alt={item.name} />
        ) : (
          <div className="h-24 w-24 shrink-0 rounded-xl bg-[#efefef]" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:gap-3">
            {ingredientPortionBadge ? (
              <span className="inline-flex shrink-0 rounded-full bg-lime-500 px-2 py-0.5 text-xs font-bold text-black">{ingredientPortionBadge}</span>
            ) : null}
            <div className="min-w-0 flex-1 truncate text-xl font-semibold text-black sm:text-2xl">{item.name}</div>
            {activeCompactOptions && activeCompactOptions.length > 1 && ingredientSelectionState ? (
              <div className="flex flex-wrap gap-2">
                {activeCompactOptions.map((variantOption) => (
                  <button
                    key={variantOption.id}
                    type="button"
                    disabled={Boolean(variantOption.disabled)}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!variantOption.disabled) onCompactOptionSelect(variantOption.id);
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedCompactOptionId === variantOption.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-black/20 bg-white text-slate-700 hover:border-black/35"
                    } ${variantOption.disabled ? "cursor-not-allowed opacity-55 hover:border-black/20" : ""}`}
                  >
                    {variantOption.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {isIngredientUnavailable && ingredientUnavailableReason ? (
            <div className="inline-flex w-fit rounded-full border border-black/20 bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-black/60">
              {ingredientUnavailableReason}
            </div>
          ) : null}

          <div className="flex w-full items-center gap-4 text-center lg:gap-8">
            {[[calories, "black", "cal"], [protein, "#c2410c", "protein"], [carbs, "#ca8a04", "carbs"], [totalFat, "#2563eb", "fat"]].map(([value, color, label]) => (
              <div key={String(label)} className="flex min-w-[44px] flex-col items-center gap-1 sm:min-w-[54px]">
                <div className="text-lg leading-none font-bold sm:text-xl" style={{ color: String(color) }}>
                  {label === "cal" ? formatCalories(value as number | undefined) : formatMacro(value as number | undefined)}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-black/80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

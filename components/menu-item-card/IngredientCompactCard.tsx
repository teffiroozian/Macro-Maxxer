import SurfaceCard from "@/components/ui/SurfaceCard";
import MacroStat from "@/components/nutrition/MacroStat";
import type { MenuItem } from "@/types/menu";
import Image from "next/image";

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
  const showControls =
      activeCompactOptions &&
      activeCompactOptions.length > 1 &&
      ingredientSelectionState;

  return (
      <SurfaceCard
          as="li"
          padding="none"
          shadow="none"
          className={`list-none overflow-hidden transition duration-150 ${
              ingredientSelectionState
                  ? "border border-accent! bg-accent-soft/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : isIngredientSelectionDisabled
                    ? "border border-black/8 bg-black/[0.015] opacity-70"
                    : "border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
          }`}
      >
          <div
              role={ingredientSelectionControl}
              aria-checked={ingredientSelectionState}
              aria-label={`${isIngredientSelectionDisabled ? (ingredientDisabledReason ?? ingredientUnavailableReason ?? "Unavailable") : "Select"} ${item.name}`}
              tabIndex={isIngredientSelectionDisabled ? -1 : 0}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2.5 outline-none transition-shadow duration-100 sm:px-4 md:flex-nowrap md:gap-x-4 ${
                  isIngredientSelectionDisabled ? "cursor-not-allowed" : "cursor-pointer"
              } focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2`}
              onClick={() => {
                  if (isIngredientSelectionDisabled) return;
                  const nextSelected =
                      ingredientSelectionControl === "radio"
                          ? true
                          : !ingredientSelectionState;
                  onSelectionChange(nextSelected);
              }}
              onKeyDown={(event) => {
                  if (isIngredientSelectionDisabled) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  const nextSelected =
                      ingredientSelectionControl === "radio"
                          ? true
                          : !ingredientSelectionState;
                  onSelectionChange(nextSelected);
              }}
          >
              <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                      ingredientSelectionState
                          ? "border-accent bg-accent"
                          : isIngredientSelectionDisabled
                            ? "border-black/15 bg-black/5"
                            : "border-black/30 bg-white"
                  } ${ingredientSelectionControl === "radio" ? "rounded-full" : "rounded-md"}`}
                  aria-hidden="true"
              >
                  {ingredientSelectionState && ingredientSelectionControl === "radio" ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                  ) : null}
                  {ingredientSelectionState && ingredientSelectionControl === "checkbox" ? (
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                          <path
                              d="M3.5 8.5L6.5 11.5L12.5 4.5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                          />
                      </svg>
                  ) : null}
              </span>

              {selectedItemImage ? (
                  <Image
                      src={selectedItemImage}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="h-14 w-14 shrink-0 rounded-xl bg-image-placeholder object-cover ring-1 ring-black/5 sm:h-16 sm:w-16"
                  />
              ) : (
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-image-placeholder ring-1 ring-black/5 sm:h-16 sm:w-16" />
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="min-w-0 truncate text-base font-semibold text-black sm:text-lg">
                          {item.name}
                      </span>
                      {ingredientPortionBadge ? (
                          <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/50">
                              {ingredientPortionBadge}
                          </span>
                      ) : null}
                  </div>

                  {showControls ? (
                      <div className="inline-flex w-fit items-center gap-0.5 rounded-full bg-black/5 p-0.5">
                          {activeCompactOptions!.map((variantOption) => (
                              <button
                                  key={variantOption.id}
                                  type="button"
                                  disabled={Boolean(variantOption.disabled)}
                                  onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (!variantOption.disabled)
                                          onCompactOptionSelect(
                                              variantOption.id,
                                          );
                                  }}
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                      selectedCompactOptionId ===
                                      variantOption.id
                                          ? "bg-white text-black shadow-sm"
                                          : "cursor-pointer text-black/50 hover:text-black/70"
                                  } ${variantOption.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                              >
                                  {variantOption.label}
                              </button>
                          ))}
                      </div>
                  ) : null}
              </div>

              <div className="flex w-full basis-full items-center justify-between gap-2 md:w-72 md:basis-auto md:border-l md:border-black/[0.06] md:pl-4">
                  <MacroStat
                      macroKey="calories"
                      value={calories ?? Number.NaN}
                      labelVariant="shortLabel"
                      size="ingredientCompact"
                  />
                  <MacroStat
                      macroKey="protein"
                      value={protein ?? Number.NaN}
                      size="ingredientCompact"
                  />
                  <MacroStat
                      macroKey="carbs"
                      value={carbs ?? Number.NaN}
                      size="ingredientCompact"
                  />
                  <MacroStat
                      macroKey="totalFat"
                      value={totalFat ?? Number.NaN}
                      size="ingredientCompact"
                  />
              </div>
          </div>
      </SurfaceCard>
  );
}

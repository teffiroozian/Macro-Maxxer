import { Circle, type LucideIcon } from "lucide-react";

type RankedAllFilterKey = "main-entrees" | "shareables" | "sides" | "drinks";

type CategoryOption = { id: string; label: string };

type Props = {
  effectiveViewMode: "menu" | "ingredients" | "ranking";
  rankedAllFilters: Record<RankedAllFilterKey, boolean>;
  toggleRankedAllFilter: (key: RankedAllFilterKey) => void;
  categoryOptions: CategoryOption[];
  resolvedActiveCategory: string;
  onCategorySelect: (categoryId: string) => void;
  categoryIcons: Record<string, LucideIcon>;
};

export default function RestaurantCategorySidebar({
  effectiveViewMode,
  rankedAllFilters,
  toggleRankedAllFilter,
  categoryOptions,
  resolvedActiveCategory,
  onCategorySelect,
  categoryIcons,
}: Props) {
  return (
    <aside className="sticky top-[160px] flex max-h-[calc(100vh-160px)] flex-col py-6">
      <h3 className="mb-8 shrink-0 text-2xl font-bold text-slate-900">
        {effectiveViewMode === "ranking" ? "Show" : effectiveViewMode === "ingredients" ? "Ingredients" : "Categories"}
      </h3>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {effectiveViewMode === "ranking" ? (
          <div className="grid gap-3">
            {[
              { key: "main-entrees" as const, label: "Main Entrees" },
              { key: "shareables" as const, label: "Shareables" },
              { key: "sides" as const, label: "Sides" },
              { key: "drinks" as const, label: "Drinks" },
            ].map((option) => {
              const isChecked = rankedAllFilters[option.key];
              return (
                <label
                  key={option.key}
                  className="inline-flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-1.5 text-base font-semibold text-slate-800 hover:bg-slate-200/70"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleRankedAllFilter(option.key)}
                    className="h-4 w-4 cursor-pointer rounded border border-black/30 accent-black"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <nav
            aria-label={effectiveViewMode === "ingredients" ? "Ingredient categories" : "Menu categories"}
            className="grid gap-4"
          >
            {categoryOptions.map((option) => {
              const isActive = option.id === resolvedActiveCategory;
              const Icon = categoryIcons[option.label.toLowerCase()] ?? Circle;

              return (
                <div key={option.id} className="relative pl-3">
                  {isActive ? (
                    <span
                      className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full shadow-[0px_0_8px_rgba(0,0,0,0.25)] bg-white"
                      aria-hidden="true"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onCategorySelect(option.id)}
                    className={`cursor-pointer inline-flex items-center gap-3 rounded-full px-4 py-2 text-left text-base font-semibold transition-colors duration-50 ease-in ${
                      isActive
                        ? "shadow-[0px_0_8px_rgba(0,0,0,0.25)] bg-white text-slate-800"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}

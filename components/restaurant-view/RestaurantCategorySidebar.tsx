"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, type LucideIcon, UtensilsCrossed, Soup, SquareStack, CupSoda, Check, Menu } from "lucide-react";

type RankedAllFilterKey = "main-entrees" | "breakfast" | "shareables" | "sides" | "drinks";

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
  const [mobileNavTop, setMobileNavTop] = useState(0);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const mobileCategoryMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileCategoryScrollRef = useRef<HTMLDivElement | null>(null);
  const [showLeftScrollFade, setShowLeftScrollFade] = useState(false);
  const [showRightScrollFade, setShowRightScrollFade] = useState(false);

  useEffect(() => {
    const syncMobileNavTop = () => {
      const stickyNav = document.querySelector('[data-sticky-nav="true"]');
      if (!(stickyNav instanceof HTMLElement)) {
        setMobileNavTop(0);
        return;
      }

      setMobileNavTop(Math.max(0, Math.ceil(stickyNav.getBoundingClientRect().bottom)));
    };

    syncMobileNavTop();
    window.addEventListener("resize", syncMobileNavTop);
    window.addEventListener("scroll", syncMobileNavTop, { passive: true });

    return () => {
      window.removeEventListener("resize", syncMobileNavTop);
      window.removeEventListener("scroll", syncMobileNavTop);
    };
  }, []);

  useEffect(() => {
    if (!isMobileCategoryMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!mobileCategoryMenuRef.current?.contains(target)) {
        setIsMobileCategoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isMobileCategoryMenuOpen]);

  useEffect(() => {
    const scrollElement = mobileCategoryScrollRef.current;
    if (!scrollElement) return;

    const syncScrollFadeVisibility = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
      setShowLeftScrollFade(scrollLeft > 1);
      setShowRightScrollFade(maxScrollLeft - scrollLeft > 1);
    };

    syncScrollFadeVisibility();
    scrollElement.addEventListener("scroll", syncScrollFadeVisibility, { passive: true });
    window.addEventListener("resize", syncScrollFadeVisibility);

    return () => {
      scrollElement.removeEventListener("scroll", syncScrollFadeVisibility);
      window.removeEventListener("resize", syncScrollFadeVisibility);
    };
  }, [effectiveViewMode, categoryOptions, rankedAllFilters]);

  const rankingOptions: Array<{ key: RankedAllFilterKey; label: string; iconKey: string }> = [
    { key: "main-entrees", label: "Main Entrees", iconKey: "entrees" },
    { key: "breakfast", label: "Breakfast", iconKey: "breakfast" },
    { key: "shareables", label: "Shareables", iconKey: "shareables" },
    { key: "sides", label: "Sides", iconKey: "sides" },
    { key: "drinks", label: "Drinks", iconKey: "drinks" },
  ];
  const rankingFallbackIcons: Record<RankedAllFilterKey, LucideIcon> = {
    "main-entrees": UtensilsCrossed,
    breakfast: UtensilsCrossed,
    shareables: Soup,
    sides: SquareStack,
    drinks: CupSoda,
  };
  const categoryNavLabel =
    effectiveViewMode === "ranking"
      ? "Ranking categories"
      : effectiveViewMode === "ingredients"
        ? "Ingredient categories"
        : "Menu categories";

  return (
    <>
      <div className="fixed left-0 right-0 z-[90] lg:hidden" style={{ top: mobileNavTop + 4 }} data-mobile-category-nav="true">
        <div className="relative mx-auto w-[calc(100%-0.5rem)] max-w-6xl overflow-visible rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur sm:w-[calc(100%-1rem)]">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-2 py-1 sm:px-4 sm:py-1">
            <div ref={mobileCategoryMenuRef} className="relative shrink-0">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMobileCategoryMenuOpen}
                onClick={() => setIsMobileCategoryMenuOpen((previous) => !previous)}
                className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-black/85 transition-colors duration-150 hover:bg-slate-900/5"
                aria-label="Open categories menu"
              >
                <Menu className="h-4 w-4" strokeWidth={2.2} />
              </button>

              {isMobileCategoryMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(220px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
                >
                  <div className="grid gap-1">
                    {effectiveViewMode === "ranking"
                      ? rankingOptions.map((option) => {
                          const isChecked = rankedAllFilters[option.key];
                          const Icon = categoryIcons[option.iconKey] ?? rankingFallbackIcons[option.key];

                          return (
                            <button
                              key={option.key}
                              type="button"
                              aria-pressed={isChecked}
                              onClick={() => {
                                toggleRankedAllFilter(option.key);
                                setIsMobileCategoryMenuOpen(false);
                              }}
                              className={`cursor-pointer inline-flex items-center gap-2 rounded-[10px] border-none px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 ${
                                isChecked ? "bg-black/10" : "hover:bg-slate-900/5"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              {isChecked ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> : null}
                            </button>
                          );
                        })
                      : categoryOptions.map((option) => {
                          const isActive = option.id === resolvedActiveCategory;
                          const Icon = categoryIcons[option.label.toLowerCase()] ?? Circle;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                onCategorySelect(option.id);
                                setIsMobileCategoryMenuOpen(false);
                              }}
                              className={`cursor-pointer inline-flex items-center gap-2 rounded-[10px] border-none px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 ${
                                isActive ? "bg-black/10" : "hover:bg-slate-900/5"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                            </button>
                          );
                        })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="h-8 w-px shrink-0 bg-slate-300/80" aria-hidden="true" />

            <div className="relative min-w-0 flex-1">
              <div ref={mobileCategoryScrollRef} className="flex min-w-0 items-center gap-2 overflow-x-auto p-1">
                {effectiveViewMode === "ranking" ? (
                  <div className="flex min-w-0 items-center gap-2" role="group" aria-label={categoryNavLabel}>
                    {rankingOptions.map((option) => {
                      const isChecked = rankedAllFilters[option.key];
                      const Icon = categoryIcons[option.iconKey] ?? rankingFallbackIcons[option.key];

                      return (
                        <button
                          key={option.key}
                          type="button"
                          aria-pressed={isChecked}
                          onClick={() => toggleRankedAllFilter(option.key)}
                          className={`cursor-pointer inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-[14px] py-[8px] text-sm font-semibold transition-colors duration-100 ${
                            isChecked
                              ? "border-black/20 bg-white text-slate-800 shadow-[0px_0_8px_rgba(0,0,0,0.2)]"
                              : "border-black/20 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.4} />
                          <span>{option.label}</span>
                          {isChecked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <nav aria-label={categoryNavLabel} className="flex min-w-0 items-center gap-2">
                    {categoryOptions.map((option) => {
                      const isActive = option.id === resolvedActiveCategory;
                      const Icon = categoryIcons[option.label.toLowerCase()] ?? Circle;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onCategorySelect(option.id)}
                          className={`cursor-pointer inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-[14px] py-[8px] text-sm font-semibold transition-colors duration-100 ${
                            isActive
                              ? "border-black/20 bg-white text-slate-800 shadow-[0px_0_8px_rgba(0,0,0,0.2)]"
                              : "border-black/20 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 ${
                  showLeftScrollFade ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
              />
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 ${
                  showRightScrollFade ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="h-[76px] lg:hidden" aria-hidden="true" />

      <aside className="sticky top-[160px] hidden max-h-[calc(100vh-160px)] flex-col py-6 lg:flex">
        <h3 className="mb-8 shrink-0 text-2xl font-bold text-slate-900">
          {effectiveViewMode === "ranking" ? "Show" : effectiveViewMode === "ingredients" ? "Ingredients" : "Categories"}
        </h3>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {effectiveViewMode === "ranking" ? (
            <div className="grid gap-4" role="group" aria-label="Ranking categories">
              {rankingOptions.map((option) => {
                const isChecked = rankedAllFilters[option.key];
                const Icon = categoryIcons[option.iconKey] ?? rankingFallbackIcons[option.key];

                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleRankedAllFilter(option.key)}
                    className={`inline-flex w-full cursor-pointer items-center gap-3 rounded-full px-4 py-2 text-left text-base font-semibold transition-colors duration-100 ${
                      isChecked
                        ? "bg-white text-slate-800 shadow-[0px_0_8px_rgba(0,0,0,0.25)]"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isChecked ? "bg-slate-100 text-slate-900" : "bg-slate-200/80 text-slate-700"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    </span>
                    <span>{option.label}</span>
                    <span
                      className={`ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isChecked
                          ? "border-black bg-black text-white"
                          : "border-slate-400 bg-transparent text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <nav aria-label={categoryNavLabel} className="grid gap-4">
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
    </>
  );
}

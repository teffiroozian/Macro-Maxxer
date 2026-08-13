"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Circle,
  type LucideIcon,
  UtensilsCrossed,
  Soup,
  SquareStack,
  CupSoda,
  Check,
  Minus,
  ChevronDown,
  PanelTopOpen,
} from "lucide-react";
import type { RankedAllFilterKey, RankedParentSelectionState } from "@/lib/menuSections/filtering";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { getCategoryLabel } from "@/lib/menuSections/sorting";
import { FilterChips } from "@/components/ControlsRow";
import { useFilterChipActions } from "@/components/useFilterChipActions";
import { useStickyNavClearance } from "@/components/restaurant-view/useStickyNavClearance";
import SectionEyebrow from "@/components/ui/SectionEyebrow";

type CategoryOption = {
  id: string;
  label: string;
  count?: number;
  // How many of this category's items the user currently has selected —
  // BYO-ingredient-builder-only (undefined everywhere else). When present
  // and > 0, the sidebar shows "selected/total" instead of just the total;
  // it is never a max-selection limit, just the available-item count.
  selectedCount?: number;
};
type RankingOption = { key: RankedAllFilterKey; label: string; iconKey: string };

type Props = {
  effectiveViewMode: "menu" | "ingredients" | "ranking";
  rankedChildOptions: Record<RankedAllFilterKey, string[]>;
  rankedChildSelections: Record<RankedAllFilterKey, Set<string>>;
  rankedParentStates: Record<RankedAllFilterKey, RankedParentSelectionState>;
  toggleRankedAllFilter: (key: RankedAllFilterKey) => void;
  toggleRankedChildFilter: (key: RankedAllFilterKey, childCategory: string) => void;
  categoryOptions: CategoryOption[];
  resolvedActiveCategory: string;
  onCategorySelect: (categoryId: string) => void;
  categoryIcons: Record<string, LucideIcon>;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  // Opens the mobile controls drawer scrolled to its Filters section — the
  // desktop equivalent (reopening the filter modal) lives inside ControlsRow
  // itself, since that's where the modal's own open state lives. Optional so
  // callers that never wire it up (there are none today) just don't render
  // the edit affordance rather than throwing.
  onEditFilters?: () => void;
};

type SharedCategoryNavProps = Pick<
  Props,
  | "effectiveViewMode"
  | "rankedChildOptions"
  | "rankedChildSelections"
  | "rankedParentStates"
  | "toggleRankedAllFilter"
  | "toggleRankedChildFilter"
  | "categoryOptions"
  | "resolvedActiveCategory"
  | "onCategorySelect"
  | "categoryIcons"
  | "filters"
  | "onFiltersChange"
  | "onEditFilters"
> & {
  rankingOptions: RankingOption[];
  rankingFallbackIcons: Record<RankedAllFilterKey, LucideIcon>;
  categoryNavLabel: string;
};

// "selected/total" once at least one item in the category is selected,
// otherwise just the total available count — the denominator is always the
// number of available items, never a max-selection cap.
function formatCategoryCount(option: CategoryOption) {
  if (typeof option.count !== "number") return null;
  if (option.selectedCount && option.selectedCount > 0) {
    return `${option.selectedCount}/${option.count}`;
  }
  return `${option.count}`;
}

function resolveCategoryIcon(categoryIcons: Record<string, LucideIcon>, label: string) {
  const key = label.trim().toLowerCase();
  const candidates = [
    key,
    key.endsWith("s") ? key.slice(0, -1) : `${key}s`,
    key.replace(/ies$/, "y"),
    key.replace(/y$/, "ies"),
  ];

  return candidates.map((candidate) => categoryIcons[candidate]).find(Boolean) ?? Circle;
}

type CategoryNavItemProps = {
  option: CategoryOption;
  isActive: boolean;
  Icon: LucideIcon;
  onSelect: () => void;
  variant: "mobile-menu" | "mobile-pill" | "desktop";
};

function CategoryNavItem({ option, isActive, Icon, onSelect, variant }: CategoryNavItemProps) {
  const formattedCount = formatCategoryCount(option);

  if (variant === "desktop") {
    // Sidebar-only shorthand — the page section heading for this category
    // keeps using option.label ("Included Ingredients") unchanged.
    const desktopLabel = option.label === "Included Ingredients" ? "Included" : option.label;

    return (
      <div className="relative w-full max-w-full pl-3">
        {isActive ? (
          <span
            className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full shadow-[0px_0_8px_rgba(0,0,0,0.25)] bg-white"
            aria-hidden="true"
          />
        ) : null}

        <button
          type="button"
          onClick={onSelect}
          className={`cursor-pointer flex h-11 w-full max-w-full items-center gap-3 rounded-full px-4 text-left text-base font-semibold transition-colors duration-50 ease-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
            isActive ? "shadow-[0px_0_8px_rgba(0,0,0,0.25)] bg-white text-slate-800" : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          <span className="min-w-0 max-w-full flex-1 truncate">{desktopLabel}</span>
          {formattedCount ? (
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                isActive ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {formattedCount}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  if (variant === "mobile-menu") {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`cursor-pointer flex h-10 items-center gap-2 rounded-[10px] border-none px-2.5 text-left font-semibold text-black/88 transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
          isActive ? "bg-black/10" : "hover:bg-slate-900/5"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {formattedCount ? (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-black/40">{formattedCount}</span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
        isActive
          ? "border-transparent bg-accent-strong text-white shadow-[0px_0_8px_rgba(0,0,0,0.2)]"
          : "border-black/20 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
      <span>{option.label}</span>
      {formattedCount ? (
        <span className={`shrink-0 text-xs font-semibold tabular-nums ${isActive ? "text-white/75" : "text-slate-400"}`}>
          {formattedCount}
        </span>
      ) : null}
    </button>
  );
}

// Shared parent/child Rankings category tree — used by both the desktop
// sidebar and the mobile "categories" dropdown so the two responsive
// surfaces always render the exact same hierarchy and selection state
// (lifted entirely from useRestaurantMenuControls; this component only
// renders it). A parent with more than one distinct child category gets a
// permanently-visible chevron beside its label that expands/collapses its
// children — parents with zero or one child (nothing meaningful to narrow
// down) stay a plain toggle row, same as before this feature existed.
//
// Interaction model: the row itself (icon, label, background, indicator) is
// the selection target — clicking or activating it selects/deselects the
// parent and all its children. The chevron is a separate nested `<button>`
// with its own `stopPropagation()` so it only ever expands/collapses and
// never changes selection. A real `<button>` can't contain another
// `<button>`, so an expandable row's outer element is a `role="checkbox"`
// `<div>` (keyboard-operable via a manual Enter/Space handler) instead of a
// native button — a non-expandable row has nothing nested inside it, so it
// stays a plain native `<button>`.
//
// `isActive` (fully OR partially selected) is the single source of truth
// for every color on the row — background, icon, label, chevron. The exact
// tri-state only decides which glyph (check vs. minus) appears, and that
// glyph is only ever rendered while active, never shown-then-hidden with
// opacity — so a row can't visually read as "checked" without also being
// green.
function RankingCategoryTree({
  rankingOptions,
  rankedChildOptions,
  rankedChildSelections,
  rankedParentStates,
  toggleRankedAllFilter,
  toggleRankedChildFilter,
  categoryIcons,
  rankingFallbackIcons,
}: Pick<
  SharedCategoryNavProps,
  | "rankingOptions"
  | "rankedChildOptions"
  | "rankedChildSelections"
  | "rankedParentStates"
  | "toggleRankedAllFilter"
  | "toggleRankedChildFilter"
  | "categoryIcons"
  | "rankingFallbackIcons"
>) {
  const [expandedParents, setExpandedParents] = useState<Set<RankedAllFilterKey>>(() => new Set());

  return (
    <div className="grid gap-4" role="group" aria-label="Ranking categories">
      {rankingOptions.map((option) => {
        const children = rankedChildOptions[option.key] ?? [];
        const hasChildren = children.length > 1;
        const state = rankedParentStates[option.key] ?? "none";
        const isFull = state === "all";
        const isPartial = state === "some";
        const isActive = isFull || isPartial;
        const isExpanded = expandedParents.has(option.key);
        const Icon = categoryIcons[option.iconKey] ?? rankingFallbackIcons[option.key];
        const childListId = `ranking-children-${option.key}`;

        const toggleExpanded = () =>
          setExpandedParents((previous) => {
            const next = new Set(previous);
            if (next.has(option.key)) {
              next.delete(option.key);
            } else {
              next.add(option.key);
            }
            return next;
          });

        const rowClassName = `flex w-full cursor-pointer items-center gap-3 rounded-full px-4 py-2 text-left text-base font-semibold transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          isActive
            ? "bg-accent-strong text-white hover:brightness-95 active:brightness-90 focus-visible:outline-white"
            : "text-slate-700 hover:bg-slate-100 focus-visible:outline-accent-strong"
        }`;

        const indicator = isActive ? (
          <span aria-hidden="true" className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-white">
            {isPartial ? <Minus className="h-4 w-4" strokeWidth={3} /> : <Check className="h-4 w-4" strokeWidth={3} />}
          </span>
        ) : null;

        return (
          <div key={option.key}>
            {hasChildren ? (
              <div
                role="checkbox"
                aria-checked={isFull ? "true" : isPartial ? "mixed" : "false"}
                aria-label={option.label}
                tabIndex={0}
                onClick={() => toggleRankedAllFilter(option.key)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleRankedAllFilter(option.key);
                  }
                }}
                className={rowClassName}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} strokeWidth={2.5} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="min-w-0 truncate">{option.label}</span>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={childListId}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${option.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleExpanded();
                    }}
                    className={`inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isActive
                        ? "text-white/80 hover:bg-white/15 focus-visible:outline-white"
                        : "text-slate-400 hover:bg-slate-200/70 focus-visible:outline-accent-strong"
                    }`}
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      strokeWidth={2.5}
                    />
                  </button>
                </span>
                {indicator}
              </div>
            ) : (
              <button
                type="button"
                role="checkbox"
                aria-checked={isFull ? "true" : isPartial ? "mixed" : "false"}
                onClick={() => toggleRankedAllFilter(option.key)}
                className={rowClassName}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} strokeWidth={2.5} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {indicator}
              </button>
            )}

            {hasChildren ? (
              // `grid-rows-[0fr]` → `[1fr]` animates height without ever
              // measuring it in JS, so expand/collapse can't cause a layout
              // jump. Children stay mounted while collapsed (for the
              // transition to have something to animate from/to) but are
              // pulled out of the tab order and hidden from AT so a
              // collapsed group is never silently keyboard-focusable.
              <div
                id={childListId}
                className={`grid transition-all duration-200 ease-out ${
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
                aria-hidden={!isExpanded}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="ml-6 mt-0.5 grid gap-0.5 py-0.5">
                    {children.map((childCategory) => {
                      const isChildSelected = rankedChildSelections[option.key]?.has(childCategory) ?? false;
                      const ChildIcon = resolveCategoryIcon(categoryIcons, childCategory);

                      return (
                        <button
                          key={childCategory}
                          type="button"
                          role="checkbox"
                          aria-checked={isChildSelected}
                          tabIndex={isExpanded ? 0 : -1}
                          onClick={() => toggleRankedChildFilter(option.key, childCategory)}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-2 text-left text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
                            isChildSelected ? "bg-accent-soft text-accent-strong" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <ChildIcon
                            className={`h-3.5 w-3.5 shrink-0 ${isChildSelected ? "text-accent-strong" : "text-slate-400"}`}
                            strokeWidth={2.2}
                          />
                          <span className="min-w-0 flex-1 truncate">{getCategoryLabel(childCategory)}</span>
                          {isChildSelected ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-accent-strong" strokeWidth={3} />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MobileCategoryNav({
  effectiveViewMode,
  rankedChildOptions,
  rankedChildSelections,
  rankedParentStates,
  toggleRankedAllFilter,
  toggleRankedChildFilter,
  categoryOptions,
  resolvedActiveCategory,
  onCategorySelect,
  categoryIcons,
  filters,
  onFiltersChange,
  onEditFilters,
  rankingOptions,
  rankingFallbackIcons,
  categoryNavLabel,
}: SharedCategoryNavProps) {
  const [mobileNavTop, setMobileNavTop] = useState(0);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const mobileCategoryMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileCategoryScrollRef = useRef<HTMLDivElement | null>(null);
  const [showLeftScrollFade, setShowLeftScrollFade] = useState(false);
  const [showRightScrollFade, setShowRightScrollFade] = useState(false);
  const { hasActiveFilters, clearProteinFilter, clearCaloriesFilter, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

  useEffect(() => {
    const syncMobileNavTop = () => {
      // Desktop and mobile now render as two separate `data-sticky-nav`
      // elements, only one of which is actually visible at a given
      // viewport width — the hidden one collapses to an all-zero rect, so
      // Math.max across every match always picks the real, visible one.
      const stickyNavs = document.querySelectorAll('[data-sticky-nav="true"]');
      const bottom = Array.from(stickyNavs).reduce(
        (max, nav) => (nav instanceof HTMLElement ? Math.max(max, nav.getBoundingClientRect().bottom) : max),
        0,
      );

      setMobileNavTop(Math.ceil(bottom));
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileCategoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
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
  }, [effectiveViewMode, categoryOptions, rankedParentStates]);

  // No trailing spacer here: this strip is `position: fixed`, so it needs
  // whatever renders right after it in flow to reserve matching space —
  // that's now RestaurantIdentityHeader (always rendered above this
  // component), which measures this exact `data-mobile-category-nav`
  // element and clears it dynamically. Adding a second static spacer here
  // on top of that would double-reserve the same space.
  return (
    <>
      <div className="fixed left-0 right-0 z-[90] lg:hidden" style={{ top: mobileNavTop + 4 }} data-mobile-category-nav="true">
        <div className="relative mx-auto w-[calc(100%-0.5rem)] max-w-6xl overflow-visible rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_1px_4px_rgba(15,23,42,0.08)] backdrop-blur sm:w-[calc(100%-1rem)]">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-2 py-0.5 sm:px-4">
            <MobileCategoryMenu
              effectiveViewMode={effectiveViewMode}
              rankedChildOptions={rankedChildOptions}
              rankedChildSelections={rankedChildSelections}
              rankedParentStates={rankedParentStates}
              toggleRankedAllFilter={toggleRankedAllFilter}
              toggleRankedChildFilter={toggleRankedChildFilter}
              categoryOptions={categoryOptions}
              resolvedActiveCategory={resolvedActiveCategory}
              onCategorySelect={onCategorySelect}
              categoryIcons={categoryIcons}
              rankingOptions={rankingOptions}
              rankingFallbackIcons={rankingFallbackIcons}
              menuRef={mobileCategoryMenuRef}
              isOpen={isMobileCategoryMenuOpen}
              setIsOpen={setIsMobileCategoryMenuOpen}
            />

            <div className="h-7 w-px shrink-0 bg-slate-300/80" aria-hidden="true" />

            <div className="relative min-w-0 flex-1">
              <div ref={mobileCategoryScrollRef} className="flex min-w-0 items-center gap-2 overflow-x-auto p-1">
                {effectiveViewMode === "ranking" ? (
                  <div className="flex min-w-0 items-center gap-2" role="group" aria-label={categoryNavLabel}>
                    {rankingOptions.map((option) => {
                      const state = rankedParentStates[option.key] ?? "none";
                      const isFull = state === "all";
                      const isPartial = state === "some";
                      const Icon = categoryIcons[option.iconKey] ?? rankingFallbackIcons[option.key];

                      return (
                        <button
                          key={option.key}
                          type="button"
                          role="checkbox"
                          aria-checked={isFull ? "true" : isPartial ? "mixed" : "false"}
                          onClick={() => toggleRankedAllFilter(option.key)}
                          className={`cursor-pointer inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-100 ${
                            isFull || isPartial
                              ? "border-transparent bg-accent-strong text-white shadow-[0px_0_8px_rgba(0,0,0,0.15)]"
                              : "border-black/20 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.4} />
                          <span>{option.label}</span>
                          {isFull ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                          {isPartial ? <Minus className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <nav aria-label={categoryNavLabel} className="flex min-w-0 items-center gap-2">
                    {categoryOptions.map((option) => {
                      const isActive = option.id === resolvedActiveCategory;
                      const Icon = resolveCategoryIcon(categoryIcons, option.label);

                      return (
                        <CategoryNavItem
                          key={option.id}
                          option={option}
                          isActive={isActive}
                          Icon={Icon}
                          onSelect={() => onCategorySelect(option.id)}
                          variant="mobile-pill"
                        />
                      );
                    })}
                  </nav>
                )}
              </div>
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 ${
                  showLeftScrollFade ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
              />
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 ${
                  showRightScrollFade ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
              />
            </div>
          </div>

          {hasActiveFilters ? (
            <>
              {/* Divider lives in its own px-2/sm:px-4-padded wrapper (matching
                  the category row's own content inset above) rather than
                  carrying the border directly on the padded chips row below —
                  a border on that row would sit at its border-box edge, past
                  the padding, and read as wider than the actual content. */}
              <div className="mx-auto w-full max-w-5xl px-2 sm:px-4">
                <div className="border-t border-slate-200/70" aria-hidden="true" />
              </div>
              <div className="mx-auto w-full max-w-5xl px-2 py-1 text-sm sm:px-4">
                <FilterChips
                  filters={filters}
                  onClearProtein={clearProteinFilter}
                  onClearCalories={clearCaloriesFilter}
                  onClearAll={resetFilters}
                  onEditFilters={onEditFilters}
                  withMargin={false}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

type MobileCategoryMenuProps = Omit<SharedCategoryNavProps, "categoryNavLabel" | "filters" | "onFiltersChange"> & {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean | ((previous: boolean) => boolean)) => void;
};

function MobileCategoryMenu({
  effectiveViewMode,
  rankedChildOptions,
  rankedChildSelections,
  rankedParentStates,
  toggleRankedAllFilter,
  toggleRankedChildFilter,
  categoryOptions,
  resolvedActiveCategory,
  onCategorySelect,
  categoryIcons,
  rankingOptions,
  rankingFallbackIcons,
  menuRef,
  isOpen,
  setIsOpen,
}: MobileCategoryMenuProps) {
  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-black/85 transition-colors duration-150 hover:bg-slate-900/5"
        aria-label="Open categories menu"
      >
        <PanelTopOpen className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(240px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
        >
          {effectiveViewMode === "ranking" ? (
            <RankingCategoryTree
              rankingOptions={rankingOptions}
              rankedChildOptions={rankedChildOptions}
              rankedChildSelections={rankedChildSelections}
              rankedParentStates={rankedParentStates}
              toggleRankedAllFilter={toggleRankedAllFilter}
              toggleRankedChildFilter={toggleRankedChildFilter}
              categoryIcons={categoryIcons}
              rankingFallbackIcons={rankingFallbackIcons}
            />
          ) : (
            <div className="grid gap-1">
              {categoryOptions.map((option) => {
                const isActive = option.id === resolvedActiveCategory;
                const Icon = resolveCategoryIcon(categoryIcons, option.label);

                return (
                  <CategoryNavItem
                    key={option.id}
                    option={option}
                    isActive={isActive}
                    Icon={Icon}
                    onSelect={() => {
                      onCategorySelect(option.id);
                      setIsOpen(false);
                    }}
                    variant="mobile-menu"
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DesktopCategorySidebar({
  effectiveViewMode,
  rankedChildOptions,
  rankedChildSelections,
  rankedParentStates,
  toggleRankedAllFilter,
  toggleRankedChildFilter,
  categoryOptions,
  resolvedActiveCategory,
  onCategorySelect,
  categoryIcons,
  rankingOptions,
  rankingFallbackIcons,
  categoryNavLabel,
}: SharedCategoryNavProps) {
  // Falls back to the stack's usual resting height (matches the fixed nav +
  // one-row secondary controls) until the real measurement lands just after
  // mount, then tracks it live — so the sidebar never sticks underneath a
  // taller stack once active-filter chips add a second row to it. The extra
  // gap on top of that measured clearance is deliberate breathing room so
  // the sidebar's sticky resting position never reads as crowded against
  // the nav bars above it — it only affects where the sidebar settles once
  // scrolled, not its initial (in-flow) position alongside the main content
  // column.
  const measuredClearance = useStickyNavClearance();
  const STICKY_SIDEBAR_TOP_GAP = 24;
  const stickyTop = (measuredClearance ?? 160) + STICKY_SIDEBAR_TOP_GAP;

  return (
    <aside
      className="sticky hidden w-60 max-w-60 shrink-0 flex-col py-4 lg:flex"
      style={{ top: stickyTop, maxHeight: `calc(100vh - ${stickyTop}px)` }}
    >
      <SectionEyebrow as="h3" className="mb-3 shrink-0 text-xs">
        {effectiveViewMode === "ranking" ? "Categories" : effectiveViewMode === "ingredients" ? "Ingredients" : "Categories"}
      </SectionEyebrow>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {effectiveViewMode === "ranking" ? (
          <RankingCategoryTree
            rankingOptions={rankingOptions}
            rankedChildOptions={rankedChildOptions}
            rankedChildSelections={rankedChildSelections}
            rankedParentStates={rankedParentStates}
            toggleRankedAllFilter={toggleRankedAllFilter}
            toggleRankedChildFilter={toggleRankedChildFilter}
            categoryIcons={categoryIcons}
            rankingFallbackIcons={rankingFallbackIcons}
          />
        ) : (
          <nav aria-label={categoryNavLabel} className="grid gap-1">
            {categoryOptions.map((option) => {
              const isActive = option.id === resolvedActiveCategory;
              const Icon = resolveCategoryIcon(categoryIcons, option.label);

              return (
                <CategoryNavItem
                  key={option.id}
                  option={option}
                  isActive={isActive}
                  Icon={Icon}
                  onSelect={() => onCategorySelect(option.id)}
                  variant="desktop"
                />
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}

export default function RestaurantCategorySidebar(props: Props) {
  const rankingOptions: RankingOption[] = [
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
    props.effectiveViewMode === "ranking" ? "Ranking categories" : props.effectiveViewMode === "ingredients" ? "Ingredient categories" : "Menu categories";
  const sharedProps = {
    ...props,
    rankingOptions,
    rankingFallbackIcons,
    categoryNavLabel,
  };

  return (
    <>
      <MobileCategoryNav {...sharedProps} />
      <DesktopCategorySidebar {...sharedProps} />
    </>
  );
}

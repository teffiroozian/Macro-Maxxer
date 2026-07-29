"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Flame, Leaf, Plus, Scale, type LucideIcon } from "lucide-react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import FilterChip from "@/components/ui/FilterChip";
import MacroStat from "@/components/nutrition/MacroStat";
import MacroSplitBar from "@/components/nutrition/MacroSplitBar";
import CartItemPreviewRow from "@/components/cart/CartItemPreviewRow";
import { addNutrition, getProteinPer100Calories, normalizeNutrition } from "@/lib/nutrition";
import type { Nutrition } from "@/types/nutrition";

export type WalkthroughMenuItem = {
  id: string;
  name: string;
  image: string;
  category: string;
  nutrition: Nutrition;
};

export type WalkthroughAddOn = {
  id: string;
  name: string;
  nutrition: Nutrition;
};

export type WalkthroughReviewItem = WalkthroughMenuItem & { quantity: number };

type ProductWalkthroughProps = {
  restaurantName: string;
  findItems: WalkthroughMenuItem[];
  buildItem: WalkthroughMenuItem;
  addOns: WalkthroughAddOn[];
  reviewItems: WalkthroughReviewItem[];
  // Real internal routes for each step's CTA — resolved by the page (which
  // already owns restaurant/item id lookups) rather than reconstructed here.
  findHref: string;
  customizeHref: string;
  reviewHref: string;
};

type StepKey = "find" | "customize" | "review";

type StepMeta = {
  key: StepKey;
  tabLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
};

const STEPS: StepMeta[] = [
  {
    key: "find",
    tabLabel: "Find & Compare",
    title: "Find the Best Fit",
    description: "Browse the menu and compare items by protein, calories, and macro efficiency.",
    ctaLabel: "Browse a Menu Now",
  },
  {
    key: "customize",
    tabLabel: "Customize & Build",
    title: "Make It Yours",
    description: "Adjust ingredients, portions, and combos while your macros update in real time.",
    ctaLabel: "Try Building a Meal",
  },
  {
    key: "review",
    tabLabel: "Review Your Order",
    title: "See the Full Order",
    description: "Review every item, customization, and total before checking out.",
    ctaLabel: "View Your Cart",
  },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const TAB_ACTIVE_CLASS = "bg-accent-soft text-accent-strong";
const TAB_INACTIVE_CLASS = "text-neutral-500 hover:bg-black/5 hover:text-neutral-800";

// Interactive three-tab showcase for the Product Walkthrough (Slice 3). One
// step is active at a time, driven entirely by user action (no autoplay) —
// mirrors the tab-driven Featured Restaurants carousel's "one active state,
// several synchronized controls" pattern from Slice 2. Each panel is a
// simplified, homepage-safe preview built from real restaurant/menu data
// rather than a screenshot or invented UI.
export default function ProductWalkthrough({
  restaurantName,
  findItems,
  buildItem,
  addOns,
  reviewItems,
  findHref,
  customizeHref,
  reviewHref,
}: ProductWalkthroughProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>(
    addOns.length > 0 ? [addOns[0].id] : []
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeStep = STEPS[activeIndex];

  const focusAndActivate = (index: number) => {
    const nextIndex = (index + STEPS.length) % STEPS.length;
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAndActivate(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAndActivate(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAndActivate(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAndActivate(STEPS.length - 1);
    }
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((previous) =>
      previous.includes(id) ? previous.filter((addOnId) => addOnId !== id) : [...previous, id]
    );
  };

  const selectedAddOns = addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const buildTotals = selectedAddOns.reduce(
    (totals, addOn) => addNutrition(totals, addOn.nutrition),
    normalizeNutrition(buildItem.nutrition)
  );

  const reviewTotals = reviewItems.reduce(
    (totals, item) => addNutrition(totals, item.nutrition, item.quantity),
    normalizeNutrition()
  );

  const ctaHrefByStep: Record<StepKey, string> = {
    find: findHref,
    customize: customizeHref,
    review: reviewHref,
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Product walkthrough steps"
        className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-sm"
      >
        {STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={step.key}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              id={`walkthrough-tab-${step.key}`}
              aria-selected={isActive}
              aria-controls={`walkthrough-panel-${step.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={handleTabKeyDown}
              className={`inline-flex cursor-pointer items-center whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:px-4 ${
                isActive ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS
              }`}
            >
              <span
                aria-hidden="true"
                className={`mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive ? "bg-accent text-white" : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {index + 1}
              </span>
              {step.tabLabel}
            </button>
          );
        })}
      </div>

      {/* `key` forces a remount on step change so `.walkthrough-panel-enter`
          (globals.css) replays its fade/nudge — a restrained, CSS-only
          transition that's automatically skipped under
          prefers-reduced-motion via that class's own media query. */}
      <div key={activeStep.key} className="walkthrough-panel-enter mx-auto mt-6 max-w-2xl text-center">
        <h3 className="font-heading text-balance text-xl font-bold text-neutral-900 sm:text-2xl">
          {activeStep.title}
        </h3>
        <p className="text-pretty mt-2 text-sm text-neutral-600 sm:text-base">{activeStep.description}</p>
      </div>

      <div className="mx-auto mt-8 w-full max-w-4xl">
        <SurfaceCard as="article" radius="large" shadow="md" padding="none" className="overflow-hidden bg-white">
          {/* Light "device chrome" — same treatment as ProductPreviewCard,
              so this preview reads as part of the same visual system. */}
          <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50/80 px-5 py-3">
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <span className="h-2 w-2 rounded-full bg-neutral-300" />
            <span className="ml-2 truncate text-xs font-medium text-neutral-400">
              Macro Maxxer · {restaurantName} · {activeStep.tabLabel}
            </span>
          </div>

          <div
            key={activeStep.key}
            id={`walkthrough-panel-${activeStep.key}`}
            role="tabpanel"
            aria-labelledby={`walkthrough-tab-${activeStep.key}`}
            tabIndex={0}
            className="walkthrough-panel-enter p-5 sm:p-7"
          >
            {activeStep.key === "find" ? <FindComparePreview items={findItems} /> : null}
            {activeStep.key === "customize" ? (
              <CustomizeBuildPreview
                item={buildItem}
                addOns={addOns}
                selectedAddOnIds={selectedAddOnIds}
                onToggleAddOn={toggleAddOn}
                totals={buildTotals}
              />
            ) : null}
            {activeStep.key === "review" ? <ReviewOrderPreview items={reviewItems} totals={reviewTotals} /> : null}
          </div>
        </SurfaceCard>

        <div className="mt-5 flex justify-center">
          <Link
            href={ctaHrefByStep[activeStep.key]}
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {activeStep.ctaLabel}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

type FindSortKey = "protein" | "calories" | "ratio";

const FIND_SORT_OPTIONS: Array<{ key: FindSortKey; label: string; Icon: LucideIcon }> = [
  { key: "protein", label: "Highest Protein", Icon: Flame },
  { key: "calories", label: "Lowest Calories", Icon: Leaf },
  { key: "ratio", label: "Best Protein Score", Icon: Scale },
];

function sortFindItems(items: WalkthroughMenuItem[], sortKey: FindSortKey) {
  const sorted = [...items];

  if (sortKey === "protein") {
    sorted.sort((a, b) => b.nutrition.protein - a.nutrition.protein);
  } else if (sortKey === "calories") {
    sorted.sort((a, b) => a.nutrition.calories - b.nutrition.calories);
  } else {
    sorted.sort(
      (a, b) =>
        (getProteinPer100Calories(b.nutrition.protein, b.nutrition.calories) ?? 0) -
        (getProteinPer100Calories(a.nutrition.protein, a.nutrition.calories) ?? 0)
    );
  }

  return sorted;
}

function FindComparePreview({ items }: { items: WalkthroughMenuItem[] }) {
  const [sortKey, setSortKey] = useState<FindSortKey>("protein");
  const [displayItems, setDisplayItems] = useState(() => sortFindItems(items, "protein"));
  const [isFading, setIsFading] = useState(false);
  const fadeTimeout = useRef<number | undefined>(undefined);

  const topProteinItemId = items.reduce(
    (best, item) => (item.nutrition.protein > best.nutrition.protein ? item : best),
    items[0]
  )?.id;

  const handleSortSelect = (nextSortKey: FindSortKey) => {
    if (nextSortKey === sortKey) return;
    setSortKey(nextSortKey);

    if (prefersReducedMotion()) {
      setDisplayItems(sortFindItems(items, nextSortKey));
      return;
    }

    window.clearTimeout(fadeTimeout.current);
    setIsFading(true);
    fadeTimeout.current = window.setTimeout(() => {
      setDisplayItems(sortFindItems(items, nextSortKey));
      setIsFading(false);
    }, 150);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FIND_SORT_OPTIONS.map(({ key, label, Icon }) => (
          <FilterChip
            key={key}
            active={sortKey === key}
            onClick={() => handleSortSelect(key)}
            aria-pressed={sortKey === key}
            className="text-xs"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </FilterChip>
        ))}
      </div>

      <div
        className={`mt-4 space-y-2 transition-opacity duration-150 motion-reduce:transition-none ${
          isFading ? "opacity-0" : "opacity-100"
        }`}
      >
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50/60 px-3 py-2.5"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
              <Image src={item.image} alt="" fill className="object-cover" sizes="48px" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-neutral-900">{item.name}</p>
                {item.id === topProteinItemId ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2410c]">
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    Top Protein
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-neutral-500">{item.category}</p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <MacroStat macroKey="calories" value={item.nutrition.calories} size="quick" />
              <MacroStat macroKey="protein" value={item.nutrition.protein} size="quick" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomizeBuildPreview({
  item,
  addOns,
  selectedAddOnIds,
  onToggleAddOn,
  totals,
}: {
  item: WalkthroughMenuItem;
  addOns: WalkthroughAddOn[];
  selectedAddOnIds: string[];
  onToggleAddOn: (id: string) => void;
  totals: Nutrition;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-neutral-50 sm:mx-0">
        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="112px" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{item.category}</p>
        <h4 className="font-heading text-lg font-bold text-neutral-900">{item.name}</h4>

        <div className="mt-3 flex flex-wrap gap-2">
          {addOns.map((addOn) => {
            const isSelected = selectedAddOnIds.includes(addOn.id);
            return (
              <button
                key={addOn.id}
                type="button"
                onClick={() => onToggleAddOn(addOn.id)}
                aria-pressed={isSelected}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  isSelected
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-black/15 bg-white text-neutral-600 hover:bg-black/5"
                }`}
              >
                {isSelected ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {addOn.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
          <MacroStat macroKey="calories" value={totals.calories} size="summary" />
          <MacroStat macroKey="protein" value={totals.protein} size="summary" />
          <MacroStat macroKey="carbs" value={totals.carbs} size="summary" />
          <MacroStat macroKey="totalFat" value={totals.totalFat} size="summary" />
        </div>
      </div>
    </div>
  );
}

function ReviewOrderPreview({ items, totals }: { items: WalkthroughReviewItem[]; totals: Nutrition }) {
  return (
    <div>
      <div className="space-y-4">
        {items.map((item) => (
          <CartItemPreviewRow
            key={item.id}
            item={{
              name: item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name,
              image: item.image,
              macrosPerItem: item.nutrition,
              nutritionPerItem: item.nutrition,
              quantity: item.quantity,
            }}
            macroStyle="compact"
          />
        ))}
      </div>

      <div className="mt-5 h-px bg-black/10" />

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Order Totals</p>
        <div className="mt-2">
          <MacroSplitBar protein={totals.protein} carbs={totals.carbs} totalFat={totals.totalFat} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-600">Total Calories</span>
          <span className="text-lg font-bold text-neutral-900">{totals.calories}</span>
        </div>
      </div>
    </div>
  );
}

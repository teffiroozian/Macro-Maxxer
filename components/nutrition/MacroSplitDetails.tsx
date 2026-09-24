"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { gramMacroOrder, macroDisplayConfig, type MacroKey } from "@/components/nutrition/macroDisplay";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { CoreMacros } from "@/types/nutrition";
import type { MacroBreakdownItem } from "@/types/macroBreakdown";

type GramMacroKey = Exclude<MacroKey, "calories">;

function formatGrams(value: number) {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

function itemCountLabel(count: number) {
  return count === 1 ? "in this item" : `across ${count} items`;
}

// Ranked "where it's coming from" row — the item's own contribution to the
// selected macro, plus (when the item has ingredient-level nutrition) an
// expandable, similarly-ranked ingredient breakdown underneath it.
function MacroSourceRow({
  item,
  macro,
  macroTotal,
}: {
  item: MacroBreakdownItem;
  macro: GramMacroKey;
  macroTotal: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const macroValue = item[macro];
  const percentOfTotal = macroTotal > 0 ? Math.round((macroValue / macroTotal) * 100) : 0;
  const accent = macroColorTokens[macro];
  const shortLabel = macroDisplayConfig[macro].label.toLowerCase();
  // "Ingredients" for a fully build-your-own item (Chipotle), "Items" for a
  // composite/menu item (a combo's side/drink, sauces, addons) — see
  // MacroBreakdownItem.nestedKind. Defaults to "ingredients" for any older
  // caller that hasn't set it yet.
  const nestedKind = item.nestedKind ?? "ingredients";
  const nestedLabel = nestedKind === "items" ? "Items" : "Ingredients";

  // Reranked every time the selected macro changes (via the `macro` dep) so
  // switching Protein/Carbs/Fat always reflects that macro's own ranking —
  // a 0g contributor still renders, just sorted to the bottom, never hidden.
  // A single nested entry (e.g. a plain item with no combo/sauce/addons —
  // "items" nesting always includes the parent itself as one entry) isn't a
  // real breakdown, so the expander only shows once there's more than one.
  const rankedNestedItems = useMemo(() => {
    if (!item.nestedItems || item.nestedItems.length <= 1) return [];
    return [...item.nestedItems].sort((left, right) => right[macro] - left[macro]);
  }, [item.nestedItems, macro]);

  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center gap-3">
        <RestaurantItemImage
          src={item.image}
          alt=""
          imagePresentation={item.imagePresentation}
          fallbackClassName="object-contain p-1"
          containerClassName="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-50"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">{formatGrams(item.calories)} cal</p>
        </div>
        <p className={`shrink-0 text-base font-bold leading-tight ${accent.valueClassName}`}>
          {formatGrams(macroValue)}g {shortLabel}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${accent.segmentClassName}`}
            style={{ width: `${Math.max(0, Math.min(100, percentOfTotal))}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-400">{percentOfTotal}%</span>
      </div>

      {rankedNestedItems.length > 0 ? (
        <>
          <button
            type="button"
            className="mt-2 flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
            {isExpanded ? `Hide ${nestedLabel.toLowerCase()}` : nestedLabel}
          </button>
          {isExpanded ? (
            <div className="mt-3 space-y-3 pl-1">
              {rankedNestedItems.map((nestedItem) => {
                const nestedValue = nestedItem[macro];
                return (
                  <div key={nestedItem.id} className="flex items-center gap-2.5">
                    <RestaurantItemImage
                      src={nestedItem.image}
                      alt=""
                      imagePresentation={nestedItem.imagePresentation}
                      fallbackClassName="object-contain p-1"
                      containerClassName="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-50"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{nestedItem.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-700">{formatGrams(nestedValue)}g</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function MacroSplitDetails({
  open,
  onClose,
  totals,
  items = [],
}: {
  open: boolean;
  onClose: () => void;
  totals: CoreMacros;
  items?: MacroBreakdownItem[];
}) {
  const [selectedMacro, setSelectedMacro] = useState<GramMacroKey>("protein");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const macroTotal = totals[selectedMacro];
  // Every cart item is shown — a 0g contributor (e.g. a Diet Coke under the
  // Protein tab) still belongs in the list, just at the bottom with an empty
  // bar, rather than silently disappearing. The "across N items" total below
  // only counts items that actually contribute, since that's what the total
  // is describing.
  const rankedItems = [...items].sort((left, right) => right[selectedMacro] - left[selectedMacro]);
  const contributingItemCount = items.filter((item) => item[selectedMacro] > 0).length;
  const accent = macroColorTokens[selectedMacro];

  const modal = (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="macro-split-title"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-white shadow-2xl sm:max-h-[min(720px,calc(100dvh-3rem))] sm:max-w-[520px] sm:rounded-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
          <h2 id="macro-split-title" className="truncate font-heading text-xl font-bold text-slate-900">
            Macro Split
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="-mr-2 cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close Macro Split"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6">
          <div role="tablist" aria-label="Select a macro" className="flex w-full gap-1 rounded-full bg-slate-100 p-1">
            {gramMacroOrder.map((macroKey) => {
              const isSelected = macroKey === selectedMacro;
              return (
                <button
                  key={macroKey}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedMacro(macroKey)}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    isSelected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${macroColorTokens[macroKey].segmentClassName}`} />
                  {macroDisplayConfig[macroKey].label} {formatGrams(totals[macroKey])}g
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {macroDisplayConfig[selectedMacro].label} Total
            </p>
            <div className="mt-2 border-t border-black/[0.06]" />
            <p className="mt-3 flex items-baseline gap-2">
              <span className={`text-4xl font-bold leading-none ${accent.valueClassName}`}>{formatGrams(macroTotal)}g</span>
              {contributingItemCount > 0 ? (
                <span className="text-sm font-medium text-slate-500">{itemCountLabel(contributingItemCount)}</span>
              ) : null}
            </p>
          </div>

          {rankedItems.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Where it&apos;s coming from</h3>
              <div className="mt-2 border-t border-black/[0.06]" />
              <div className="mt-3 divide-y divide-black/[0.06]">
                {rankedItems.map((item) => (
                  <MacroSourceRow key={item.id} item={item} macro={selectedMacro} macroTotal={macroTotal} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}

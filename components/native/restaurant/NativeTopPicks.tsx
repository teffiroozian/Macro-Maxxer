"use client";
import { useRef, useState } from "react";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import NativeMacroRow from "./NativeMacroRow";

export type TopPick = { key: string; title: string; description: string; items: MenuItem[] };

const CARD_STRIDE = 332;

export default function NativeTopPicks({ restaurantId, picks, onSeeAll }: {
  restaurantId: string;
  picks: TopPick[];
  onSeeAll: (key: string) => void;
}) {
  const { openPreview } = useGlobalItemPreview();
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  if (!picks.length) return null;
  return (
    <section>
      <h2 className="mx-5 mb-3 mt-[30px] text-xl font-bold tracking-[-0.01em] text-slate-900">Top picks</h2>
      <div
        ref={rail}
        role="list"
        onScroll={(event) => setActive(Math.min(picks.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / CARD_STRIDE))))}
        className="-mb-3 flex snap-x snap-mandatory gap-[10px] overflow-x-auto px-[18px] pb-5 [scroll-padding:0_18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {picks.map((pick) => (
          <div key={pick.key} role="listitem" className="w-[322px] flex-none snap-start overflow-hidden rounded-[22px] border border-black/8 bg-white shadow-elev-2">
            <div className="flex items-start justify-between gap-[10px] px-[14px] pb-1 pt-[14px]">
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold leading-[1.2] text-slate-900">{pick.title}</h3>
                <p className="text-[12.5px] leading-[1.35] text-slate-500">{pick.description}</p>
              </div>
              <button type="button" onClick={() => onSeeAll(pick.key)} aria-label={`See all ${pick.title}`} className="flex min-h-11 shrink-0 items-start gap-[3px] pt-0.5 text-[13.5px] font-semibold text-accent-strong focus-ring">
                See all
                <svg width="12" height="12" viewBox="0 0 9 15" fill="none" aria-hidden="true" className="mt-[5px]"><path d="m1.5 1.5 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <ul>
              {pick.items.map((item, index) => {
                const nutrition = getDefaultMenuItemNutrition(item);
                return (
                  <li key={item.id ?? item.name} className={index < pick.items.length - 1 ? "border-b border-slate-100" : ""}>
                    <button
                      type="button"
                      onClick={() => void openPreview(restaurantId, item)}
                      aria-label={`${item.name}, ${Math.round(nutrition.calories ?? 0)} calories, ${Math.round(nutrition.protein ?? 0)} grams protein`}
                      className="flex w-full items-center gap-3 px-[14px] py-3 text-left transition-[transform,background-color] duration-120 active:scale-[0.98] active:bg-slate-50 motion-reduce:active:scale-100 focus-ring"
                    >
                      <span className={`font-heading w-[18px] text-center text-base font-bold ${index === 0 ? "text-accent-strong" : "text-slate-400"}`} aria-hidden="true">{index + 1}</span>
                      <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="size-[52px] shrink-0 overflow-hidden rounded-xl bg-slate-100" />
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="truncate text-[15px] font-bold text-slate-900">{item.name}</span>
                        <NativeMacroRow nutrition={nutrition} variant="dense" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5" aria-hidden="true">
        {picks.map((pick, index) => (
          <span key={pick.key} className={`h-1.5 rounded-[3px] transition-[width,background-color] duration-200 ${index === active ? "w-4 bg-accent-strong" : "w-1.5 bg-slate-300"}`} />
        ))}
      </div>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { MenuItem } from "@/types/menu";
import NativeCategoryItemCard from "./NativeCategoryItemCard";

export type NativeCategory = { id: string; label: string; count: number; items: MenuItem[] };

const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export default function NativeCategoryBrowser({ restaurantId, categories, onSeeAll }: {
  restaurantId: string;
  categories: NativeCategory[];
  onSeeAll: (categoryId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? "");
  const rail = useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => c.id === selectedId) ?? categories[0];
  useEffect(() => { rail.current?.scrollTo({ left: 0 }); }, [selected?.id]);
  if (!selected) return null;
  return (
    <section>
      <h2 className="mx-5 mb-3 mt-[30px] text-xl font-bold tracking-[-0.01em] text-slate-900">Categories</h2>
      <div role="tablist" aria-label="Categories" className={`flex gap-[10px] overflow-x-auto px-[18px] ${hideScrollbar}`}>
        {categories.map((category) => {
          const isSelected = category.id === selected.id;
          const first = category.items[0];
          return (
            <button key={category.id} type="button" role="tab" aria-selected={isSelected} onClick={() => setSelectedId(category.id)} className="flex w-[76px] flex-none flex-col items-center gap-1.5 focus-ring">
              <span className={`size-[76px] rounded-full border-[2.5px] bg-white p-[3px] ${isSelected ? "border-accent-strong" : "border-transparent"}`}>
                {first ? <RestaurantItemImage src={first.image} alt="" imagePresentation={first.imagePresentation} containerClassName="size-full overflow-hidden rounded-full bg-slate-100" /> : <span className="block size-full rounded-full bg-slate-100" />}
              </span>
              <span className={`whitespace-nowrap text-[12.5px] ${isSelected ? "font-bold text-accent-strong" : "font-medium text-slate-500"}`}>{category.label}</span>
            </button>
          );
        })}
      </div>
      <div
        ref={rail}
        role="list"
        className={`mt-3 flex snap-x snap-mandatory gap-[10px] overflow-x-auto px-[18px] pb-5 -mb-3 [scroll-padding:0_18px] ${hideScrollbar}`}
      >
        {selected.items.slice(0, 3).map((item) => <NativeCategoryItemCard key={item.id ?? item.name} restaurantId={restaurantId} item={item} />)}
        <button
          type="button"
          role="listitem"
          onClick={() => onSeeAll(selected.id)}
          className="flex w-[120px] flex-none snap-start flex-col items-center justify-center gap-[10px] self-stretch rounded-[20px] border border-[#d1fae5] bg-[#ecfdf5] p-3 transition-transform duration-120 active:scale-[0.98] motion-reduce:active:scale-100 focus-ring"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-accent-strong text-white" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="text-[13.5px] font-bold leading-[1.3] text-accent-strong">All {selected.count} {selected.label}</span>
        </button>
      </div>
    </section>
  );
}

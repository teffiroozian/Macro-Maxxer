"use client";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { ItemVariant, MenuItem } from "@/types/menu";
import NativeImageWell, { usableImage } from "./NativeImageWell";
import NativeMacroQuad from "./NativeMacroQuad";
import { toMacros } from "./nativeItemModel";
import { CARD_RING, CARD_RING_SELECTED, CheckBadge, railClass, ringTransition } from "./NativeSectionCard";

export default function NativeVariantRail({ item, variants, selectedId, onSelect, fallbackImage }: {
  item: MenuItem; variants: ItemVariant[]; selectedId?: string; onSelect: (id: string) => void; fallbackImage?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Options" className={railClass}>
      {variants.map((variant) => {
        const selected = variant.id === selectedId;
        const image = usableImage(variant.image) ?? usableImage(item.image) ?? fallbackImage;
        return (
          <button key={variant.id} type="button" role="radio" aria-checked={selected} onClick={() => onSelect(variant.id)}
            className={`relative flex w-[216px] flex-none snap-start flex-col gap-3 rounded-[24px] bg-white px-[10px] pb-[14px] pt-[10px] text-left ${ringTransition} ${selected ? CARD_RING_SELECTED : CARD_RING} focus-ring`}>
            <NativeImageWell src={image} presentation={item.imagePresentation} className="h-[108px] rounded-[17px] p-4" />
            <CheckBadge selected={selected} className="right-[10px] top-[10px]" />
            <span className="px-1 text-base font-bold text-slate-900">{variant.label}</span>
            <span className="px-1"><NativeMacroQuad macros={toMacros(resolveMenuItemVariantNutrition(item, variant))} /></span>
          </button>
        );
      })}
    </div>
  );
}

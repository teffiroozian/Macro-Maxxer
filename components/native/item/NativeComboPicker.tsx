"use client";
import { getDefaultVariantId } from "@/lib/menuItemCalculations";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import NativeImageWell from "./NativeImageWell";
import NativeMacroQuad from "./NativeMacroQuad";
import { toMacros } from "./nativeItemModel";
import { CARD_RING, CARD_RING_SELECTED, CheckBadge, railClass, ringTransition } from "./NativeSectionCard";

type GroupProps = {
  title: string;
  options: MenuItem[];
  selectedId?: string;
  selectedVariantId?: string;
  onSelect: (id: string) => void;
  onSelectVariant: (variantId: string) => void;
};

function SizeControl({ option, selectedVariantId, onSelectVariant }: { option: MenuItem; selectedVariantId?: string; onSelectVariant: (id: string) => void }) {
  const variants = option.variants ?? [];
  if (variants.length < 2 || option.hideVariantSelector || option.disableVariantSelector) return null;
  return (
    <div role="radiogroup" aria-label={`${option.name} size`} className="flex rounded-xl bg-[#f1f5f9] p-[3px]">
      {variants.map((variant) => {
        const selected = variant.id === selectedVariantId;
        return (
          <button key={variant.id} type="button" role="radio" aria-checked={selected} onClick={() => onSelectVariant(variant.id)}
            className={`min-h-8 rounded-[9px] px-[11px] py-1.5 text-[12.5px] font-bold transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none ${selected ? "bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.14)]" : "text-slate-500"} focus-ring`}>
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceGroup({ title, options, selectedId, selectedVariantId, onSelect, onSelectVariant, className = "" }: GroupProps & { className?: string }) {
  if (options.length === 0) return null;
  const selected = options.find((o) => (o.id ?? o.name) === selectedId);
  return (
    <div className={`flex flex-col gap-[10px] ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        {selected ? <SizeControl option={selected} selectedVariantId={selectedVariantId} onSelectVariant={onSelectVariant} /> : null}
      </div>
      <div role="radiogroup" aria-label={title} className={railClass.replace("gap-3", "gap-[10px]")}>
        {options.map((option) => {
          const id = option.id ?? option.name;
          const isSelected = id === selectedId;
          const variantId = isSelected ? selectedVariantId : undefined;
          const variants = option.variants ?? [];
          const currentLabel = variants.find((v) => v.id === selectedVariantId)?.label;
          const variant = (isSelected ? variants.find((v) => v.id === variantId) : variants.find((v) => v.label === currentLabel))
            ?? variants.find((v) => v.id === getDefaultVariantId(option));
          return (
            <button key={id} type="button" role="radio" aria-checked={isSelected} onClick={() => onSelect(id)}
              className={`relative flex w-[196px] flex-none snap-start flex-col gap-[10px] rounded-[22px] bg-white px-2 pb-[13px] pt-2 text-left ${ringTransition} ${isSelected ? CARD_RING_SELECTED : CARD_RING} focus-ring`}>
              <NativeImageWell src={variant?.image ?? option.image} presentation={option.imagePresentation} className="h-[92px] rounded-[15px] p-3" />
              <CheckBadge selected={isSelected} size={22} className="right-2 top-2" />
              <span className="truncate px-[5px] text-[14.5px] font-bold text-slate-900">{option.name}</span>
              <span className="px-[5px]"><NativeMacroQuad macros={toMacros(resolveMenuItemVariantNutrition(option, variant))} valueClassName="text-xs" /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NativeComboPicker({ sides, drinks, bundles, sideProps, drinkProps, selectedBundleId, onSelectBundle }: {
  sides: MenuItem[]; drinks: MenuItem[]; bundles: MenuItem[];
  sideProps: Omit<GroupProps, "title" | "options">; drinkProps: Omit<GroupProps, "title" | "options">;
  selectedBundleId?: string; onSelectBundle: (id: string) => void;
}) {
  return (
    <>
      <ChoiceGroup title="Side" options={sides} {...sideProps} />
      <ChoiceGroup title="Drink" options={drinks} {...drinkProps} className="pt-3" />
      {bundles.length > 0 ? (
        <ChoiceGroup title="Meal" options={bundles} selectedId={selectedBundleId} onSelect={onSelectBundle} onSelectVariant={() => {}} className="pt-3" />
      ) : null}
    </>
  );
}

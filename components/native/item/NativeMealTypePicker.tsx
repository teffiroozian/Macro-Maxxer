"use client";
import { usableImage } from "./NativeImageWell";
import { CARD_RING, CARD_RING_SELECTED, Radio, ringTransition } from "./NativeSectionCard";

export default function NativeMealTypePicker({ comboType, onChange, itemImage, sideImage, drinkImage }: {
  comboType: "just-item" | "combo-meal"; onChange: (next: "just-item" | "combo-meal") => void;
  itemImage?: string; sideImage?: string; drinkImage?: string;
}) {
  const options = [{ id: "just-item" as const, label: "Entrée" }, { id: "combo-meal" as const, label: "Combo Meal" }];
  const img = (src: string | undefined, className: string, style: React.CSSProperties) => {
    const resolved = usableImage(src);
    // eslint-disable-next-line @next/next/no-img-element
    return resolved ? <img src={resolved} alt="" className={`absolute object-contain ${className}`} style={style} /> : null;
  };
  return (
    <div role="radiogroup" aria-label="Order type" className="grid grid-cols-2 gap-[10px] px-5">
      {options.map((option) => {
        const selected = option.id === comboType;
        return (
          <button key={option.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(option.id)}
            className={`relative flex flex-col gap-3 rounded-[22px] bg-white px-2 pb-[14px] pt-2 ${ringTransition} ${selected ? CARD_RING_SELECTED : CARD_RING} focus-ring`}>
            <span className="relative block h-[100px] overflow-hidden rounded-2xl bg-[#f1f5f9]">
              <span className="absolute left-1/2 top-0 block h-[100px] w-[124px] -translate-x-1/2">
                {option.id === "just-item"
                  ? img(itemImage, "", { width: 75, left: "calc(50% - 37px)", top: 3 })
                  : <>
                      {img(drinkImage, "", { width: 49, left: "calc(50% - 61px)", top: 15 })}
                      {img(sideImage, "", { width: 53, left: "calc(50% + 12px)", top: 17 })}
                      {img(itemImage, "", { width: 65, left: "calc(50% - 32px)", top: 10 })}
                    </>}
              </span>
            </span>
            <span className="absolute right-[10px] top-[10px]"><Radio selected={selected} /></span>
            <span className="text-center text-[15.5px] font-bold text-slate-900">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

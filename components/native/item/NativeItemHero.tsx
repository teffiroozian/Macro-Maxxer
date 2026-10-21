import Image from "next/image";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import type { ItemImagePresentation } from "@/types/menu";
import NativeImageWell from "./NativeImageWell";
import { formatMacro, MACRO_KEYS, MACRO_LABELS, type Macros } from "./nativeItemModel";

export default function NativeItemHero({ image, presentation, title, subtitle, restaurantName, restaurantLogo, editing, macros }: {
  image?: string; presentation?: ItemImagePresentation; title: string; subtitle?: string;
  restaurantName: string; restaurantLogo?: string; editing: boolean; macros: Macros;
}) {
  return (
    <div className="rounded-b-[28px] bg-white">
      <NativeImageWell src={image} presentation={presentation} className="h-[330px] bg-[#eef2f6] px-8 pb-[46px] pt-[62px]" />
      <div className="relative -mt-7 flex flex-col items-center gap-2 rounded-t-[28px] bg-white px-5 pb-[26px] pt-6 text-center">
        <div className="flex items-center gap-[7px]">
          {restaurantLogo ? (
            <span className="relative size-[22px] overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"><Image src={restaurantLogo} alt="" fill sizes="22px" className="object-cover" /></span>
          ) : null}
          <span className="text-sm font-semibold text-slate-600">{restaurantName}</span>
          {editing ? <span className="rounded-full bg-[#ecfdf3] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-accent-strong">Editing</span> : null}
        </div>
        <h1 className="font-heading text-[25px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900 [text-wrap:balance]">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        <div className="flex w-full pt-3" aria-label="Nutrition per item">
          {MACRO_KEYS.map((key, index) => (
            <div key={key} className={`flex flex-1 flex-col items-center gap-[6px] px-4 ${index > 0 ? "border-l border-[#e9edf2]" : ""}`}>
              <span className={`font-heading text-[17px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{formatMacro(key, macros[key])}</span>
              <span className="text-[10.5px] font-bold uppercase leading-none tracking-[0.06em] text-slate-500">{MACRO_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

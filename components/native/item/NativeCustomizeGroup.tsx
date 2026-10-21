"use client";
import type { MenuItem } from "@/types/menu";
import NativeImageWell from "./NativeImageWell";
import NativeStepper from "./NativeStepper";
import { formatMacro, type CustomizeGroup, type CustomizeRow } from "./nativeItemModel";
import { Radio } from "./NativeSectionCard";

export type CustomizeHandlers = {
  incrementIngredient: (id: string) => void;
  decrementIngredient: (id: string) => void;
  selectSingleIngredient: (id: string, idsInTab: string[]) => void;
  incrementSauce: (addon: MenuItem) => void;
  decrementSauce: (addon: MenuItem) => void;
  selectAddon: (ref: string, addon: MenuItem | null) => void;
};

function MacroLine({ row }: { row: CustomizeRow }) {
  const m = row.macros;
  const cal = `${row.plus && m.calories > 0 ? "+" : ""}${formatMacro("calories", m.calories)} cal`;
  return (
    <span className="flex flex-wrap gap-x-2 text-[11.5px] font-bold" aria-hidden="true">
      <span className="text-[#111318]">{cal}</span>
      <span className="text-[#c2410c]">{formatMacro("protein", m.protein)} P</span>
      <span className="text-[#ca8a04]">{formatMacro("carbs", m.carbs)} C</span>
      <span className="text-[#2563eb]">{formatMacro("totalFat", m.totalFat)} F</span>
    </span>
  );
}

function Row({ row, handlers, first }: { row: CustomizeRow; handlers: CustomizeHandlers; first: boolean }) {
  const t = row.target;
  const body = (
    <>
      <NativeImageWell src={row.image} className="size-12 shrink-0 rounded-[14px] p-1" />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] text-left">
        <span className="text-[14.5px] font-bold text-slate-900">{row.name}</span>
        <MacroLine row={row} />
      </span>
    </>
  );
  const border = first ? "" : "border-t border-[#f1f5f9]";
  if (row.control.kind === "radio") {
    const onClick = () => {
      if (t.type === "ingredient") handlers.selectSingleIngredient(t.id, t.idsInTab);
      else if (t.type === "addon") handlers.selectAddon(t.ref, t.addon);
    };
    return (
      <button type="button" role="radio" aria-checked={row.control.selected} onClick={onClick} className={`flex w-full items-center gap-3 py-[10px] ${border} focus-ring`}>
        {body}<Radio selected={row.control.selected} />
      </button>
    );
  }
  const { count, max } = row.control;
  return (
    <div className={`flex items-center gap-3 py-[10px] ${border}`}>
      {body}
      <NativeStepper
        name={row.name}
        count={count}
        max={max}
        onDecrement={() => (t.type === "sauce" ? handlers.decrementSauce(t.addon) : t.type === "ingredient" ? handlers.decrementIngredient(t.id) : undefined)}
        onIncrement={() => (t.type === "sauce" ? handlers.incrementSauce(t.addon) : t.type === "ingredient" ? handlers.incrementIngredient(t.id) : undefined)}
      />
    </div>
  );
}

export default function NativeCustomizeGroupList({ groups, handlers }: { groups: CustomizeGroup[]; handlers: CustomizeHandlers }) {
  return (
    <div className="flex flex-col gap-5 px-5">
      {groups.map((group) => {
        const isRadio = group.rows[0]?.control.kind === "radio";
        return (
          <div key={group.id}>
            <p className="pb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{group.title}</p>
            <div role={isRadio ? "radiogroup" : "group"} aria-label={group.title}>
              {group.rows.map((row, index) => <Row key={row.key} row={row} handlers={handlers} first={index === 0} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

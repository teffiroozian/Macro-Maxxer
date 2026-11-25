import { Search } from "lucide-react";

type Action = { label: string; onClick: () => void };

export default function NativeNoResults({ title, detail, primary, secondary }: { title: string; detail: string; primary: Action; secondary?: Action }) {
  return (
    <div className="flex flex-col items-center px-6 pt-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-surface-card dark:text-slate-400"><Search size={28} strokeWidth={2.2} aria-hidden="true" /></span>
      <h2 className="mt-[18px] max-w-full break-words text-xl font-bold leading-[26px]">{title}</h2>
      <p className="mt-1.5 text-pretty text-base leading-[23px] text-slate-600 dark:text-slate-300">{detail}</p>
      <button type="button" onClick={primary.onClick} className="mt-[22px] flex h-12 cursor-pointer items-center rounded-full bg-accent-strong px-[22px] text-base font-bold text-white active:opacity-80 dark:bg-accent dark:text-slate-950 focus-ring">{primary.label}</button>
      {secondary ? <button type="button" onClick={secondary.onClick} className="mt-2 flex h-11 cursor-pointer items-center px-3 text-base font-semibold text-accent-strong focus-ring">{secondary.label}</button> : null}
    </div>
  );
}

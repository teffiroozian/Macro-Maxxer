"use client";
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import SavedSheet from "@/components/native/saved/SavedSheet";
import { primaryButton } from "@/components/native/saved/savedStyles";

export const linkButton = "flex h-11 cursor-pointer items-center text-[15px] font-semibold text-accent-strong active:opacity-70 focus-ring";
export const segments = "grid auto-cols-fr grid-flow-col rounded-2xl bg-slate-200/80 p-1 dark:bg-surface-card";
export const segment = (on: boolean) => `flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-1 text-[14.5px] focus-ring ${on ? "bg-white font-bold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.14)] dark:bg-control dark:text-slate-50" : "font-semibold text-slate-600 dark:text-slate-300"}`;

// onClose must be stable, see SavedSheet.
export default function MenuSheet({ title, badge, action, disabled = false, onReset, onClose, children }: {
  title: string;
  badge?: number;
  action: string;
  disabled?: boolean;
  onReset: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const close = useRef<HTMLButtonElement>(null);
  return (
    <SavedSheet titleId="menu-sheet-title" onClose={onClose} initialFocusRef={close}>
      <div className="flex h-[58px] shrink-0 items-center gap-2.5 px-5">
        <h2 id="menu-sheet-title" className="truncate font-heading text-[21px] font-bold tracking-[-0.02em]">{title}</h2>
        {badge ? <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent-strong px-1.5 text-[13px] font-bold text-white dark:bg-accent dark:text-slate-950">{badge}<span className="sr-only"> active</span></span> : null}
        <button ref={close} type="button" aria-label={`Close ${title}`} onClick={onClose} className="ml-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring">
          <span className="flex size-10 items-center justify-center rounded-full bg-slate-200/70 dark:bg-surface-hover"><X size={17} strokeWidth={2.4} aria-hidden="true" /></span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 pt-0.5">{children}</div>
      <div className="grid shrink-0 grid-cols-[108px_1fr] gap-2.5 border-t border-slate-200 px-5 pb-[max(1.25rem,var(--safe-area-bottom))] pt-3 dark:border-divider">
        <button type="button" onClick={onReset} className="flex h-[50px] cursor-pointer items-center justify-center rounded-2xl bg-slate-200/70 text-base font-semibold active:opacity-70 dark:bg-surface-hover focus-ring">Reset</button>
        <button type="button" disabled={disabled} onClick={onClose} className={primaryButton}><span aria-live="polite">{action}</span></button>
      </div>
    </SavedSheet>
  );
}

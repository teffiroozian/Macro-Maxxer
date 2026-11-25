"use client";
import { useRef, type ReactNode } from "react";
import SavedSheet from "@/components/native/saved/SavedSheet";
import { textButton } from "@/components/native/saved/savedStyles";

export default function OrderSheet({ title, closeLabel = "Done", onClose, children }: { title: string; closeLabel?: string; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  return (
    <SavedSheet titleId="order-sheet-title" onClose={onClose} initialFocusRef={close}>
      <div className="flex h-[60px] shrink-0 items-center justify-between gap-3 px-5">
        <h2 id="order-sheet-title" className="truncate font-heading text-lg font-bold tracking-[-0.02em]">{title}</h2>
        <button ref={close} type="button" onClick={onClose} className={`${textButton} font-semibold`}>{closeLabel}</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,var(--safe-area-bottom))] pt-0.5">{children}</div>
    </SavedSheet>
  );
}

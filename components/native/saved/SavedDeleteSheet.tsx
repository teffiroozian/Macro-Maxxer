"use client";
import { useRef } from "react";
import SavedSheet from "./SavedSheet";
import { quietButton, soft } from "./savedStyles";

export default function SavedDeleteSheet({ name, onDelete, onClose }: { name: string; onDelete: () => void; onClose: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <SavedSheet titleId="saved-delete-title" onClose={onClose} initialFocusRef={keep}>
      <div className="px-5 pb-[max(1.5rem,var(--safe-area-bottom))] pt-5">
        <h2 id="saved-delete-title" className="font-heading text-lg font-bold leading-[25px] tracking-[-0.02em] [overflow-wrap:anywhere]">Delete “{name}”?</h2>
        <p className={`mt-1.5 text-base leading-[22px] ${soft}`}>This removes the saved meal. Past orders stay in History.</p>
        <button type="button" onClick={onDelete} className="mt-5 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-2xl bg-error text-base font-bold text-white active:opacity-80 focus-ring">Delete meal</button>
        <button ref={keep} type="button" onClick={onClose} className={`mt-2.5 w-full !h-[50px] !rounded-2xl !text-base ${quietButton}`}>Keep meal</button>
      </div>
    </SavedSheet>
  );
}

"use client";
import { useRef, useState, type ReactNode } from "react";
import { cleanMealName, MEAL_NAME_LIMIT } from "@/lib/native/savedLibrary";
import SavedSheet from "./SavedSheet";
import { field, muted, primaryButton, quietButton, soft } from "./savedStyles";

export default function SavedMealNameSheet({ title, detail, preview, note, initialName = "", submitLabel, onSubmit, onClose }: {
  title: string;
  detail?: string;
  preview?: ReactNode;
  note?: string;
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const input = useRef<HTMLInputElement>(null);
  const clean = cleanMealName(name);
  return (
    <SavedSheet titleId="saved-name-title" onClose={onClose} initialFocusRef={input}>
      <form onSubmit={(event) => { event.preventDefault(); if (clean) onSubmit(clean); }} className="min-h-0 overflow-y-auto px-5 pb-[max(1.5rem,var(--safe-area-bottom))] pt-4">
        <h2 id="saved-name-title" className="font-heading text-lg font-bold leading-[25px] tracking-[-0.02em]">{title}</h2>
        {detail ? <p className={`mt-1 line-clamp-2 text-[15px] leading-5 ${soft}`}>{detail}</p> : null}
        {preview}
        <label className={`mt-4 block text-sm font-semibold ${soft}`}>
          Meal name
          <input ref={input} type="text" value={name} maxLength={MEAL_NAME_LIMIT} autoComplete="off" enterKeyHint="done" placeholder="Name this meal" onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        {note ? <p className={`mt-2 text-sm ${muted}`}>{note}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className={`${quietButton} !h-[50px] !rounded-2xl !text-base`}>Cancel</button>
          <button type="submit" disabled={!clean} className={primaryButton}>{submitLabel}</button>
        </div>
      </form>
    </SavedSheet>
  );
}

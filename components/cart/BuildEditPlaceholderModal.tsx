"use client";

import { useEffect } from "react";
import ItemModalHero from "@/components/ItemModalHero";

export default function BuildEditPlaceholderModal({
  itemName,
  itemImage,
  onClose,
  zIndexClass = "z-[100]",
}: {
  itemName: string;
  itemImage?: string;
  onClose: () => void;
  zIndexClass?: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center`}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${itemName}`}
    >
      <button
        type="button"
        className="cursor-pointer absolute inset-0 border-0 bg-slate-900/66"
        onClick={onClose}
        aria-label="Close build edit modal"
      />
      <div className="relative m-4 w-[min(1024px,calc(100%-32px))] overflow-hidden rounded-2xl bg-white px-6 pt-6 pb-8">
        <button
          type="button"
          className="cursor-pointer ml-auto block h-9 w-9 rounded-full border border-black/12 bg-white/95 text-2xl"
          onClick={onClose}
          aria-label="Close build edit modal"
        >
          ×
        </button>
        <div className="mt-2 grid justify-items-center gap-10 pb-4">
          <ItemModalHero name={itemName} image={itemImage} />
          <p className="text-sm text-slate-600">Build edit placeholder content.</p>
        </div>
      </div>
    </div>
  );
}

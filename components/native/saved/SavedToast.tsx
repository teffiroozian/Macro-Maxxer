"use client";
import { useEffect } from "react";

export type SavedNotice = { id: number; text: string; undo?: () => void };

export default function SavedToast({ notice, onClose, raised = false }: {
  notice: SavedNotice;
  onClose: () => void;
  // Clears the Order page's buttons above the navigation.
  raised?: boolean;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [notice.id, onClose]);
  const { undo } = notice;
  return (
    <div className={`native-home-reveal fixed inset-x-4 ${raised ? "bottom-[calc(var(--native-nav-bottom)+138px)]" : "bottom-[calc(var(--native-nav-bottom)+74px)]"} z-[var(--z-nav)] mx-auto flex min-h-[54px] max-w-md items-center gap-3 rounded-[20px] bg-slate-900 pl-[18px] pr-1.5 text-white shadow-elev-3 dark:bg-slate-50 dark:text-slate-950`}>
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{notice.text}</p>
      {undo ? <button type="button" onClick={() => { undo(); onClose(); }} className="h-11 shrink-0 cursor-pointer px-3 text-[15px] font-bold text-emerald-300 active:opacity-70 dark:text-emerald-700 focus-ring">Undo</button> : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { pillTriggerClassName } from "@/components/controls/pillButton";
import ViewportMenu from "./ViewportMenu";
import RankOptions, { RankSelection } from "./RankOptions";
import type { SortOption } from "@/lib/menuSections/sortOptions";

const desktopQuery = "(min-width: 1024px)";
function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverDesktopSnapshot = () => false;

export default function RankSelector({ value, isOpen, onOpenChange, onChange }: {
  value: SortOption; isOpen: boolean; onOpenChange: (open: boolean) => void; onChange: (value: SortOption) => void;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverDesktopSnapshot);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) onOpenChange(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onOpenChange(false); anchorRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [isOpen, onOpenChange]);
  const chooseSort = (sort: SortOption) => {
    onChange(sort);
    if (desktop) { onOpenChange(false); anchorRef.current?.focus(); }
  };
  return <div className="relative shrink-0">
    <button ref={anchorRef} type="button" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => { onOpenChange(!isOpen); }} onKeyDown={(event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault(); onOpenChange(true);
        requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[data-rank-metric]")?.focus());
      }
    }} className={pillTriggerClassName({ className: isOpen ? "border-slate-900" : "" })}>
      <RankSelection value={value} colorful={desktop} displayDefault={false} showChevron isOpen={isOpen} />
    </button>
    <ViewportMenu open={isOpen} anchorRef={anchorRef} menuRef={menuRef} width={360} allowFlip={!desktop} label="Rank by" onKeyDown={(event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-rank-metric]") ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault(); buttons[(current + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    }}>
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Rank by</div>
      <RankOptions value={value} onChange={chooseSort} desktop={desktop} isOpen={isOpen} />
    </ViewportMenu>
  </div>;
}

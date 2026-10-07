"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, CupSoda, Layers } from "lucide-react";
import ViewportMenu from "./ViewportMenu";
import { pillTriggerClassName } from "@/components/controls/pillButton";
import { ALL_MENU_SIZES, type MenuSizeSelectorControl } from "@/lib/menuSections/menuSizeSelector";

export default function MenuSizeSelector({ value, options, onChange }: MenuSizeSelectorControl) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const sizeOptions = options.filter((option) => option.value !== ALL_MENU_SIZES);
  const allOption = options.find((option) => option.value === ALL_MENU_SIZES);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const viewportChanged = () => { if (!desktop.matches) setOpen(false); };
    desktop.addEventListener("change", viewportChanged);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      desktop.removeEventListener("change", viewportChanged);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const focusOption = (index: number) => {
    setFocusedIndex(index);
    requestAnimationFrame(() => menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')[index]?.focus());
  };
  const openMenu = (last = false) => {
    setOpen(true);
    const index = options.findIndex((option) => option.value === value);
    focusOption(last ? options.length - 1 : Math.max(0, index));
  };

  // Like Rank, dismiss only on explicit interaction, not window/focus loss.
  return <div ref={containerRef} className="relative hidden shrink-0 lg:inline-flex">
    <button ref={triggerRef} type="button" aria-label={selected?.label ?? value} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(event.key === "ArrowUp");
      }
    }} className={pillTriggerClassName({ className: open ? "border-slate-900" : "" })}>
      <CupSoda aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.3} />
      <span>{selected?.label ?? value}</span>
      <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    <ViewportMenu open={open} anchorRef={triggerRef} menuRef={menuRef} width={318} id={menuId} label="Menu size" onKeyDown={(event) => {
      let next: number | undefined;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (focusedIndex + 1) % options.length;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (focusedIndex - 1 + options.length) % options.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = options.length - 1;
      if (next !== undefined) { event.preventDefault(); focusOption(next); }
    }}>
      <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Size</div>
      <div className="grid grid-cols-3 gap-2 px-1.5">
        {sizeOptions.map((option, index) => <button key={option.value} type="button" role="menuitemradio" aria-checked={option.value === value} tabIndex={focusedIndex === index ? 0 : -1} onFocus={() => setFocusedIndex(index)} onClick={() => {
          onChange(option.value); setOpen(false); triggerRef.current?.focus();
        }} className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-3.5 py-2 text-sm font-semibold text-slate-700 focus-ring ${option.value === value ? "border-slate-400 bg-slate-100" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
          <span className="flex h-7 shrink-0 items-center justify-center"><CupSoda aria-hidden="true" className={`${["h-4 w-4", "h-5 w-5", "h-6 w-6"][index] ?? "h-6 w-6"} text-slate-400`} strokeWidth={2.3} /></span>
          {option.label}
        </button>)}
      </div>
      <div role="separator" className="mx-3 mt-3 mb-1 h-px bg-slate-200" />
      {allOption ? <button type="button" role="menuitemradio" aria-checked={value === ALL_MENU_SIZES} tabIndex={focusedIndex === sizeOptions.length ? 0 : -1} onFocus={() => setFocusedIndex(sizeOptions.length)} onClick={() => {
        onChange(ALL_MENU_SIZES); setOpen(false); triggerRef.current?.focus();
      }} className={`flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-slate-700 focus-ring ${value === ALL_MENU_SIZES ? "bg-slate-100" : "hover:bg-slate-50"}`}>
        <Layers aria-hidden="true" className="h-[18px] w-[18px] text-slate-400" strokeWidth={2.3} />{allOption.label}
      </button> : null}
    </ViewportMenu>
  </div>;
}

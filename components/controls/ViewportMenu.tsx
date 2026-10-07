"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject, type KeyboardEventHandler } from "react";
import { getMenuPlacement } from "@/lib/controls/menuPlacement";
import { createPortal } from "react-dom";

// Shared desktop popover surface. Portaling avoids clipping/stacking from
// the sticky capsule; viewport fitting and overflow behavior are identical.
export default function ViewportMenu({ open, anchorRef, menuRef, width, id, label, children, onKeyDown, allowFlip = true }: {
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  width: number;
  allowFlip?: boolean;
  id?: string;
  label: string;
  children: ReactNode;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!anchor || !menu || !scroller || !content) return;
    const fade = () => {
      if (fadeRef.current) fadeRef.current.style.opacity = scroller.scrollHeight > scroller.clientHeight + 1 && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1 ? "1" : "0";
    };
    const position = () => {
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const rect = anchor.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { menu.style.visibility = "hidden"; return; }
      if (rect.bottom <= top || rect.top >= top + viewportHeight) { menu.style.visibility = "hidden"; return; }
      menu.style.width = `${Math.max(0, Math.min(width, viewportWidth - 16))}px`;
      const layout = getMenuPlacement(rect, { left, top, width: viewportWidth, height: viewportHeight }, width, content.scrollHeight, allowFlip);
      if (layout.height < 14) { menu.style.visibility = "hidden"; return; }
      menu.style.width = `${layout.width}px`;
      scroller.style.maxHeight = `${layout.scrollMaxHeight}px`;
      menu.style.left = `${layout.left}px`;
      menu.style.top = `${layout.top}px`;
      menu.style.visibility = "visible";
      fade();
    };
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(content);
    scroller.addEventListener("scroll", fade, { passive: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    position();
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", fade);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, width, anchorRef, menuRef, allowFlip]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(<div ref={menuRef} id={id} role="menu" aria-label={label} onKeyDown={onKeyDown} style={{ visibility: "hidden" }} className="fixed z-[120] overflow-hidden rounded-[18px] border border-black/10 bg-white p-1.5 text-slate-700 shadow-[0_16px_32px_rgba(15,23,42,.16)]">
    <div ref={scrollRef} className="hide-scrollbar overflow-y-auto overscroll-contain"><div ref={contentRef}>{children}</div></div>
    <div ref={fadeRef} aria-hidden="true" className="pointer-events-none absolute inset-x-1.5 bottom-1.5 h-7 bg-gradient-to-t from-white to-transparent opacity-0 transition-opacity" />
  </div>, document.body);
}

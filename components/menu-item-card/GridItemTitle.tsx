"use client";

import { useEffect, useRef } from "react";
import { getGridTitleRevealDuration, GRID_TITLE_RESET_DURATION_MS } from "@/lib/menuItemCard/titlePresentation";

export default function GridItemTitle({ name }: { name: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const staticRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const staticText = staticRef.current;
    const text = textRef.current;
    if (!container || !staticText || !text) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let hovered = container.matches(":hover");
    let focused = document.activeElement === container;
    let overflow = 0;
    let frame = 0;
    const active = () => (hovered || focused) && desktop.matches && !reducedMotion.matches && overflow > 0;
    const reset = () => {
      staticText.style.opacity = "1";
      text.style.opacity = "0";
    };
    const currentOffset = () => {
      const transform = window.getComputedStyle(text).transform;
      return transform === "none" ? 0 : Math.max(0, -new DOMMatrixReadOnly(transform).m41);
    };
    const moveTo = (target: number) => {
      const distance = Math.abs(target - currentOffset());
      text.style.transition = target === 0
        ? `transform ${GRID_TITLE_RESET_DURATION_MS}ms ease-out`
        : `transform ${getGridTitleRevealDuration(distance)}ms linear`;
      text.style.transform = `translateX(-${target}px)`;
      if (target === 0 && distance === 0) reset();
    };
    const refresh = () => {
      cancelAnimationFrame(frame);
      if (active()) {
        staticText.style.opacity = "0";
        text.style.opacity = "1";
        frame = requestAnimationFrame(() => moveTo(overflow));
      } else if (!desktop.matches || reducedMotion.matches || overflow === 0) {
        text.style.transition = "none";
        text.style.transform = "translateX(0)";
        reset();
      } else {
        moveTo(0);
      }
    };
    const measure = () => {
      overflow = Math.max(0, text.scrollWidth - container.clientWidth);
      refresh();
    };
    const enter = () => { hovered = true; measure(); };
    const leave = () => { hovered = false; refresh(); };
    const focus = () => { focused = true; measure(); };
    const blur = () => { focused = false; refresh(); };
    const ended = () => { if (!active()) reset(); };
    // This text-only focus target should not activate its enclosing card.
    const key = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); }
    };
    container.addEventListener("mouseenter", enter);
    container.addEventListener("mouseleave", leave);
    container.addEventListener("focus", focus);
    container.addEventListener("blur", blur);
    container.addEventListener("keydown", key);
    text.addEventListener("transitionend", ended);
    desktop.addEventListener("change", measure);
    reducedMotion.addEventListener("change", measure);
    document.fonts.addEventListener("loadingdone", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(text);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("mouseenter", enter);
      container.removeEventListener("mouseleave", leave);
      container.removeEventListener("focus", focus);
      container.removeEventListener("blur", blur);
      container.removeEventListener("keydown", key);
      text.removeEventListener("transitionend", ended);
      desktop.removeEventListener("change", measure);
      reducedMotion.removeEventListener("change", measure);
      document.fonts.removeEventListener("loadingdone", measure);
      text.style.transition = "none";
      text.style.transform = "translateX(0)";
      reset();
    };
  }, [name]);

  return <span ref={containerRef} tabIndex={0} role="group" title={name} aria-label={name} className="relative hidden min-w-0 flex-1 overflow-hidden whitespace-nowrap rounded-sm focus-ring lg:block">
    <span ref={staticRef} aria-hidden="true" className="block overflow-hidden whitespace-nowrap">{name}</span>
    <span ref={textRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 inline-block w-max whitespace-nowrap opacity-0">{name}</span>
  </span>;
}

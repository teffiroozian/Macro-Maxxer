"use client";

import { useEffect, useRef, useState } from "react";
import RankNumber from "./RankNumber";

export default function IngredientGridTitle({ name, rank, badge, className }: {
  name: string;
  rank?: number;
  badge?: string;
  className: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [presentation, setPresentation] = useState({ singleLine: false, overflow: false });

  useEffect(() => {
    const container = containerRef.current;
    const text = nameRef.current;
    const naturalText = measureRef.current;
    if (!container || !text || !naturalText) return;
    const measure = () => {
      // Reserve the badge without introducing a second line when the name
      // would otherwise fit on one line across the full title area.
      const width = naturalText.getBoundingClientRect().width;
      const singleLine = width <= container.clientWidth;
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      const overflow = desktop && !singleLine
        ? text.scrollHeight > text.clientHeight
        : width > text.clientWidth;
      setPresentation((previous) => previous.singleLine === singleLine && previous.overflow === overflow
        ? previous : { singleLine, overflow });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(text);
    document.fonts.addEventListener("loadingdone", measure);
    measure();
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [name, rank, badge]);

  const title = <>{rank !== undefined ? <><RankNumber rank={rank} />{" "}</> : null}{name}</>;
  return (
    <div ref={containerRef} className="relative flex w-full min-w-0 items-center gap-1.5" title={name}>
      <span ref={measureRef} aria-hidden="true" className={`pointer-events-none invisible absolute left-0 top-0 w-max whitespace-nowrap ${className}`}>{title}</span>
      <span
        ref={nameRef}
        className={`min-w-0 shrink overflow-hidden max-md:max-h-[1lh] max-md:whitespace-nowrap md:break-all ${presentation.singleLine ? "md:max-h-[1lh]" : "md:max-h-[2lh]"} ${presentation.overflow ? "[mask-image:linear-gradient(to_right,black_calc(100%_-_12px),transparent)]" : ""} ${className}`}
      >
        {title}
      </span>
      {badge ? <span className="shrink-0 whitespace-nowrap rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/50">{badge}</span> : null}
    </div>
  );
}

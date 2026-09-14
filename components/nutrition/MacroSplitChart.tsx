"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

export type MacroSegment = {
    label: string;
    shortLabel: string;
    percent: number;
    roundedPercent: number;
    color: string;
};

// Shared with the standard item modal's Macro Split section (ItemDetailsPanel)
// so any prebuilt/preset review card that shows a macro split stays visually
// and numerically identical to it.
export function buildMacroSegments({
    protein,
    carbs,
    fat,
}: {
    protein: number;
    carbs: number;
    fat: number;
}): MacroSegment[] {
    const macroTotalGrams = protein + carbs + fat;

    return [
        {
            label: "Protein",
            shortLabel: "P",
            percent: macroTotalGrams > 0 ? (protein / macroTotalGrams) * 100 : 0,
            color: "bg-[#c2410c] text-white",
        },
        {
            label: "Carbs",
            shortLabel: "C",
            percent: macroTotalGrams > 0 ? (carbs / macroTotalGrams) * 100 : 0,
            color: "bg-[#ca8a04] text-white",
        },
        {
            label: "Fat",
            shortLabel: "F",
            percent: macroTotalGrams > 0 ? (fat / macroTotalGrams) * 100 : 0,
            color: "bg-[#2563eb] text-white",
        },
    ].map((segment) => ({ ...segment, roundedPercent: Math.round(segment.percent) }));
}

// Label detail level is picked purely by CSS container query (see the
// `.macro-segment*` rules in app/globals.css) based on this segment's own
// actual rendered width — never from segment.percent, since the same
// percentage can be a wide or narrow bar depending on how many macros are
// present and how wide the chart itself is on a given screen. All three
// variants are always in the DOM; the stylesheet shows exactly one (or none,
// once the segment is too narrow even for "25%"). The wrapper's aria-label
// carries the full macro name + percentage regardless of which/whether a
// visual variant is showing, so the accessible name never gets truncated.
function MacroSegmentBar({ segment }: { segment: MacroSegment }) {
    return (
        <div
            className="relative min-w-0"
            style={{ width: `${segment.percent}%` }}
        >
            <div
                className={`macro-segment flex h-full w-full min-w-0 items-center justify-center rounded-lg px-1 text-[11px] font-semibold ${segment.color}`}
                aria-label={`${segment.label} ${segment.roundedPercent}%`}
            >
                <span className="macro-segment-label-full truncate" aria-hidden="true">
                    {segment.label} {segment.roundedPercent}%
                </span>
                <span className="macro-segment-label-medium truncate" aria-hidden="true">
                    {segment.shortLabel} {segment.roundedPercent}%
                </span>
                <span className="macro-segment-label-percent truncate" aria-hidden="true">
                    {segment.roundedPercent}%
                </span>
            </div>
        </div>
    );
}

// Tooltip width is fixed (`w-36` below) so the viewport-edge clamp in
// `updatePosition` can reason about it before the portaled node has ever
// been measured.
const TOOLTIP_WIDTH_PX = 144;
const VIEWPORT_EDGE_PADDING_PX = 8;

export function MacroLegendInfo({ segments }: { segments: MacroSegment[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [position, setPosition] = useState({ top: -9999, left: -9999 });
    const tooltipId = useId();
    const containerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const supportsHoverRef = useRef(false);

    useEffect(() => {
        setIsMounted(true);
        supportsHoverRef.current = window.matchMedia(
            "(hover: hover) and (pointer: fine)",
        ).matches;
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    // The tooltip used to be an absolutely-positioned child of the trigger,
    // which put it inside the surrounding card's own stacking context and
    // clipping box — any `overflow-hidden` ancestor (the Selected
    // Ingredients card in the View Build modal) cut it off, and no z-index
    // could fix that since overflow clipping wins regardless of stacking
    // order. Portaling it to `document.body` and positioning it with
    // `position: fixed` from the trigger's real viewport coordinates
    // sidesteps both problems: it can't be clipped by an ancestor it's no
    // longer inside, and a high z-index (see className below) reliably puts
    // it above the modal itself. Recomputed on open/scroll/resize so it
    // tracks the trigger; flips above the icon when there isn't enough room
    // below, and clamps horizontally so it never runs off-screen.
    useLayoutEffect(() => {
        if (!isOpen) return;

        const trigger = containerRef.current;
        if (!trigger) return;

        const updatePosition = () => {
            const triggerRect = trigger.getBoundingClientRect();
            const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height ?? 0;

            const left = Math.min(
                Math.max(triggerRect.left, VIEWPORT_EDGE_PADDING_PX),
                window.innerWidth - TOOLTIP_WIDTH_PX - VIEWPORT_EDGE_PADDING_PX,
            );

            const spaceBelow = window.innerHeight - triggerRect.bottom;
            const opensAbove =
                spaceBelow < tooltipHeight + VIEWPORT_EDGE_PADDING_PX + 8 &&
                triggerRect.top > tooltipHeight + VIEWPORT_EDGE_PADDING_PX + 8;
            const top = opensAbove
                ? triggerRect.top - tooltipHeight - 8
                : triggerRect.bottom + 8;

            setPosition({ top, left });
        };

        updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [isOpen]);

    const tooltip = (
        <div
            ref={tooltipRef}
            role="tooltip"
            id={tooltipId}
            style={{ top: position.top, left: position.left }}
            className={`pointer-events-none fixed z-[250] w-36 rounded-lg bg-neutral-900 px-3 py-2 text-white shadow-lg transition-opacity duration-150 ${
                isOpen ? "opacity-100" : "opacity-0"
            }`}
        >
            <ul className="space-y-1">
                {segments.map((segment) => (
                    <li
                        key={segment.label}
                        className="flex items-center justify-between gap-3 text-[11px] leading-snug font-medium"
                    >
                        <span className="flex items-center gap-1.5">
                            <span
                                aria-hidden="true"
                                className={`h-2 w-2 shrink-0 rounded-full ${segment.color}`}
                            />
                            {segment.label}
                        </span>
                        <span>{segment.roundedPercent}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <span ref={containerRef} className="relative inline-flex">
            <button
                type="button"
                aria-label="Macro split breakdown"
                aria-describedby={tooltipId}
                aria-expanded={isOpen}
                onMouseEnter={() => {
                    if (supportsHoverRef.current) setIsOpen(true);
                }}
                onMouseLeave={() => {
                    if (supportsHoverRef.current) setIsOpen(false);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setIsOpen(false)}
                onClick={() => setIsOpen(true)}
                className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[#16a34a] transition hover:text-[#128a3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50"
            >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {isMounted ? createPortal(tooltip, document.body) : null}
        </span>
    );
}

export default function MacroSplitChart({
    segments,
}: {
    segments: MacroSegment[];
}) {
    // Zero-percent macros are dropped from the bar itself (not just given no
    // width) so they can't leave a visible sliver or eat into the flex gap
    // between the real segments — a single remaining segment then renders as
    // the only flex child, so it naturally fills the bar edge-to-edge with
    // its own rounded corners intact instead of getting clipped by the
    // container's overflow-hidden. Labels/tooltip still see every macro via
    // the untouched `segments` prop.
    const visibleSegments = segments.filter((segment) => segment.percent > 0);

    return (
        <div className="flex h-12 w-full gap-1.5 overflow-hidden rounded-xl border border-black/10 bg-neutral-100 p-1.5">
            {visibleSegments.map((segment) => (
                <MacroSegmentBar key={segment.label} segment={segment} />
            ))}
        </div>
    );
}

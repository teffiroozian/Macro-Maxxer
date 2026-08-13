"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

export type MacroSegment = {
    label: string;
    shortLabel: string;
    percent: number;
    roundedPercent: number;
    color: string;
    inBarLabel: string;
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
    ].map((segment) => {
        const roundedPercent = Math.round(segment.percent);
        const inBarLabel =
            segment.percent >= 20
                ? `${segment.label} ${roundedPercent}%`
                : segment.percent >= 12
                  ? `${segment.shortLabel} ${roundedPercent}%`
                  : "";

        return { ...segment, roundedPercent, inBarLabel };
    });
}

function MacroSegmentBar({ segment }: { segment: MacroSegment }) {
    return (
        <div
            className="relative min-w-0"
            style={{ width: `${segment.percent}%` }}
        >
            <div
                className={`flex h-full w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg px-1 text-[11px] font-semibold ${segment.color}`}
            >
                {segment.inBarLabel}
            </div>
        </div>
    );
}

export function MacroLegendInfo({ segments }: { segments: MacroSegment[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipId = useId();
    const containerRef = useRef<HTMLSpanElement>(null);
    const supportsHoverRef = useRef(false);

    useEffect(() => {
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
            <div
                role="tooltip"
                id={tooltipId}
                className={`pointer-events-none absolute top-full left-0 z-20 mt-2 w-36 rounded-lg bg-neutral-900 px-3 py-2 text-white shadow-lg transition-opacity duration-150 ${
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
        </span>
    );
}

export default function MacroSplitChart({
    segments,
}: {
    segments: MacroSegment[];
}) {
    return (
        <div className="flex h-12 w-full gap-1.5 overflow-hidden rounded-xl border border-black/10 bg-neutral-100 p-1.5">
            {segments.map((segment) => (
                <MacroSegmentBar key={segment.label} segment={segment} />
            ))}
        </div>
    );
}

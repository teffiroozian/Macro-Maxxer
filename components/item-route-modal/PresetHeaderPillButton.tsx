"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Single canonical pill button for the preset modal's Overview/Customize
// contextual action ("Customize", "Back to Overview", "Save Changes") — used
// identically in the section header, the sticky collapsed header, and (for
// the soft tone) nowhere else, so all three surfaces stay visually locked
// together instead of drifting into separate pill/radius/height treatments.
export default function PresetHeaderPillButton({
    icon: Icon,
    children,
    onClick,
    tabIndex,
    tone = "soft",
    className = "",
}: {
    icon?: LucideIcon;
    children: ReactNode;
    onClick: () => void;
    tabIndex?: number;
    tone?: "soft" | "solid";
    className?: string;
}) {
    return (
        <button
            type="button"
            tabIndex={tabIndex}
            onClick={onClick}
            className={`cursor-pointer inline-flex h-10 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition sm:gap-1.5 sm:px-4 ${
                tone === "solid"
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "border border-black/15 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            } ${className}`.trim()}
        >
            {Icon ? <Icon className="h-4 w-4" strokeWidth={2.5} /> : null}
            {children}
        </button>
    );
}

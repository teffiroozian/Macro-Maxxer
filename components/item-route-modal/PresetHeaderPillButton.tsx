"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Single canonical pill button for the preset modal's Overview/Customize
// contextual action ("Customize", "Back to Overview", "Save Changes") — used
// identically in the section header, the sticky collapsed header, and (for
// the soft tone) nowhere else, so all three surfaces stay visually locked
// together instead of drifting into separate pill/radius/height treatments.
// Deliberately has no default width/shrink behavior of its own — its only
// caller, the item-route modal's sticky footer, needs each button to size
// differently by breakpoint (equal-width grid column on mobile, natural
// content width on larger screens), so width is entirely the caller's call
// via className. `justify-center` keeps the label centered whichever width
// it ends up at, and `min-h-10` (rather than a fixed `h-10`) with wrapping
// allowed lets the longest label ("Back to Overview") grow to a second line
// on the narrowest phones instead of overflowing its equal-width column,
// while every width this actually ships at today still renders on one line.
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
            className={`cursor-pointer inline-flex min-h-10 items-center justify-center gap-1 rounded-full px-3 text-center text-sm font-semibold transition sm:gap-1.5 sm:px-4 ${
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

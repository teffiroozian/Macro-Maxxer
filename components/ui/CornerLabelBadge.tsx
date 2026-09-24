import type { ReactNode } from "react";

export type CornerLabelBadgeTone = "accent" | "violet";

const toneClassNames: Record<CornerLabelBadgeTone, string> = {
  accent: "bg-accent-strong",
  violet: "bg-violet-700",
};

// Canonical compact corner-overlay badge (Design System PDF "Badge"): a
// small all-caps pill meant to sit in a card image's corner. Previously
// duplicated verbatim (down to the exact class list) between
// StatusLabelBadge and ComparativeLabelBadge, differing only in fill color —
// those now wrap this instead of re-authoring the geometry.
export default function CornerLabelBadge({ tone, children }: { tone: CornerLabelBadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-5 w-fit items-center whitespace-nowrap rounded-full px-2.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm ${toneClassNames[tone]}`}
    >
      {children}
    </span>
  );
}

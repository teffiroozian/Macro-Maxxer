import type { ComparativeLabelKind } from "@/lib/menuSections/comparativeLabels";

// Styled after the homepage hero card's tag pill (components/home/ProductPreviewCard.tsx):
// no icon, all-caps, white text on the app's primary accent green so a page
// of cards never reads as color-coded noise. Sized to sit as a compact
// overlay in the image panel's corner rather than in the content column.
const labelText: Record<ComparativeLabelKind, string> = {
  "highest-protein": "Highest Protein",
  "best-protein-score": "Best Protein Score",
  "lowest-calorie": "Lowest Calorie",
};

export default function ComparativeLabelBadge({ kind }: { kind: ComparativeLabelKind }) {
  return (
    <span className="inline-flex h-5 w-fit items-center whitespace-nowrap rounded-full bg-accent-strong px-2.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
      {labelText[kind]}
    </span>
  );
}

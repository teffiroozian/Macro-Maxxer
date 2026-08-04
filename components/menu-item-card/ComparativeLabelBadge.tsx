import type { ComparativeLabelKind } from "@/lib/menuSections/comparativeLabels";

// Styled after the homepage hero card's tag pill (components/home/ProductPreviewCard.tsx):
// no icon, all-caps, white text on the app's primary accent green so a page
// of cards never reads as color-coded noise.
const labelText: Record<ComparativeLabelKind, string> = {
  "highest-protein": "Highest Protein",
  "best-protein-score": "Best Protein Score",
  "lowest-calorie": "Lowest Calorie",
};

export default function ComparativeLabelBadge({ kind }: { kind: ComparativeLabelKind }) {
  return (
    <span className="inline-flex h-7 w-fit items-center whitespace-nowrap rounded-full bg-accent-strong px-5 text-xs font-bold uppercase tracking-wider text-white">
      {labelText[kind]}
    </span>
  );
}

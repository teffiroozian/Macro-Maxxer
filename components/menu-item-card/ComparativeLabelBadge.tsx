import type { ComparativeLabelKind } from "@/lib/menuSections/comparativeLabels";
import CornerLabelBadge from "@/components/ui/CornerLabelBadge";

// Styled after the homepage hero card's tag pill (components/home/ProductPreviewCard.tsx):
// no icon, all-caps, white text with the metric-specific score tone. Sized to sit as a compact
// overlay in the image panel's corner rather than in the content column.
const labelText: Record<ComparativeLabelKind, string> = {
  "highest-protein": "Highest Protein",
  "best-protein-score": "Best Protein Score",
  "lowest-calorie": "Lowest Calorie",
};

export default function ComparativeLabelBadge({ kind }: { kind: ComparativeLabelKind }) {
  return <CornerLabelBadge tone={kind === "best-protein-score" ? "protein-score" : "accent"}>{labelText[kind]}</CornerLabelBadge>;
}

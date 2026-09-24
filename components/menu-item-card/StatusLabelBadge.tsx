import type { MenuItemStatus } from "@/types/menu";
import CornerLabelBadge from "@/components/ui/CornerLabelBadge";

// Same geometry as ComparativeLabelBadge, kept to a distinct purple fill
// (matching the comparative green's saturation/lightness tier) so the two
// systems stay distinguishable when shown side by side. Sized to sit as a
// compact overlay in the image panel's corner rather than in the content column.
const labelText: Record<MenuItemStatus, string> = {
  new: "New",
  "limited-time": "Limited Time",
  seasonal: "Seasonal",
  returning: "Returning",
};

export default function StatusLabelBadge({ status }: { status: MenuItemStatus }) {
  return <CornerLabelBadge tone="violet">{labelText[status]}</CornerLabelBadge>;
}

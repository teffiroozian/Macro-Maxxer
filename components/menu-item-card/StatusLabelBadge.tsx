import type { MenuItemStatus } from "@/types/menu";

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
  return (
    <span className="inline-flex h-5 w-fit items-center whitespace-nowrap rounded-full bg-violet-700 px-2.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
      {labelText[status]}
    </span>
  );
}

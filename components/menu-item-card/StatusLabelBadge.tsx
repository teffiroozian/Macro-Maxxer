import type { MenuItemStatus } from "@/types/menu";

// Same geometry as ComparativeLabelBadge, kept to a distinct purple fill
// (matching the comparative green's saturation/lightness tier) so the two
// systems stay distinguishable when shown side by side.
const labelText: Record<MenuItemStatus, string> = {
  new: "New",
  "limited-time": "Limited Time",
  seasonal: "Seasonal",
  returning: "Returning",
};

export default function StatusLabelBadge({ status }: { status: MenuItemStatus }) {
  return (
    <span className="inline-flex h-7 w-fit items-center whitespace-nowrap rounded-full bg-violet-700 px-3 text-xs font-bold uppercase tracking-wider text-white">
      {labelText[status]}
    </span>
  );
}

import { AlignLeft, ArrowDown, ArrowUp, ArrowUpNarrowWide, LayoutGrid, Rows3, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { card } from "@/components/native/saved/savedStyles";
import { getRankState, isDefaultOrderSort, type SortOption } from "@/lib/menuSections/sortOptions";
import { METRIC_LABELS } from "@/lib/native/restaurantMenu";
import type { MenuLayout } from "./MenuDisplaySheet";

export type MenuSheetKind = "menu" | "rank" | "nutrition" | "display";

// Only the words change when something is chosen; nothing is tinted.
export default function MenuToolbar({ menuName, sort, filterCount, layout, onOpen }: {
  menuName: string;
  sort: SortOption;
  filterCount: number;
  layout: MenuLayout;
  onOpen: (kind: MenuSheetKind) => void;
}) {
  const ranked = !isDefaultOrderSort(sort);
  const { metric, direction } = getRankState(sort);
  const rankName = ranked ? METRIC_LABELS[metric] : "Menu order";
  const Arrow = direction === "highest" ? ArrowDown : ArrowUp;
  const LayoutIcon = layout === "grid" ? Rows3 : LayoutGrid;
  const item = (kind: MenuSheetKind, Icon: LucideIcon, text: string, label: string, arrow = false) => (
    <button type="button" aria-haspopup="dialog" aria-label={label} onClick={() => onOpen(kind)} className="flex h-[58px] min-w-0 flex-auto cursor-pointer flex-col items-center justify-center gap-1 px-2 active:opacity-60 focus-ring">
      <Icon size={17} strokeWidth={2.2} className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <span className="flex max-w-full items-center gap-[3px] text-[13.5px] font-semibold leading-[17px]">
        <span className="truncate">{text}</span>
        {arrow ? <Arrow size={13} strokeWidth={2.8} className="shrink-0" aria-hidden="true" /> : null}
      </span>
    </button>
  );
  const divider = <span aria-hidden="true" className="h-[30px] w-px shrink-0 bg-slate-200 dark:bg-divider" />;
  return (
    <div role="toolbar" aria-label="Menu controls" className="flex items-center gap-1 pb-2.5 pl-[18px] pr-2 pt-1">
      <div className={`flex min-w-0 flex-1 items-center rounded-[20px] ${card}`}>
        {item("menu", AlignLeft, menuName, `Menu, ${menuName}`)}
        {divider}
        {item("rank", ArrowUpNarrowWide, rankName, `Rank by, ${ranked ? `${rankName}, ${direction} first` : rankName}`, ranked)}
        {divider}
        {item("nutrition", SlidersHorizontal, filterCount ? `Filters ${filterCount}` : "Filters", filterCount ? `Nutrition filters, ${filterCount} active` : "Nutrition filters")}
      </div>
      <button type="button" aria-haspopup="dialog" aria-label={`Display options, showing as ${layout}`} onClick={() => onOpen("display")} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 active:bg-slate-200/70 dark:text-slate-300 dark:active:bg-surface-hover focus-ring">
        <LayoutIcon size={21} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}

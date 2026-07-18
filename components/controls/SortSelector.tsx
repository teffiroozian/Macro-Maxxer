import type { RefObject } from "react";
import { type LucideIcon } from "lucide-react";

import type { SortOption } from "@/components/ControlsRow";
import SelectorShell from "@/components/controls/SelectorShell";

type SortSelectorOption = {
  label: string;
  value: SortOption;
  icon: LucideIcon;
};

type SortSelectorProps = {
  options: SortSelectorOption[];
  value: SortOption;
  currentOption: SortSelectorOption;
  isOpen: boolean;
  hoveredOption: SortOption | null;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onSelect: (sort: SortOption) => void;
  onHover: (sort: SortOption | null) => void;
  onClose?: () => void;
};

export default function SortSelector({
  options,
  value,
  currentOption,
  isOpen,
  hoveredOption,
  menuRef,
  onToggleOpen,
  onSelect,
  onHover,
  onClose = () => undefined,
}: SortSelectorProps) {
  return (
    <SelectorShell
      options={options}
      value={value}
      currentOption={currentOption}
      isOpen={isOpen}
      hoveredOption={hoveredOption}
      menuRef={menuRef}
      align="right"
      onToggleOpen={onToggleOpen}
      onClose={onClose}
      onSelect={onSelect}
      onHover={onHover}
    />
  );
}

import type { RefObject } from "react";
import { type LucideIcon } from "lucide-react";

import type { ViewOption } from "@/components/ControlsRow";
import SelectorShell from "@/components/controls/SelectorShell";

type ViewSelectorOption = {
  label: string;
  value: ViewOption;
  icon: LucideIcon;
  description?: string;
};

type ViewSelectorProps = {
  options: ViewSelectorOption[];
  value: ViewOption;
  currentOption: ViewSelectorOption;
  isOpen: boolean;
  hoveredOption: ViewOption | null;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onSelect: (view: ViewOption) => void;
  onHover: (view: ViewOption | null) => void;
  onClose?: () => void;
};

export default function ViewSelector({
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
}: ViewSelectorProps) {
  return (
    <SelectorShell
      options={options}
      value={value}
      currentOption={currentOption}
      isOpen={isOpen}
      hoveredOption={hoveredOption}
      menuRef={menuRef}
      align="left"
      onToggleOpen={onToggleOpen}
      onClose={onClose}
      onSelect={onSelect}
      onHover={onHover}
    />
  );
}

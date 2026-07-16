import type { RefObject } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import type { SortOption } from "@/components/ControlsRow";

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
}: SortSelectorProps) {
  const CurrentIcon = currentOption.icon;

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="cursor-pointer inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[8px] text-sm font-semibold text-black/85"
      >
        <CurrentIcon className="h-4 w-4" strokeWidth={2.2} />
        {currentOption.label}
        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
      </button>

      {isOpen ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-20 w-[min(220px,calc(100vw-2rem))] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
          <div className="grid gap-1">
            {options.map((option) => {
              const isActive = option.value === value;
              const isHovered = option.value === hoveredOption;
              const Icon = option.icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  onMouseEnter={() => onHover(option.value)}
                  onMouseLeave={() => onHover(null)}
                  className={`cursor-pointer inline-flex items-center gap-2 rounded-[10px] border-none px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 ${
                    isActive ? "bg-black/10" : isHovered ? "bg-slate-900/5" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import type { RefObject } from "react";
import { useEffect } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

import { pillTriggerClassName } from "@/components/controls/pillButton";

type SelectorShellOption<TValue extends string> = {
  label: string;
  value: TValue;
  icon: LucideIcon;
};

type SelectorShellProps<TValue extends string> = {
  options: SelectorShellOption<TValue>[];
  value: TValue;
  currentOption: SelectorShellOption<TValue>;
  isOpen: boolean;
  hoveredOption: TValue | null;
  menuRef: RefObject<HTMLDivElement | null>;
  align?: "left" | "right";
  // e.g. "Sort by" — rendered ahead of the current value on wide desktop
  // widths only, so the trigger reads as "Sort by: Highest Protein" there
  // but collapses back to just the value once space gets tight.
  valuePrefix?: string;
  onToggleOpen: () => void;
  onClose: () => void;
  onSelect: (value: TValue) => void;
  onHover: (value: TValue | null) => void;
};

export default function SelectorShell<TValue extends string>({
  options,
  value,
  currentOption,
  isOpen,
  hoveredOption,
  menuRef,
  align = "left",
  valuePrefix,
  onToggleOpen,
  onClose,
  onSelect,
  onHover,
}: SelectorShellProps<TValue>) {
  const CurrentIcon = currentOption.icon;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!menuRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, menuRef, onClose]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={pillTriggerClassName({ className: isOpen ? "border-slate-400 shadow-sm" : "" })}
      >
        <CurrentIcon className="h-4 w-4 shrink-0" strokeWidth={2.3} />
        <span className="min-w-0 truncate">
          {valuePrefix ? (
            <span className="hidden font-medium text-slate-500 xl:inline">{valuePrefix}: </span>
          ) : null}
          {currentOption.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>

      {/* Always mounted (not `isOpen ? … : null`) so the open/close fade +
          scale can actually transition both ways instead of popping in with
          no prior frame — matches MobileNavDrawer's approach. `tabIndex={-1}`
          on the rows while closed keeps keyboard users from tabbing into a
          menu they can't see, since `pointer-events-none` alone doesn't
          remove elements from the tab order. */}
      <div
        role="menu"
        aria-hidden={!isOpen}
        className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+8px)] z-20 w-[min(230px,calc(100vw-2rem))] origin-top rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_16px_32px_rgba(15,23,42,0.14)] transition-all duration-150 ease-out ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <div className="grid gap-0.5">
          {options.map((option) => {
            const isActive = option.value === value;
            const isHovered = option.value === hoveredOption;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                tabIndex={isOpen ? 0 : -1}
                onClick={() => onSelect(option.value)}
                onMouseEnter={() => onHover(option.value)}
                onMouseLeave={() => onHover(null)}
                className={`flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  isActive
                    ? "bg-accent-soft text-accent-strong"
                    : isHovered
                      ? "bg-slate-100 text-slate-800"
                      : "bg-transparent text-slate-700"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-accent-strong" : "text-slate-400"}`}
                  strokeWidth={2.3}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isActive ? <Check className="h-4 w-4 shrink-0 text-accent-strong" strokeWidth={2.6} /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import type { RefObject } from "react";
import { useEffect } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

type SelectorShellOption<TValue extends string> = {
  label: string;
  value: TValue;
  icon: LucideIcon;
  description?: string;
};

type SelectorShellProps<TValue extends string> = {
  options: SelectorShellOption<TValue>[];
  value: TValue;
  currentOption: SelectorShellOption<TValue>;
  isOpen: boolean;
  hoveredOption: TValue | null;
  menuRef: RefObject<HTMLDivElement | null>;
  align?: "left" | "right";
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
        className="cursor-pointer inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[8px] text-sm font-semibold text-black/85"
      >
        <CurrentIcon className="h-4 w-4" strokeWidth={2.2} />
        {currentOption.label}
        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+8px)] z-20 w-[min(220px,calc(100vw-2rem))] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]`}
        >
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
                  <span>
                    <span>{option.label}</span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs font-medium text-black/55">{option.description}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

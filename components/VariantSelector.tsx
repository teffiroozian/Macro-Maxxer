import type { ItemVariant } from "@/types/menu";

type VariantSelectorProps = {
  variants: ItemVariant[];
  selectedId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  // Compact secondary styling (light background, thin border, small text)
  // for contexts like search results where the selector sits next to a
  // filled primary action (Quick Add) and shouldn't visually compete with
  // it. Default (false) preserves the existing solid black pill used
  // everywhere else (MenuItemCard, item detail panel, etc).
  compact?: boolean;
};

export default function VariantSelector({
  variants,
  selectedId,
  onChange,
  ariaLabel = "Select portion",
  disabled = false,
  compact = false,
}: VariantSelectorProps) {
  const className = compact
    ? `w-fit appearance-none rounded-full border border-neutral-300 bg-white py-1 pr-6 pl-2.5 text-xs font-semibold text-neutral-700 [field-sizing:content] [background-image:linear-gradient(45deg,transparent_50%,#6b7280_50%),linear-gradient(135deg,#6b7280_50%,transparent_50%),linear-gradient(to_right,transparent,transparent)] [background-position:calc(100%-12px)_55%,calc(100%-7.5px)_55%,100%_0] [background-size:4px_4px,4px_4px,2em_2em] bg-no-repeat focus:outline focus:outline-1 focus:outline-black/20 focus:outline-offset-2 ${disabled ? "cursor-not-allowed opacity-85" : "cursor-pointer"}`
    : `w-fit appearance-none rounded-full bg-[#121212] py-[2px] pr-6 pl-4 text-base font-bold text-white [field-sizing:content] [background-image:linear-gradient(45deg,transparent_50%,#ffffff_50%),linear-gradient(135deg,#ffffff_50%,transparent_50%),linear-gradient(to_right,transparent,transparent)] [background-position:calc(100%-15px)_55%,calc(100%-10px)_55%,100%_0] [background-size:5px_5px,5px_5px,2.5em_2.5em] bg-no-repeat focus:outline focus:outline-1 focus:outline-black/20 focus:outline-offset-2 ${disabled ? "cursor-not-allowed opacity-85" : "cursor-pointer"}`;

  return (
    <span className="inline-flex w-fit items-center gap-2">
      <label className="inline-flex w-fit items-center">
        <span className="sr-only">{ariaLabel}</span>
        <select
          className={className}
          value={selectedId}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
      </label>
    </span>
  );
}

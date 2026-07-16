import type { ItemVariant } from "@/types/menu";
import VariantSelector from "../VariantSelector";

export default function MenuItemVariantControls({
  itemName,
  variants,
  selectedVariantId,
  selectedVariantLabel,
  hasVariantDropdown,
  disabled,
  onChange,
}: {
  itemName: string;
  variants: ItemVariant[];
  selectedVariantId: string;
  selectedVariantLabel?: string;
  hasVariantDropdown: boolean;
  disabled: boolean;
  onChange: (nextVariantId: string) => void;
}) {
  return (
    <div
      className="inline-flex items-center"
      onClick={hasVariantDropdown ? (event) => event.stopPropagation() : undefined}
      onKeyDown={hasVariantDropdown ? (event) => event.stopPropagation() : undefined}
    >
      <div className="mx-[10px] h-5 w-0.5 rounded-full bg-black/50" />
      {hasVariantDropdown ? (
        <VariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          disabled={disabled}
          onChange={onChange}
          ariaLabel={`${itemName} portion size`}
        />
      ) : (
        <span className="rounded-full bg-[#121212] px-4 py-0.5 text-base font-bold text-white">
          {selectedVariantLabel ?? variants[0]?.label}
        </span>
      )}
    </div>
  );
}

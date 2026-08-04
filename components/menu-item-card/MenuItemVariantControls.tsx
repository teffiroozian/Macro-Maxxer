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
      {hasVariantDropdown ? (
        <VariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          disabled={disabled}
          onChange={onChange}
          ariaLabel={`${itemName} portion size`}
          compact
        />
      ) : (
        <span className="rounded-full border border-neutral-300 bg-white px-3 py-0.5 text-xs font-semibold text-neutral-700">
          {selectedVariantLabel ?? variants[0]?.label}
        </span>
      )}
    </div>
  );
}

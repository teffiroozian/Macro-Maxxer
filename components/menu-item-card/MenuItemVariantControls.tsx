import { getDisplayVariantLabel } from "@/lib/menuItemCard/titlePresentation";
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
  const visibleLabel = getDisplayVariantLabel(selectedVariantLabel ?? variants[0]?.label);
  if (!hasVariantDropdown && !visibleLabel) return null;
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
        <span className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs font-semibold text-slate-700">
          {visibleLabel}
        </span>
      )}
    </div>
  );
}

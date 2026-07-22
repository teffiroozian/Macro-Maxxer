import { Pencil, Trash2 } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import SurfaceCard from "@/components/ui/SurfaceCard";
import QuantityStepper from "@/components/QuantityStepper";
import CartItemPreviewRow from "@/components/cart/CartItemPreviewRow";
import CartItemDetailsPanel from "@/components/cart/CartItemDetailsPanel";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import type { CartItem } from "@/types/cart";

type CartItemsSectionProps = {
  items: CartItem[];
  expandedItemId: string | null;
  loadingEditItemId: string | null;
  onToggleExpandedItem: (cartItemId: string) => void;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onEditItem: (cartItem: CartItem) => void;
};

export default function CartItemsSection({
  items,
  expandedItemId,
  loadingEditItemId,
  onToggleExpandedItem,
  onUpdateQuantity,
  onEditItem,
}: CartItemsSectionProps) {
  return (
    <ul className="grid gap-3">
      {items.map((cartItem) => {
        const detailLine = summarizeItem(cartItem);
        const displayItem = { ...cartItem, name: formatCartItemName(cartItem) };
        const canCustomize = cartItem.selection.type !== "build-your-own";
        return (
          <SurfaceCard as="li" key={cartItem.id} padding="default" className="transition hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
            <div
              role="button"
              tabIndex={0}
              className="w-full cursor-pointer text-left"
              onClick={() => onToggleExpandedItem(cartItem.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onToggleExpandedItem(cartItem.id); }}
              aria-expanded={expandedItemId === cartItem.id}
            >
              <CartItemPreviewRow
                item={displayItem}
                imageRenderer="native-img"
                imageFallback="initial"
                macroStyle="detailed"
                customizationsText={detailLine}
                customizationsLineClamp={2}
                actions={
                  <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    {canCustomize ? (
                      <AppButton
                        variant="pill"
                        size="sm"
                        aria-label={`Customize ${cartItem.name}`}
                        title="Customize"
                        onClick={(event) => { event.stopPropagation(); onEditItem(cartItem); }}
                        disabled={loadingEditItemId === cartItem.id}
                        className="h-10 w-10 px-0 py-0 disabled:cursor-wait"
                      >
                        {loadingEditItemId === cartItem.id ? <span className="text-[10px]">...</span> : <Pencil className="h-5 w-5" strokeWidth={2.5} />}
                      </AppButton>
                    ) : null}
                    <QuantityStepper
                      value={cartItem.quantity}
                      onDecrement={() => onUpdateQuantity(cartItem.id, cartItem.quantity - 1)}
                      onIncrement={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                      decrementLabel={cartItem.quantity === 1 ? `Remove ${cartItem.name} from cart` : `Decrease quantity of ${cartItem.name}`}
                      incrementLabel={`Increase quantity of ${cartItem.name}`}
                      decrementContent={cartItem.quantity === 1 ? <Trash2 className="h-4 w-4" strokeWidth={2.5} /> : undefined}
                    />
                  </div>
                }
              />
            </div>
            {expandedItemId === cartItem.id ? <CartItemDetailsPanel cartItem={cartItem} detailLine={detailLine} /> : null}
          </SurfaceCard>
        );
      })}
    </ul>
  );
}

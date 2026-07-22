import MacroStat from "@/components/nutrition/MacroStat";
import { getCartCustomizationItemId, resolveCartItemDetails } from "@/lib/cart/cartItemLookup";
import type { CartCustomization, CartItem } from "@/types/cart";
import type { CartDetailMenuItem } from "@/lib/cart/cartItemLookup";

function getDetailTitle(customization: CartCustomization) {
  if (customization.comboRole === "side") return "Side";
  if (customization.comboRole === "drink") return "Drink";
  if (customization.kind === "ingredient") return "Customization";
  return "Selection";
}

function getDetailLabel(customization: CartCustomization) {
  return customization.itemLabel ?? customization.ingredientLabel ?? customization.toIngredientLabel ?? customization.fromIngredientLabel ?? "Custom item";
}

function CartItemDetailCard({ detailItem, title, label }: { detailItem: CartDetailMenuItem | null; title: string; label: string }) {
  const nutrition = detailItem?.nutrition;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {detailItem?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detailItem.image} alt={label} className="h-full w-full object-contain p-1" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{label.charAt(0)}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        {nutrition ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <MacroStat macroKey="calories" labelVariant="shortLabel" value={nutrition.calories} size="cartCompact" />
            <MacroStat macroKey="protein" labelVariant="shortLabel" value={nutrition.protein} size="cartCompact" />
            <MacroStat macroKey="carbs" labelVariant="shortLabel" value={nutrition.carbs} size="cartCompact" />
            <MacroStat macroKey="totalFat" labelVariant="shortLabel" value={nutrition.totalFat} size="cartCompact" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CartItemDetailsPanel({ cartItem, detailLine }: { cartItem: CartItem; detailLine: string }) {
  const visibleCustomizations = (cartItem.customizations ?? []).filter((customization) => !(
    customization.kind === "combo" && customization.comboRole === "meal"
  ));
  const fallbackLabels = detailLine ? detailLine.split(" • ").filter(Boolean) : [];

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-bold text-slate-900">Item details</p>
        <p className="text-xs font-semibold text-slate-500">Tap card to collapse</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {visibleCustomizations.length > 0 ? (
          visibleCustomizations.map((customization, index) => (
            <CartItemDetailCard
              key={`${customization.comboRole ?? customization.action}-${getCartCustomizationItemId(customization) ?? index}`}
              title={getDetailTitle(customization)}
              label={getDetailLabel(customization)}
              detailItem={resolveCartItemDetails(cartItem, customization).item}
            />
          ))
        ) : fallbackLabels.length > 0 ? (
          fallbackLabels.map((label) => (
            <CartItemDetailCard key={label} title="Selection" label={label} detailItem={null} />
          ))
        ) : (
          <p className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-600">No customizations selected.</p>
        )}
      </div>
    </div>
  );
}

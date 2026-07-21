import Image from "next/image";
import { ReactNode } from "react";
import { getCartItemCoreMacros } from "@/lib/cart/itemAccessors";
import MacroStat from "@/components/nutrition/MacroStat";
import type { CartItem } from "@/types/cart";

type CartItemPreviewRowProps = {
  item: Pick<CartItem, "name" | "image" | "macrosPerItem" | "nutritionPerItem" | "quantity">;
  macroStyle?: "compact" | "detailed";
  customizationsText?: string;
  customizationsLineClamp?: 1 | 2;
  imageFallback?: "initial" | "placeholder" | "none";
  imageRenderer?: "next-image" | "native-img";
  actions?: ReactNode;
  className?: string;
};


export default function CartItemPreviewRow({
  item,
  macroStyle = "compact",
  customizationsText,
  customizationsLineClamp = 1,
  imageFallback = "initial",
  imageRenderer = "next-image",
  actions,
  className,
}: CartItemPreviewRowProps) {
  const itemInitial = (item.name?.trim().charAt(0) || "+").toUpperCase();
  const quantityMultiplier = Math.max(item.quantity ?? 1, 1);
  const coreMacros = getCartItemCoreMacros(item);
  const displayCalories = coreMacros.calories * quantityMultiplier;
  const displayProtein = coreMacros.protein * quantityMultiplier;
  const displayCarbs = coreMacros.carbs * quantityMultiplier;
  const displayFat = coreMacros.totalFat * quantityMultiplier;
  const customizationClampClass =
    customizationsLineClamp === 2 ? "line-clamp-2" : "line-clamp-1";

  return (
    <div className={["flex min-w-0 w-full items-start gap-3", className].filter(Boolean).join(" ")}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
        {item.image ? (
          imageRenderer === "next-image" ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="h-full w-full object-contain p-1"
              sizes="56px"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-contain p-1"
            />
          )
        ) : imageFallback === "placeholder" ? (
          <div className="h-full w-full bg-slate-200" aria-hidden="true" />
        ) : imageFallback === "initial" ? (
          <div className="inline-flex h-full w-full items-center justify-center text-base font-semibold text-slate-600">
            {itemInitial}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight text-slate-900">
          <span>{item.name}</span>
        </p>

        {macroStyle === "compact" ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-none">
            <MacroStat macroKey="calories" labelVariant="shortLabel" value={displayCalories} size="cartCompact" />
            <MacroStat macroKey="protein" labelVariant="shortLabel" value={displayProtein} size="cartCompact" />
            <MacroStat macroKey="carbs" labelVariant="shortLabel" value={displayCarbs} size="cartCompact" />
            <MacroStat macroKey="totalFat" labelVariant="shortLabel" value={displayFat} size="cartCompact" />
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-none">
            <MacroStat macroKey="calories" labelVariant="shortLabel" value={displayCalories} size="cartDetailed" />
            <MacroStat macroKey="protein" labelVariant="lowercase" value={displayProtein} size="cartDetailed" />
            <MacroStat macroKey="carbs" labelVariant="lowercase" value={displayCarbs} size="cartDetailed" />
            <MacroStat macroKey="totalFat" labelVariant="lowercase" value={displayFat} size="cartDetailed" />
          </div>
        )}

        {customizationsText ? (
          <p className={`mt-1.5 text-xs text-slate-500 ${customizationClampClass}`}>
            {customizationsText}
          </p>
        ) : null}

        {actions ? <div className="mt-3 flex items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

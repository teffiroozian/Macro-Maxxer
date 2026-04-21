import Image from "next/image";
import { ReactNode } from "react";
import { CartItem } from "@/stores/cartStore";

type CartItemPreviewRowProps = {
  item: Pick<CartItem, "name" | "image" | "variantLabel" | "macrosPerItem" | "quantity">;
  variantStyle?: "inline" | "separate" | "hidden";
  macroStyle?: "compact" | "detailed";
  customizationsText?: string;
  customizationsLineClamp?: 1 | 2;
  imageFallback?: "initial" | "placeholder" | "none";
  imageRenderer?: "next-image" | "native-img";
  actions?: ReactNode;
  className?: string;
};

const macroLabelClassByStyle = {
  compact: "text-slate-500",
  detailed: "text-slate-500",
} as const;

export default function CartItemPreviewRow({
  item,
  variantStyle = "inline",
  macroStyle = "compact",
  customizationsText,
  customizationsLineClamp = 1,
  imageFallback = "initial",
  imageRenderer = "next-image",
  actions,
  className,
}: CartItemPreviewRowProps) {
  const itemInitial = (item.name?.trim().charAt(0) || "+").toUpperCase();
  const hasVariant = Boolean(item.variantLabel);
  const quantityMultiplier = Math.max(item.quantity ?? 1, 1);
  const displayCalories = item.macrosPerItem.calories * quantityMultiplier;
  const displayProtein = item.macrosPerItem.protein * quantityMultiplier;
  const displayCarbs = item.macrosPerItem.carbs * quantityMultiplier;
  const displayFat = item.macrosPerItem.totalFat * quantityMultiplier;
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
          {variantStyle === "inline" && hasVariant ? (
            <>
              <span className="mx-1.5">•</span>
              <span>{item.variantLabel}</span>
            </>
          ) : null}
        </p>

        {variantStyle === "separate" && hasVariant ? (
          <p className="mt-1 text-xs text-slate-500">{item.variantLabel}</p>
        ) : null}

        {macroStyle === "compact" ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-none">
            <p className={macroLabelClassByStyle[macroStyle]}>
              Cal:<span className="ml-1 font-semibold text-slate-900">{displayCalories}</span>
            </p>
            <p className={macroLabelClassByStyle[macroStyle]}>
              P:<span className="ml-1 font-semibold text-slate-900">{displayProtein}g</span>
            </p>
            <p className={macroLabelClassByStyle[macroStyle]}>
              C:<span className="ml-1 font-semibold text-slate-900">{displayCarbs}g</span>
            </p>
            <p className={macroLabelClassByStyle[macroStyle]}>
              F:<span className="ml-1 font-semibold text-slate-900">{displayFat}g</span>
            </p>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-none">
            <p className="whitespace-nowrap text-slate-500">
              <span className="text-base font-semibold text-slate-900">{displayCalories}</span>
              <span className="ml-1 text-xs">Cal</span>
            </p>
            <p className="whitespace-nowrap text-slate-500">
              <span className="text-base font-semibold text-[#c2410c]">{displayProtein}g</span>
              <span className="ml-1 text-xs">protein</span>
            </p>
            <p className="whitespace-nowrap text-slate-500">
              <span className="text-base font-semibold text-[#ca8a04]">{displayCarbs}g</span>
              <span className="ml-1 text-xs">carbs</span>
            </p>
            <p className="whitespace-nowrap text-slate-500">
              <span className="text-base font-semibold text-[#2563eb]">{displayFat}g</span>
              <span className="ml-1 text-xs">fat</span>
            </p>
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

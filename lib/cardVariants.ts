export type CardVariant = "default" | "interactive" | "selected";

const BASE_CARD_CLASS = "rounded-3xl border bg-white transition";

const CARD_VARIANT_CLASS: Record<CardVariant, string> = {
  default: "border-black/10 shadow-sm",
  interactive:
    "cursor-pointer border-black/15 shadow-[0_8px_22px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-black/30 hover:shadow-[0_12px_26px_rgba(0,0,0,0.12)]",
  selected: "cursor-pointer border-lime-500 bg-lime-50/30 ring-1 ring-lime-400/50 shadow-[0_6px_16px_rgba(132,204,22,0.2)]",
};

export function cardVariants(variant: CardVariant) {
  return `${BASE_CARD_CLASS} ${CARD_VARIANT_CLASS[variant]}`;
}

import type { MouseEventHandler, ReactNode } from "react";

type QuantityStepperVariant = "cart" | "cartCard" | "cartLine" | "small" | "modalPill";

type QuantityStepperProps = {
  value: ReactNode;
  onIncrement: MouseEventHandler<HTMLButtonElement>;
  onDecrement: MouseEventHandler<HTMLButtonElement>;
  incrementLabel: string;
  decrementLabel: string;
  decrementContent?: ReactNode;
  incrementDisabled?: boolean;
  decrementDisabled?: boolean;
  variant?: QuantityStepperVariant;
  className?: string;
};

const stepperStyles: Record<
  QuantityStepperVariant,
  {
    container: string;
    button: string;
    value: string;
  }
> = {
  cart: {
    container: "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1",
    button:
      "inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-slate-700 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
    value: "min-w-8 text-center text-sm font-semibold text-slate-900",
  },
  cartCard: {
    container: "inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white/90 px-2 py-1",
    button:
      "h-7 w-7 cursor-pointer rounded-lg border border-black/15 bg-white text-lg leading-none transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50",
    value: "min-w-6 text-center text-base font-bold",
  },
  // Shared light-gray cart control style — matches CartControlButton's edit
  // button (same 36px h-9 height, rounded-xl radius, border-slate-200/
  // bg-slate-50 fill) so the two controls read as one cohesive cluster. Used
  // by both the full cart page and the cart drawer's item cards so the
  // control cluster looks identical in both places. Decrementing at quantity
  // 1 swaps this stepper's own minus button for a trash icon (passed via
  // decrementContent) rather than adding a separate remove control.
  cartLine: {
    container: "inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1.5",
    button:
      "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-base font-semibold text-slate-700 transition hover:bg-white active:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
    value: "min-w-6 text-center text-sm font-semibold text-slate-900",
  },
  small: {
    container: "inline-flex items-center rounded-full border border-black/20 bg-white px-1 py-0.5",
    button:
      "inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-base font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40",
    value: "min-w-7 text-center text-sm font-bold text-slate-900",
  },
  // The item-route-modal sticky footer's stepper — Preview-state source of
  // truth is the pre-built Build Your Own preset review footer, shared here
  // so every Preview-state footer (Chipotle preset, cart item, brand-new
  // item) uses the exact same control instead of hand-rolled markup.
  modalPill: {
    container: "inline-flex h-10 shrink-0 items-center justify-center gap-0.5 rounded-full border border-black/15 bg-white px-1 sm:gap-1 sm:px-1.5",
    button:
      "cursor-pointer inline-flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40 sm:size-7",
    value: "min-w-4 text-center text-sm font-bold text-slate-900 sm:min-w-5",
  },
};

export default function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  incrementLabel,
  decrementLabel,
  decrementContent = "-",
  incrementDisabled = false,
  decrementDisabled = false,
  variant = "cart",
  className = "",
}: QuantityStepperProps) {
  const styles = stepperStyles[variant];

  return (
    <div className={`${styles.container} ${className}`.trim()}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={decrementDisabled}
        className={styles.button}
        aria-label={decrementLabel}
      >
        {decrementContent}
      </button>
      <span className={styles.value}>{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={incrementDisabled}
        className={styles.button}
        aria-label={incrementLabel}
      >
        +
      </button>
    </div>
  );
}

import type { MouseEventHandler, ReactNode } from "react";

type QuantityStepperVariant = "cart" | "cartCard" | "small";

type QuantityStepperProps = {
  value: ReactNode;
  onIncrement: MouseEventHandler<HTMLButtonElement>;
  onDecrement: MouseEventHandler<HTMLButtonElement>;
  incrementLabel: string;
  decrementLabel: string;
  incrementDisabled?: boolean;
  decrementDisabled?: boolean;
  variant?: QuantityStepperVariant;
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
  small: {
    container: "inline-flex items-center rounded-full border border-black/20 bg-white px-1 py-0.5",
    button:
      "inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-base font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40",
    value: "min-w-7 text-center text-sm font-bold text-slate-900",
  },
};

export default function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  incrementLabel,
  decrementLabel,
  incrementDisabled = false,
  decrementDisabled = false,
  variant = "cart",
}: QuantityStepperProps) {
  const styles = stepperStyles[variant];

  return (
    <div className={styles.container}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={decrementDisabled}
        className={styles.button}
        aria-label={decrementLabel}
      >
        -
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

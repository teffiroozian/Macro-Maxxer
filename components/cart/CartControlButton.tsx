import type { ButtonHTMLAttributes, ReactNode } from "react";

type CartControlButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  children: ReactNode;
};

// Shared light-gray control style for the cart's edit-pen button — paired
// with QuantityStepper's "cartLine" variant (same h-9 height, rounded-xl
// radius, light gray fill) so the two controls read as one cohesive cluster
// in both the cart drawer and the full cart page.
export const cartControlButtonClassName =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

export default function CartControlButton({ className, type = "button", ...props }: CartControlButtonProps) {
  return (
    <button
      type={type}
      className={[cartControlButtonClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

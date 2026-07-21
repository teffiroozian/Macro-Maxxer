import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "pill";
export type AppButtonSize = "sm" | "md" | "lg";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

const baseClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60";

const variantClassNames: Record<AppButtonVariant, string> = {
  primary: "border border-black bg-black text-white hover:bg-neutral-900 active:bg-black",
  secondary: "border border-black/20 bg-white text-[#1A1A1A] hover:bg-black/5 active:bg-black/10",
  ghost: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100",
  pill: "rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200",
};

const sizeClassNames: Record<AppButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const roundedClassNames: Record<AppButtonVariant, string> = {
  primary: "rounded-xl",
  secondary: "rounded-xl",
  ghost: "rounded-lg",
  pill: "rounded-full",
};

export function appButtonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  className?: string;
} = {}) {
  return [
    baseClassName,
    roundedClassNames[variant],
    variantClassNames[variant],
    sizeClassNames[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  {
    variant = "primary",
    size = "md",
    className,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={appButtonClassName({ variant, size, className })}
      {...props}
    />
  );
});

export default AppButton;

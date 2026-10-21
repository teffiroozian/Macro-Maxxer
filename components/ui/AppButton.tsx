import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "pill";
export type AppButtonSize = "sm" | "md" | "lg";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

const baseClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition focus-ring disabled:cursor-not-allowed disabled:opacity-60";

const variantClassNames: Record<AppButtonVariant, string> = {
  primary: "border border-black bg-black text-white hover:bg-slate-900 active:bg-black dark:border-slate-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 dark:active:bg-slate-300",
  secondary: "border border-black/20 bg-white text-[#1A1A1A] hover:bg-black/5 active:bg-black/10 dark:border-control dark:bg-surface-card dark:text-slate-200 dark:hover:bg-surface-hover dark:active:bg-surface-hover",
  ghost: "border border-slate-300 dark:border-control bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-surface-subtle active:bg-slate-100 dark:active:bg-surface-hover",
  pill: "rounded-full border border-slate-200 dark:border-divider bg-white dark:bg-surface-card text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-hover active:bg-slate-200 dark:active:bg-divider",
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

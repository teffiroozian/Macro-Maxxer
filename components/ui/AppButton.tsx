import type { ButtonHTMLAttributes } from "react";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "pill";
export type AppButtonSize = "sm" | "md" | "lg";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

const baseClassName =
  "cursor-pointer inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const variantClassNames: Record<AppButtonVariant, string> = {
  primary: "border border-black bg-black text-white hover:bg-neutral-900",
  secondary: "border-2 border-black/80 bg-transparent text-[#1A1A1A] hover:bg-black/5",
  ghost: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  pill: "rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100",
};

const sizeClassNames: Record<AppButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-3 text-sm",
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

export default function AppButton({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={appButtonClassName({ variant, size, className })}
      {...props}
    />
  );
}

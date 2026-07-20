import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AppIconButtonSize = "sm" | "md";
export type AppIconButtonVariant = "default" | "ghost";

type AppIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  children: ReactNode;
  size?: AppIconButtonSize;
  variant?: AppIconButtonVariant;
};

const baseClassName =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

const sizeClassNames: Record<AppIconButtonSize, string> = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
};

const variantClassNames: Record<AppIconButtonVariant, string> = {
  default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  ghost: "border-transparent bg-transparent text-black/85 hover:bg-slate-900/5 active:bg-slate-900/10",
};

export function appIconButtonClassName({
  size = "sm",
  variant = "default",
  className = "",
}: {
  size?: AppIconButtonSize;
  variant?: AppIconButtonVariant;
  className?: string;
} = {}) {
  return [baseClassName, sizeClassNames[size], variantClassNames[variant], className]
    .filter(Boolean)
    .join(" ");
}

export default function AppIconButton({
  size = "sm",
  variant = "default",
  className,
  type = "button",
  ...props
}: AppIconButtonProps) {
  return (
    <button
      type={type}
      className={appIconButtonClassName({ size, variant, className })}
      {...props}
    />
  );
}

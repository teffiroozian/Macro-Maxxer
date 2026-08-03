import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AppIconButtonSize = "sm" | "md";
export type AppIconButtonVariant = "default" | "ghost" | "nav";

type AppIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  children: ReactNode;
  size?: AppIconButtonSize;
  variant?: AppIconButtonVariant;
  // Persistent version of the `nav` variant's hover treatment — e.g. a
  // hamburger button that should stay visibly "on" (soft green fill, darker
  // green icon) for as long as the drawer it opens is open, not just while
  // the pointer happens to be over it.
  active?: boolean;
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
  // Shared treatment for the global nav's icon controls (cart, hamburger,
  // mobile search) — clean/transparent at rest, a soft green-tinted fill on
  // hover/active rather than the previous permanent outlined circle, so all
  // three read as one consistent system tied to the app's own accent color.
  nav: "border-transparent bg-transparent text-slate-600 hover:bg-accent-soft hover:text-accent-strong active:bg-accent-soft active:text-accent-strong",
};

export function appIconButtonClassName({
  size = "sm",
  variant = "default",
  active = false,
  className = "",
}: {
  size?: AppIconButtonSize;
  variant?: AppIconButtonVariant;
  active?: boolean;
  className?: string;
} = {}) {
  return [
    baseClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    // `!` forces these past the variant's own unconditional `bg-transparent
    // text-slate-600` — without it, Tailwind's build-order cascade can leave
    // the variant's classes winning even though these come later here.
    active && variant === "nav" ? "bg-accent-soft! text-accent-strong!" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function AppIconButton({
  size = "sm",
  variant = "default",
  active = false,
  className,
  type = "button",
  ...props
}: AppIconButtonProps) {
  return (
    <button
      type={type}
      className={appIconButtonClassName({ size, variant, active, className })}
      {...props}
    />
  );
}

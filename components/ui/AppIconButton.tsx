import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AppIconButtonSize = "sm" | "md" | "nav";
export type AppIconButtonVariant = "default" | "ghost" | "nav" | "navSlate" | "muted";

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
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition focus-ring disabled:cursor-not-allowed disabled:opacity-50";

const sizeClassNames: Record<AppIconButtonSize, string> = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  // 36px — the global nav's own icon-button size (cart, hamburger, mobile
  // search), consistently applied via a `size-9` className override across
  // GlobalMobileNav/DesktopNav/StickyRestaurantBar/HeroSearchNav before
  // being formalized here.
  nav: "size-9 text-base",
};

const variantClassNames: Record<AppIconButtonVariant, string> = {
  navSlate: "border-transparent bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-hover hover:text-slate-700 dark:hover:text-slate-200 active:bg-slate-200 dark:active:bg-surface-hover",
  default: "border-slate-200 dark:border-divider bg-white dark:bg-surface-card text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-hover active:bg-slate-200 dark:active:bg-surface-hover",
  ghost: "border-transparent bg-transparent text-black/85 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-surface-hover active:bg-slate-900/10 dark:active:bg-surface-hover",
  // Shared treatment for the global nav's icon controls (cart, hamburger,
  // mobile search) — clean/transparent at rest, a soft green-tinted fill on
  // hover/active rather than the previous permanent outlined circle, so all
  // three read as one consistent system tied to the app's own accent color.
  nav: "border-transparent bg-transparent text-slate-600 dark:text-slate-300 hover:bg-accent-soft hover:text-accent-strong active:bg-accent-soft active:text-accent-strong",
  // A dimmer resting state than `ghost` — used for a modal's own close
  // button, where the icon should read as a quiet corner affordance rather
  // than a normal-weight control. Previously duplicated verbatim as two raw
  // buttons in ItemRouteModal.tsx.
  muted: "border-transparent bg-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-hover hover:text-slate-600 dark:hover:text-slate-300",
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

const AppIconButton = forwardRef<HTMLButtonElement, AppIconButtonProps>(function AppIconButton(
  {
    size = "sm",
    variant = "default",
    active = false,
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
      className={appIconButtonClassName({ size, variant, active, className })}
      {...props}
    />
  );
});

export default AppIconButton;

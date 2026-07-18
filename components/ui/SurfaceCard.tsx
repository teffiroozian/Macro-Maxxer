import { createElement, type HTMLAttributes, type ReactNode } from "react";

type SurfaceCardElement = "article" | "div" | "li" | "section";
export type SurfaceCardPadding = "none" | "compact" | "default" | "comfortable";
export type SurfaceCardRadius = "default" | "large";
export type SurfaceCardShadow = "none" | "sm" | "md" | "lg";

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceCardElement;
  children: ReactNode;
  padding?: SurfaceCardPadding;
  radius?: SurfaceCardRadius;
  shadow?: SurfaceCardShadow;
};

const baseClassName = "border border-black/10 bg-white";

const paddingClassNames: Record<SurfaceCardPadding, string> = {
  none: "p-0",
  compact: "p-3",
  default: "p-4",
  comfortable: "p-5",
};

const radiusClassNames: Record<SurfaceCardRadius, string> = {
  default: "rounded-2xl",
  large: "rounded-3xl",
};

const shadowClassNames: Record<SurfaceCardShadow, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
  lg: "shadow-lg",
};

export function surfaceCardClassName({
  padding = "default",
  radius = "default",
  shadow = "sm",
  className = "",
}: {
  padding?: SurfaceCardPadding;
  radius?: SurfaceCardRadius;
  shadow?: SurfaceCardShadow;
  className?: string;
} = {}) {
  return [
    baseClassName,
    radiusClassNames[radius],
    shadowClassNames[shadow],
    paddingClassNames[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function SurfaceCard({
  as = "div",
  padding = "default",
  radius = "default",
  shadow = "sm",
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return createElement(
    as,
    {
      className: surfaceCardClassName({ padding, radius, shadow, className }),
      ...props,
    },
    children
  );
}

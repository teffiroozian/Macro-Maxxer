import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export const sectionEyebrowClassName = "font-semibold uppercase tracking-[0.14em] text-slate-600";

type SectionEyebrowProps<TElement extends ElementType = "p"> = {
  as?: TElement;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<TElement>, "as" | "children" | "className">;

export default function SectionEyebrow<TElement extends ElementType = "p">({
  as,
  children,
  className,
  ...props
}: SectionEyebrowProps<TElement>) {
  const Component = as ?? "p";

  return (
    <Component className={`${sectionEyebrowClassName} ${className ?? ""}`.trim()} {...props}>
      {children}
    </Component>
  );
}

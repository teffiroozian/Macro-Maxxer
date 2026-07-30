import type { ElementType, HTMLAttributes, ReactNode } from "react";

// Shared homepage width system (Slice 5 final refinement). Two widths, used
// consistently everywhere instead of ad-hoc `max-w-*` values per section:
//
// - Page shell (`max-w-6xl`, applied by this component): the outer horizontal
//   rhythm for every homepage section — hero, Featured Restaurants, Product
//   Walkthrough, Menu-Item Discovery, and the footer all align to the same
//   left/right edges.
// - Visual content width (`HOME_VISUAL_WIDTH_CLASS`, max-w-4xl): the width
//   used by each section's actual "visual-heavy" content — the restaurant
//   carousel viewport, the walkthrough's device-chrome card, the menu-item
//   discovery card, and the footer's product panel — matching the scale the
//   Product Walkthrough card already established. Headings/descriptions stay
//   narrower via HomeSectionHeading's own max-w-3xl/2xl; they don't need to
//   span this width.
export const HOME_VISUAL_WIDTH_CLASS = "max-w-4xl";

type HomeSectionContainerProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  className?: string;
};

export default function HomeSectionContainer({
  as: Component = "section",
  children,
  className = "",
  ...props
}: HomeSectionContainerProps) {
  return (
    <Component className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

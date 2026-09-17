import type { CSSProperties } from "react";
import type { ItemImagePresentation } from "@/types/menu";

export function resolveItemImagePresentation(
  presentation: ItemImagePresentation | undefined,
  fallbackClassName: string,
  fallbackBackgroundColor?: string,
): { className: string; style?: CSSProperties; backgroundColor?: string } {
  // Item-level backgroundColor overrides the restaurant-level default;
  // falls through to the default (no background override) when neither is set.
  const backgroundColor = presentation?.backgroundColor ?? fallbackBackgroundColor;

  if (!presentation) return { className: fallbackClassName, backgroundColor };

  return {
    className: presentation.fit === "cover" ? "object-cover" : "object-contain",
    style: {
      objectPosition: presentation.position,
      transform:
        presentation.scale === undefined
          ? undefined
          : `scale(${presentation.scale})`,
    },
    backgroundColor,
  };
}

// Small helper for the (many) callers that render the image inside its own
// container element: turns a resolved presentation's backgroundColor into an
// inline style for that container, or undefined to keep the container's own
// default background untouched.
export function itemImageContainerStyle(
  presentation: { backgroundColor?: string } | undefined,
): CSSProperties | undefined {
  return presentation?.backgroundColor ? { backgroundColor: presentation.backgroundColor } : undefined;
}

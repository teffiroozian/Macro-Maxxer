import type { CSSProperties, ReactNode } from "react";
import AppImage from "@/components/ui/AppImage";
import { itemImageContainerStyle, resolveItemImagePresentation } from "@/lib/itemImagePresentation";
import type { ItemImagePresentation } from "@/types/menu";

// The one place that turns an item's image display metadata
// (types/menu.ts#ItemImagePresentation) into an actual rendered image,
// anywhere a restaurant item's photo appears — menu cards, cart rows, the
// cart side panel, Recently Added, item detail/customize modals, the
// Protein Score modal, Meal Breakdown, etc. The image behavior follows the
// *item*, not the surface it's rendered on: pass the item's own
// `imagePresentation` (its override) and, where relevant, the restaurant's
// contextual default (`fallbackClassName`/`fallbackBackgroundColor`, e.g.
// from getRestaurantImagePresentation) — see lib/itemImagePresentation.ts
// for the precedence rules. A caller with neither simply keeps today's
// default look; nothing here changes behavior unless the metadata says to.
export default function RestaurantItemImage({
  src,
  alt,
  imagePresentation,
  fallbackClassName = "object-contain",
  fallbackBackgroundColor,
  containerClassName,
  containerStyle,
  renderer = "img",
  sizes,
  width,
  height,
  priority,
  fallback = null,
  overlay,
}: {
  src?: string;
  alt: string;
  // Item-level override — always wins over the restaurant-level fallback.
  imagePresentation?: ItemImagePresentation;
  // Restaurant-level default for this rendering context (a menu card,
  // detail view, or thumbnail already have their own sizing/padding baked
  // into this className, e.g. "object-contain p-3") — used only when the
  // item carries no override of its own.
  fallbackClassName?: string;
  fallbackBackgroundColor?: string;
  // Sizing/border/radius/etc. for the image's own container box — this
  // component only owns the background-color + overflow-hidden behavior
  // driven by the presentation metadata, not layout, so every caller keeps
  // its own box shape.
  containerClassName: string;
  containerStyle?: CSSProperties;
  // "img" (default) covers the vast majority of call sites — small/fixed
  // thumbnails rendered as a plain <img>. "next-image" opts into
  // next/image's optimization for larger/above-the-fold images: fills
  // `containerClassName`'s box (requires `sizes`) unless `width`+`height`
  // are given, in which case it renders at that intrinsic size instead
  // (e.g. a small icon centered inside a larger container via the
  // container's own flex/justify classes, not stretched to fill it).
  renderer?: "img" | "next-image";
  sizes?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  // Rendered in place of an image when `src` is empty (an initial letter,
  // a plain placeholder block, or nothing).
  fallback?: ReactNode;
  // Rendered as a sibling on top of the image (a rank/status badge, a
  // macro badge, etc.) — callers needing this should include `relative` in
  // `containerClassName` (most already do) so the overlay positions
  // against the image box itself.
  overlay?: ReactNode;
}) {
  const resolved = resolveItemImagePresentation(imagePresentation, fallbackClassName, fallbackBackgroundColor);
  const backgroundStyle = itemImageContainerStyle(resolved);

  return (
    <div
      className={containerClassName}
      style={backgroundStyle ? { ...containerStyle, ...backgroundStyle } : containerStyle}
    >
      {src ? (
        renderer === "next-image" ? (
          width !== undefined && height !== undefined ? (
            <AppImage
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              className={resolved.className}
              style={resolved.style}
            />
          ) : (
            <AppImage
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className={`block h-full w-full ${resolved.className}`}
              style={resolved.style}
            />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={`block h-full w-full ${resolved.className}`}
            style={resolved.style}
          />
        )
      ) : (
        fallback
      )}
      {overlay}
    </div>
  );
}

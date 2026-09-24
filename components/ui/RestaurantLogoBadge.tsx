import Image from "next/image";

export type RestaurantLogoBadgeSize = "xs" | "sm" | "md" | "lg";

type RestaurantLogoBadgeProps = {
  src: string;
  alt: string;
  size?: RestaurantLogoBadgeSize;
  // Most restaurant marks are roughly square (icon-style). A few use a
  // wider wordmark — pass `wide` for those rather than guessing a fixed
  // aspect ratio from the file itself.
  wide?: boolean;
  ring?: boolean;
  className?: string;
  // How much of the wrapper the mark itself fills, as a percentage.
  // Inspected both current source files directly (not just their
  // rendered CSS box): chickfila/brand/logo.png and chipotle/brand/logo.jpeg
  // are both opaque 400x400 squares where the brand color already touches
  // all four edges — full-bleed icon tiles, like an app icon, with zero
  // internal margin baked into the asset. Any fill below 100 was our
  // wrapper inventing padding the source art was never designed with.
  // 100 renders them edge-to-edge, clipped only by the wrapper's own
  // rounded corner. Lower this per-instance for a future restaurant whose
  // logo file *does* ship with real internal padding around the mark.
  fill?: number;
  // "contain" (default) never crops; "cover" fills the box edge-to-edge —
  // for contexts (e.g. a dense nav list row) that want the mark to read as
  // a solid tile rather than floating inside its own box.
  fit?: "contain" | "cover";
  // Muted/unavailable state (MobileNavDrawer's "Coming Soon" list).
  grayscale?: boolean;
  // The wrapper's own background, shown through any transparent margin
  // around the mark. Defaults to white; callers embedded in a tinted list
  // row (e.g. a slate-50 panel) can match that background instead.
  background?: string;
};

// Fixed *height*, width from a small enum (square vs wide) — a wrapper
// that forces every logo into the same square box either crops a wide
// wordmark or drowns a tight square mark in empty padding. This keeps
// height predictable (so logos align in a row) while letting width match
// what the mark actually needs.
const heightClassNames: Record<RestaurantLogoBadgeSize, string> = {
  xs: "h-8",
  sm: "h-9",
  md: "h-12",
  lg: "h-16",
};

const widthClassNames: Record<RestaurantLogoBadgeSize, { square: string; wide: string }> = {
  xs: { square: "w-8", wide: "w-14" },
  sm: { square: "w-9", wide: "w-16" },
  md: { square: "w-12", wide: "w-24" },
  lg: { square: "w-16", wide: "w-32" },
};

// Tailwind's scanner needs literal class names in source, not a template
// string built from the `fit` variable — this lookup keeps both possible
// classes statically visible.
const fitClassNames: Record<NonNullable<RestaurantLogoBadgeProps["fit"]>, string> = {
  contain: "object-contain",
  cover: "object-cover",
};

// object-contain + `fill` centers and non-distorts any source aspect
// ratio (square, circular, wide) inside whatever box it's given, without
// next/image needing to know the file's real dimensions up front — that's
// what keeps this reusable for restaurants added later.
export default function RestaurantLogoBadge({
  src,
  alt,
  size = "md",
  wide = false,
  ring = true,
  className = "",
  fill = 100,
  fit = "contain",
  grayscale = false,
  background = "bg-white",
}: RestaurantLogoBadgeProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${background} ${
        ring ? "border border-black/10 shadow-sm" : ""
      } ${heightClassNames[size]} ${wide ? widthClassNames[size].wide : widthClassNames[size].square} rounded-full ${className}`}
    >
      <span className="relative" style={{ height: `${fill}%`, width: `${fill}%` }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="128px"
          className={`${fitClassNames[fit]} ${grayscale ? "grayscale" : ""}`.trim()}
        />
      </span>
    </span>
  );
}

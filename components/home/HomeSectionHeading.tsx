import type { ReactNode } from "react";
import SectionEyebrow from "@/components/ui/SectionEyebrow";

type HomeSectionHeadingProps = {
  eyebrow: ReactNode;
  // "text" (default): plain uppercase eyebrow typography via SectionEyebrow —
  // used for simple section labels like "See It In Action".
  // "pill": renders `eyebrow` exactly as passed, with no imposed typography
  // — used when the eyebrow is itself a fully-styled element (e.g. the
  // live-restaurant-count pill), so it isn't flattened into plain uppercase
  // text by SectionEyebrow's classes.
  eyebrowVariant?: "text" | "pill";
  heading: ReactNode;
  description?: ReactNode;
  className?: string;
};

// Shared eyebrow + H2 pattern for homepage sections. The eyebrow/heading get
// a wider centered column than the description beneath them, so multi-word
// headings (e.g. "Jump Straight to the Menu") fit on one line at sm+ widths
// without shrinking the type scale. Reuse this for every homepage H2 rather
// than reintroducing a narrower ad-hoc wrapper per section.
export default function HomeSectionHeading({
  eyebrow,
  eyebrowVariant = "text",
  heading,
  description,
  className = "",
}: HomeSectionHeadingProps) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className}`.trim()}>
      {eyebrowVariant === "pill" ? (
        <div className="flex justify-center">{eyebrow}</div>
      ) : (
        <SectionEyebrow className="text-xs sm:text-sm">{eyebrow}</SectionEyebrow>
      )}
      <h2 className="font-heading mt-3 text-3xl font-bold text-neutral-900 sm:text-4xl">{heading}</h2>
      {description ? <p className="mx-auto mt-3 max-w-xl text-base text-neutral-600">{description}</p> : null}
    </div>
  );
}

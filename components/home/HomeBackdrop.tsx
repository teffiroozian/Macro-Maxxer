// Purely decorative macro-tech backdrop for the homepage: a soft glow in
// the product's green accent behind the hero, fading into a faint dot
// grid. Always an `absolute inset-0` sibling of the real content (never a
// wrapper around it), so its own `overflow-hidden` can never clip
// anything interactive — like the hero search dropdown — that lives in a
// different subtree.
export default function HomeBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[820px] bg-gradient-to-b from-emerald-50/70 via-amber-50/10 to-transparent" />

      {/* Green-led glow — the same product accent used for search focus
          and active controls, not the protein/orange macro color, which
          stays scoped to actual macro values. Slightly stronger than the
          Slice 1 original so it reads intentionally rather than nearly
          invisible, while staying well short of a "heavy gradient". */}
      <div className="absolute left-1/2 top-[-260px] h-[640px] w-[1150px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(5,150,105,0.19),rgba(217,119,6,0.06)_60%,transparent_75%)] blur-3xl" />

      {/* Dot grid — masked with a radial "clean zone" roughly where the
          headline/search sit (upper-center of the hero) so the texture never
          competes with that text, while staying clearly visible toward the
          hero's edges and around the floating corner cards. Replaces the
          old plain top-to-bottom fade, which had no center/edge distinction
          at all. */}
      <div
        className="absolute inset-x-0 top-0 h-[900px] opacity-[0.55] [mask-image:radial-gradient(ellipse_640px_420px_at_50%_32%,transparent_0%,black_68%)]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.18) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}

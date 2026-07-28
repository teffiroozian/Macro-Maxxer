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
          stays scoped to actual macro values. */}
      <div className="absolute left-1/2 top-[-260px] h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(5,150,105,0.14),rgba(217,119,6,0.05)_60%,transparent_75%)] blur-3xl" />

      <div
        className="absolute inset-x-0 top-0 h-[900px] opacity-[0.4] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.16) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}

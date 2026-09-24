# design-sync notes — Macro Maxxer

## Repo shape
Macro Maxxer is a private Next.js **app**, not a publishable component
package: `package.json` has no `main`/`module`/`exports`, and there's no
`dist/` build. The sync is scoped to `components/ui/` (13 files) and runs in
**synth-entry mode** (package shape, no dist — see non-storybook SKILL.md
§"Package source shape"). `cfg.entry` is intentionally passed as a
nonexistent path (`./components/ui/index.ts`) purely so the converter's
package.json walk lands on the repo root (`macro-maxxer` → treated as
`PKG_DIR`), which makes `cfg.srcDir: "components/ui"` resolve correctly.

## Excluded components (3 of 13)
`AppImage`, `RestaurantItemImage`, `RestaurantLogoBadge` are excluded via
`cfg.componentSrcMap: {Name: null}` — all three import `next/image`, whose
module-level code touches `process.env.__NEXT_*` outside the Next.js runtime
and threw `ReferenceError: process is not defined` **at bundle-evaluation
time**, which broke `window.MacroMaxxerUI` for ALL 13 components (not just
the 3), because everything ships in one shared IIFE. `next/image` fundamentally
needs Next's build-time image-loader config and can't render standalone in
an esbuild bundle — this isn't a fixable render-time provider issue.
The forked `source-kit.mjs` (below) also drops these files from the synth
**entry** itself (not just the component list), which is what actually fixes
the shared-crash — `componentSrcMap: null` alone only excludes registration.

## Forked lib: `.design-sync/overrides/source-kit.mjs`
Declared in `cfg.libOverrides`. Two fixes over the bundled adapter:
1. The synth-entry generator only emitted `export * from '<path>'`, which
   never surfaces `export default` — every `components/ui/*.tsx` file ships
   a default export. Now also emits `export { default as <Name> } from ...`
   for PascalCase-named files.
2. Files excluded via `componentSrcMap: {Name: null}` are now filtered out
   of the synth-entry file list too (see above) — the bundled version only
   excludes them from the component/`.d.ts` list, not from what's bundled.

Re-sync: diff this fork against the bundled `lib/source-kit.mjs` and offer to
merge upstream changes (per Troubleshooting in the base skill).

## CSS: Tailwind v4 is not build-time-static
`app/globals.css` is Tailwind v4 *source* (`@import "tailwindcss";` + a
`@theme` token block) — not compiled CSS, so `cfg.cssEntry` can't point at it
directly ([CSS_IMPORT_MISSING]). `.design-sync/.cache/compile-tailwind.mjs`
(gitignored, regenerate-on-sync) runs `@tailwindcss/postcss` against the
repo's own `app/globals.css` from the repo root (so it resolves the repo's
pinned Tailwind version, not `.ds-sync/node_modules`'s), scanning the whole
project for used utility classes (Tailwind v4's own content auto-detection —
broader than just `components/ui/`, but harmless: a superset of real classes).
Output: `.design-sync/.cache/tailwind-compiled.css`, which `cfg.cssEntry`
points at. **Re-sync must re-run this script before `package-build.mjs`** —
it's not part of `cfg.buildCmd` since there's no single app build command to
hook it into; run it manually: `node .design-sync/.cache/compile-tailwind.mjs`.

### Fonts (Outfit, Unbounded)
Both are self-hosted at build time by `next/font/google` in `app/layout.tsx`
— there's no shipped `@font-face` anywhere in source for the scraper to find
(next/font emits the actual `.woff2` files into `.next/` only during a real
Next build). `compile-tailwind.mjs` prepends a Google Fonts CDN `@import` +
`--font-outfit`/`--font-unbounded` custom-property fallback ahead of the
compiled CSS. This resolves as `[FONT_REMOTE]` (informational) — **substitute
accepted without explicit user sign-off since this was a headless/no-user
run**; both are public Google Fonts under the same names, so visual risk is
low, but flag this to the user on first review as a decision made in their
absence.

## Known render warns
None currently — render check is 10/10 clean, `bad` empty.

## Scoped preview grading note
`Dialog`'s `ConfirmDialog` cell grades `good` (styled/complete/plausible from
the actual rendered panel), but the **grading-capture crop** (via
`package-capture.mjs`, `?story=` isolated capture) visually clips the dialog
heading above the visible frame even with `cfg.overrides.Dialog: {cardMode:
"single", viewport: "480x480"}` — looks like the crop region doesn't fully
respect the viewport override for cardMode:"single" captures. The mechanical
render check (`package-validate.mjs`) passed this component clean (no
RENDER_BLANK/THIN/errors) both before and after, so this is a presentation
quirk in the grading screenshot only, not a real render defect. Worth
revisiting if a future re-sync makes card framing easy to inspect directly.

## Re-sync risks
- **Tailwind CSS scope**: `compile-tailwind.mjs` scans the WHOLE repo for
  utility classes, not just `components/ui/`. If the app's Tailwind config or
  `@theme` tokens change elsewhere, the compiled CSS picks it up even though
  nothing in `components/ui/` changed — this is intentional (tokens should
  stay in sync) but means the CSS entry isn't purely scoped to this DS.
- **Font substitution not user-confirmed**: see above — flag to the user.
- **componentSrcMap exclusions are structural, not cosmetic**: don't drop the
  `null` entries for AppImage/RestaurantItemImage/RestaurantLogoBadge without
  re-verifying the process.env crash is actually fixed (e.g. if Next.js ships
  a browser-safe next/image build in a future version).
- **No `cfg.buildCmd`**: there is no real "build" to run before re-sync
  (synth-entry mode reads `components/ui/*.tsx` directly) — just re-run
  `compile-tailwind.mjs` then the converter.

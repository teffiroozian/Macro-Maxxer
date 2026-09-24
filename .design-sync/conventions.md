## Macro Maxxer UI — build with this design system

This is a **Tailwind CSS v4 utility-class system**. Every component in this
DS is styled entirely with Tailwind utilities that resolve to Macro Maxxer's
own design tokens (never Tailwind's stock palette for anything
brand/semantic) — write your own layout glue the same way, with these same
classes, so new compositions read as native Macro Maxxer UI, not a bolted-on
layer.

**No wrapper/provider is required.** These components read no React context
and need no top-level provider — `AppButton`, `SurfaceCard`, etc. can be
used directly. `Dialog` is the one exception: it expects to be mounted only
while open (no `isOpen` prop) and needs `titleId` to match an element you
render inside it for `aria-labelledby`.

### Token vocabulary (use these, not raw Tailwind colors)

| Purpose | Class |
|---|---|
| Brand accent | `bg-accent` / `text-accent` / `border-accent`, `-strong` and `-soft` variants (e.g. `bg-accent-strong`, `bg-accent-soft`) |
| Semantic status | `success`, `info`, `warning`, `error` — each with base/`-soft`/`-strong` (e.g. `bg-success-soft`, `text-error-strong`) |
| Surfaces | `bg-surface-card`, `bg-surface-subtle`, `bg-surface-hover`, `bg-surface-inverse` |
| Overlay scrim | `bg-overlay-scrim` (used by `Dialog`'s backdrop) |
| Borders | `border-hairline` (thin dividers), `border-control` (input/control borders), `border-divider` |
| Elevation | `shadow-elev-1` / `-2` / `-3` (ambient), `shadow-elev-modal`, `shadow-elev-brand`, `shadow-elev-float`, `shadow-elev-hover` — never `shadow-md`/`shadow-lg` |
| Typography | `font-sans` (Outfit, body/UI text) and `font-heading` (Unbounded, headings/emphasis) |

Full token source: `styles.css` → `@import` closure (tokens defined as CSS
custom properties, e.g. `--color-accent`, `--shadow-elev-2`).

### Composition idiom

- **Buttons**: `AppButton` for primary actions (`variant`: `primary` |
  `secondary` | `ghost` | `pill`, `size`: `sm` | `md` | `lg`). `AppIconButton`
  for icon-only controls — always pass `aria-label`, and use `variant="nav"`
  for persistent chrome (header/nav icons) vs `variant="ghost"`/`"muted"` for
  contextual dismiss/secondary actions.
- **Cards/surfaces**: wrap grouped content in `SurfaceCard` (`padding`:
  `none`|`compact`|`default`|`comfortable`, `radius`: `default`|`large`,
  `shadow`: `none`|`sm`|`md`|`lg`) rather than hand-rolling
  `border rounded-2xl bg-white` — that's exactly what it wraps.
- **Choice controls**: `SegmentedControl` for a small set of mutually
  exclusive options shown as a pill-group (radio semantics, optional icons
  per option). `InlineVariantSelect` for a compact inline dropdown
  (native `<select>`-backed) when space is tight (e.g. a row-level picker).
  `FilterChip` (`active` boolean) for togglable filter pills.
- **Labels/badges**: `MacroBadge` for a single macro stat
  (`macroKey`: `"calories"|"protein"|"carbs"|"totalFat"`, `value`) — color
  follows the macro automatically. `CornerLabelBadge` (`tone`: `"accent"` |
  `"violet"`) for a small overlay badge in a card/image corner.
- **Section headers**: `SectionEyebrow` for the small uppercase label above
  a content section (`as` prop to render as a heading element when it's the
  section's real heading, not just decorative).
- **Dialogs**: `Dialog` renders the shared overlay+panel shell (bottom sheet
  on mobile, centered on larger screens) — put your own heading (tied to
  `titleId`), body, and an action row (typically `AppButton` ghost + primary)
  as children.

### Example

```tsx
<SurfaceCard padding="default" radius="default" shadow="sm">
  <SectionEyebrow>Chipotle</SectionEyebrow>
  <p className="font-heading text-base font-semibold">Chicken Bowl</p>
  <div className="mt-2 flex gap-2">
    <MacroBadge macroKey="calories" value={540} />
    <MacroBadge macroKey="protein" value={38} />
  </div>
  <div className="mt-4">
    <AppButton variant="primary" size="sm">Add to order</AppButton>
  </div>
</SurfaceCard>
```

### Where the truth lives

- `styles.css` (and its `@import` closure) — every real token and utility
  class, compiled from the app's own `app/globals.css`.
- `components/general/<Name>/<Name>.d.ts` — the prop contract per component
  (note: synth-entry mode here has weaker prop extraction than a real
  library build; when in doubt, the `.prompt.md` and preview cards show real
  usage).
- `components/general/<Name>/<Name>.prompt.md` — per-component usage notes.

Brand fonts (Outfit/Unbounded) load via a Google Fonts `@import` in
`styles.css` — a build-time substitute for the app's real `next/font`
self-hosting (see `.design-sync/NOTES.md`), not something to change per design.

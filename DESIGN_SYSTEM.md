# Macro Maxxer Design System

Practical reference for building UI in this codebase. Source of truth for values is `app/globals.css` (tokens) and the shared components under `components/ui/`, `components/nutrition/`, `components/menu-item-card/`. This file describes *what exists and when to use it* — read the referenced file for exact implementation details.

---

## Color tokens

All defined as CSS custom properties in `:root` (`app/globals.css`) and exposed as Tailwind utilities via `@theme inline` (e.g. `--surface-card` → `bg-surface-card`).

**Product accent** (neutral brand emphasis — search focus, active controls, status dots; never a per-restaurant brand color):
- `bg-accent` / `text-accent` / `border-accent` — `#059669`
- `bg-accent-strong` — `#047857` (hover/active states, selected borders)
- `bg-accent-soft` — `#ecfdf5` (tinted backgrounds)

**Semantic roles** (success/info/warning/error), each with a `-soft` (tint background) and `-strong` (text/icon) companion:
- `success` `#059669` (shares the accent hue — an "available" state is positive product emphasis, not a separate color)
- `info` `#2563eb`
- `warning` `#b45309`
- `error` `#dc2626`

**Surfaces:**
- `bg-app-background` `#efefef` — page background
- `bg-muted-panel` `#e0e0e0`
- `bg-image-placeholder` `#efefef`
- `bg-surface-card` `#ffffff` — card fill
- `bg-surface-subtle` `#f8fafc`
- `bg-surface-hover` `#f1f5f9` — hover tint for rows/cards
- `bg-surface-inverse` `#0f172a`
- `bg-overlay-scrim` — dialog/drawer backdrop, `rgb(15 23 42 / 0.52)`

**Borders:**
- `border-hairline` — `black/10`, the default card/panel border
- `border-control` — `#cbd5e1` (slate-300), inputs
- `border-divider` — `#e2e8f0` (slate-200), dividers/rules
- Selected state: 2px border, `accent-strong` color

**Neutral ramp:** slate is the canonical neutral (not `neutral-*`/`gray-*`). Use `text-icon-decorative` (`#94a3b8`) for decorative/non-interactive icons rather than a raw slate value.

## Macro colors

Single source of truth: `components/nutrition/macroColorTokens.ts`, consumed everywhere through `macroDisplayConfig` (`components/nutrition/macroDisplay.ts`). Never redeclare these hexes elsewhere.

| Macro | Value text | Bar/segment |
|---|---|---|
| Calories | `#111318` | `bg-[#111318]` |
| Protein | `#c2410c` | `bg-[#c2410c]` |
| Carbs | `#ca8a04` | `bg-[#ca8a04]` |
| Fat | `#2563eb` | `bg-[#2563eb]` |

Each macro has a `default` (plain value) and `bar` (in-bar/on-color-fill) variant. Get these via `macroDisplayConfig[macroKey]`, never by hardcoding a hex against a macro name.

## Typography

All classes live in `app/globals.css` under `@layer components`. Headings use `font-heading` (Unbounded 700); body/value text uses the default sans (Outfit). **Always pair a heading token class with the literal `font-heading` utility class** (e.g. `className="font-heading text-card-title"`) — the token class alone can lose to layer-ordering in some contexts.

| Class | Use | Size |
|---|---|---|
| `.text-display-1` | Homepage hero H1 | 36px → 48px (sm) → 60px (lg), responsive |
| `.text-display-2` | Section H2 | 30px → 36px (sm) |
| `.text-display-3` | Item-detail product title | 18px → 20px (sm) → 24px (lg) |
| `.text-card-title` | Menu/cart card item name | 22px → 26px (sm) |
| `.text-title` | Compact item-name title (lighter weight, no responsive bump) | 18px, font-medium |
| `.text-body-lg` | Lead/descriptive copy | 16px → 18px (sm) |
| `.text-body` | Default paragraph copy | 16px |
| `.text-body-sm` | Secondary/supporting copy | 14px |
| `.text-label` | Eyebrow/section-label caption, uppercase tracked | 11px |
| `.text-micro` | Smaller than label | 10px |
| `.text-value-1` | Large tabular macro number (e.g. cart header total) | 24px → 30px (sm) |
| `.text-value-2` | Secondary tabular macro number (card size) | 20px → 22px (sm) |
| `.text-value-inline` | Macro number inline in a label sentence | inherits size |
| `.text-macro-label` | Label under a compact macro value (9px exception) | 9px |

Value tiers (`value-1/2/inline`) always carry `font-variant-numeric: tabular-nums` so digits don't shift width as a number changes — apply this to any new macro-adjacent number too (see `MacroTotalsGrid.tsx`).

## Spacing, radius, elevation, borders, surfaces

**Radius:** Tailwind's standard scale (`rounded-lg/xl/2xl/3xl/full`) plus one custom token: `rounded-sheet` (28px) for bottom-sheet/large-modal surfaces (`ProteinScoreDetails`, `MacroSplitDetails`, `GlobalSearchOverlay`, `ExportOrderDialog`).

**Elevation** (`shadow-elev-*`, defined once in `app/globals.css`):
- `shadow-elev-1` — subtle resting shadow
- `shadow-elev-2` — standard card shadow
- `shadow-elev-3` — prominent card shadow
- `shadow-elev-brand` — soft accent-tinted shadow (nav elements)
- `shadow-elev-modal` — confirm-dialog / full-sheet shadow
- `shadow-elev-float` — large soft floating-card shadow with negative spread (homepage search)
- `shadow-elev-hover` — homepage card hover-lift shadow

Never hand-write a `shadow-[...]` arbitrary value that matches (or nearly matches) one of these — extend the token set instead if a genuinely new shadow shape is needed.

**Layout widths:** `--shell-width` (1152px, = Tailwind `max-w-6xl`), `--content-width` (896px, = `max-w-4xl`), `--measure` (68ch), gutters 24px desktop / 16px mobile. Use the Tailwind utilities directly (`max-w-6xl`, `max-w-4xl`) for layout; the CSS vars exist only for non-utility/inline-style contexts.

## Control-height scale

`--control-height-sm/md/lg` = 32px / 40px / 48px, matching `AppButton`'s `sm`/`md`/`lg` (`h-8`/`h-10`/`h-12`). New fixed-height controls (buttons, inputs, steppers) should land on one of these three heights unless there's a documented, contextual reason not to (e.g. a dense icon-button cluster).

## Focus and selection

- **Focus ring:** use the `focus-ring` class (targets `:focus-visible`, `2px solid #0f172a`, `2px` offset). Equivalent to `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900`. Every new interactive element should get this, not a bespoke focus treatment.
- **Selected state:** 2px `accent-strong` border, or a solid `black/10` fill for list rows (see `selectableRowClassName`). Don't invent a new selected-state visual language per component.

## Layout/container rules

- Page shell: `max-w-6xl` (1152px), content column `max-w-4xl` (896px).
- Gutters: `px-6` desktop, `px-4` mobile (24px / 16px).
- Z-index tiers (`--z-*`, use as `z-[var(--z-sticky)]` etc.): `sticky` 10, `nav` 95, `dropdown` 120, `drawer` 210, `dialog` 240, `tooltip` 260. Pick from this scale — don't invent a new number.

---

## Core primitives

Located in `components/ui/` unless noted. Each is a className-builder function (`xClassName({...})`) plus, where relevant, a default component wrapping it — use the builder directly when you need the classes on a non-`<button>` element.

| Primitive | File | Variants |
|---|---|---|
| **Button** | `AppButton.tsx` | variant: `primary` / `secondary` / `ghost` / `pill` · size: `sm` / `md` / `lg` |
| **IconButton** | `AppIconButton.tsx` | variant: `default` / `ghost` / `nav` / `muted` · size: `sm` / `md` / `nav` · `active` boolean |
| **Dialog** (centered/bottom-sheet confirm shell) | `Dialog.tsx` + `hooks/useDialogA11y.ts` | fixed 420px panel, `panelClassName` to widen. For a full custom-layout sheet or slide-in drawer, use `useDialogA11y` directly with bespoke markup (see `ExportOrderDialog`, `MobileNavDrawer`) |
| **Chip** (filter toggle) | `FilterChip.tsx` | `active` boolean |
| **Badge** (corner overlay) | `CornerLabelBadge.tsx` | tone: `accent` / `violet` |
| **SegmentedControl** (single-choice pill group) | `SegmentedControl.tsx` | size: `compact` / `comfortable` |
| **SelectableRow** (list/menu row) | `selectableRow.ts` | `active` boolean; caller supplies own `flex`/`inline-flex` display |
| **SurfaceCard** (generic card shell) | `SurfaceCard.tsx` | padding: `none`/`compact`/`default`/`comfortable` · radius: `default`/`large` · shadow: `none`/`sm`/`md`/`lg` |
| **QuantityStepper** | `QuantityStepper.tsx` | variant: `cart` / `cartCard` / `cartLine` / `small` / `modalPill` |
| **RestaurantLogoBadge** | `RestaurantLogoBadge.tsx` | size: `xs`/`sm`/`md`/`lg` · `wide`, `fit` (`contain`/`cover`), `grayscale`, `ring`, `background` |

**Input:** no single canonical component exists yet — inputs are hand-built per surface using `border-control`/`focus-ring` conventions. If you need a new text input, follow the existing pattern (border-control, rounded-xl/lg, focus-ring) rather than introducing a new visual language, and consider extracting a shared component if a second near-identical one appears.

**Select/Menu:** no single canonical dropdown primitive exists; menus are built per-context (e.g. `ChipotleRestaurantBuilderView`'s ingredient dropdown, `DesktopSearchDropdown`) on top of `selectableRowClassName` for their rows. Reuse `selectableRowClassName` for any new dropdown's row styling.

## Product patterns

Reuse these instead of rebuilding macro/menu/restaurant UI from scratch.

| Pattern | File | Use for |
|---|---|---|
| **MacroStat** | `components/nutrition/MacroStat.tsx` | A single macro's value + label, in one of 7 sizes (`summary`, `cartHeaderTotal`, `card`, `quick`, `cartCompact`, `cartDetailed`, `ingredientCompact`) |
| **MacroTotalsGrid** | `components/MacroTotalsGrid.tsx` | 4-up calories/protein/carbs/fat grid (cart totals, panels) |
| **MacroSplitChart** + `buildMacroSegments` | `components/nutrition/MacroSplitChart.tsx`, `components/nutrition/macroSegments.ts` | The segmented protein/carb/fat bar. `buildMacroSegments` is a pure, server-safe helper — import it from `macroSegments.ts`, never redefine it. Whole-section click-to-open pattern: see `SelectionSummaryPanels.tsx`'s `CLICKABLE_SECTION_CLASSNAME` |
| **MacroSplitDetails** | `components/nutrition/MacroSplitDetails.tsx` | Full-detail modal opened from a MacroSplitChart section |
| **ProteinScorePill** / **ProteinScoreDetails** | `components/menu-item-card/ProteinScorePill.tsx`, `components/nutrition/ProteinScoreDetails.tsx` | The protein-per-100-cal chip and its detail modal (tier scale, item-by-item breakdown, sorted highest-to-lowest) |
| **NutritionFactsPanel** | `components/nutrition/NutritionFactsPanel.tsx` | Full nutrition-label-style breakdown |
| **MenuItemCard** / **MenuItemCardHeader** | `components/MenuItemCard.tsx`, `components/menu-item-card/` | Menu grid item card and its shared header (image, title, badges, variant controls) |
| **SelectionSummaryShell** / **SelectionSummaryRow** | `components/item-route-modal/SelectionSummaryPanels.tsx` | The shared "Selected Items / Ingredients + Protein Score + Macro Split" card used by Meal Details, Selected Ingredients, Meal Breakdown |
| **RestaurantLogoBadge** | `components/ui/RestaurantLogoBadge.tsx` | Any restaurant mark — see Brand treatment below |

Prefer extending one of these (a new size/variant) over adding a parallel implementation. If an existing pattern already matches what you need, use it as-is — don't "improve" it as a side effect of an unrelated task.

## Restaurant logo/brand treatment

- Always render restaurant marks through `RestaurantLogoBadge`, never a raw `<img>`/`next/image`.
- Per-restaurant **item image** display quirks (not logos) live in `lib/restaurantPresentation.ts`'s `getRestaurantImagePresentation(restaurantId)` — e.g. Starbucks needs `object-contain scale-150` + a `#1e3932` background to read correctly. A structured equivalent (`getRestaurantItemImagePresentation`) exists for contexts that can only carry one `ItemImagePresentation` value per row (e.g. a cross-restaurant cart list) instead of a separate className/backgroundColor pair.
- Item images render through the shared `RestaurantItemImage` component (`components/ui/RestaurantItemImage.tsx`), which resolves an item-level `imagePresentation` override against a restaurant-level fallback via `lib/itemImagePresentation.ts`. Never hardcode a one-off restaurant image treatment inside a feature component — add/extend the restaurant's entry in `restaurantPresentation.ts` instead.
- Restaurant brand colors (e.g. `FeaturedRestaurantCard`) stay local to that card — never promoted into the global accent token.

## Macro display conventions

- Read colors/labels from `macroDisplayConfig`, never hardcode a macro's hex or label string.
- All macro numeric displays use `tabular-nums` so digits don't reflow.
- Carbs, protein, fat, calories keep one fixed color each across every surface (menu card, cart, item detail, View Build, export card) — never remap or introduce a second yellow/orange/etc. for the same macro.
- A "compact bar + click to open full detail" interaction (Macro Split, Protein Score) is the standard pattern for any macro summary that has more detail behind it — see `CLICKABLE_SECTION_CLASSNAME` in `SelectionSummaryPanels.tsx`.
- When a fixed-width element sits next to a variable-width one in the same row (e.g. Protein Score next to Macro Split), give the variable text a fixed column width (`grid-cols-[Npx_minmax(0,1fr)]`) rather than letting content width shift the neighboring section.

## Guidance for building new UI

1. **Reuse existing tokens.** Pull colors, spacing, radius, shadow, and typography from the tables above — don't invent a new value that's "close enough."
2. **Reuse existing primitives.** Check `components/ui/` before writing a new button/chip/badge/card/dialog/row.
3. **Reuse product patterns.** Check the Product Patterns table before writing new macro/menu/restaurant display logic.
4. **Extend before you create.** A new visual need is usually a new variant on an existing primitive (add a case to its `Record<Variant, string>`), not a new component.
5. **Avoid raw hex, arbitrary shadow, radius, spacing, or z-index values** (`bg-[#...]`, `shadow-[...]`, `rounded-[...]`, `z-[...]`) unless there's a documented reason (macro colors are the sanctioned exception — they're centralized in `macroColorTokens.ts`, not scattered).
6. **Preserve behavior when consolidating.** Migrating to a shared component must keep existing accessibility (aria labels, roles, focus handling), mobile/desktop differences, and animations intact.
7. **When in doubt, grep first.** Most "new" UI needs already exist somewhere in `components/ui/`, `components/nutrition/`, or `components/menu-item-card/` — search before building.

# Midnight Slate dark-mode review

Source: “Macro Maxxer dark mode variations.pdf”, Final Direction 4a, October 20, 2026. The seven-page specification was reviewed in the initial restaurant implementation. The homepage/footer follow-up uses its existing palette and tokens. This remains a scoped implementation, not app-wide visual approval.

## Current theme behavior

Light is the default for every first-time visitor, regardless of system appearance. Only a manually saved `dark` preference enables dark mode. Missing, invalid or inaccessible localStorage defaults to light. This supersedes the earlier device-following behavior.

The root-layout head script applies the preference before page content paints. A shared sun/moon footer pill selects either theme without reloading, highlights the active option, and exposes accessible button names and pressed states. All mounted controls subscribe to the same state. Preferences persist across page loads, client navigation and other tabs; blocked storage still permits session selection. Removing the saved preference returns to light.

## Homepage and footer fixes

- Hero: heading, eyebrow, body copy, decorative ranking/item cards and fallback search now have dark counterparts. Pale green/amber washes are suppressed or use existing slate surfaces; the dot texture uses the existing control-border token.
- Navigation/search: mobile navigation and browse drawer, sticky/static desktop navigation, hero search tabs/input/results, recent-search removal, builder results, Quick Add and the mobile global-search sheet use readable text, selected states and consistent slate surfaces.
- Featured restaurants: card surfaces, headings, descriptions, focus outlines, carousel arrows and pagination are themed. Restaurant photography, logos and brand CTA colors are unchanged.
- Walkthrough: all three steps, tabs, badges, ingredient controls, rows, separators, compact macros, meal totals and action links have dark treatments.
- Nutrition preview: device chrome, captions, badges, protein-score callout, macro chart and secondary action use existing tokens. Food images retain light wells, including overrides of inline restaurant image backgrounds.
- Shared small-caption classes now use readable slate-400 in dark mode. Compact fat values use existing slate-300 instead of the blue reserved for large stats. Large fat stats keep #336dfa. Macro segments use the specified saturated fills with slate-950 labels; the lowest label contrast is approximately 4.52:1 on blue.
- Footer: dark borders, panels, copy, labels, links and icon theme control are coherent with the page; the light green decorative glow is suppressed only in dark mode.
- Existing layout, spacing, typography and interactions are retained. Removing the added `dark:` utilities from the homepage source reproduces the previous source exactly. The requested footer toggle is the intentional control replacement. No new color palette was introduced.

## Verification

- TypeScript: passed (`npx tsc --noEmit`).
- Production build: passed (`npm run build`), with network access for existing Google Fonts.
- Theme behavior: six tests passed, including first visits on a dark device, invalid preferences, manual selection, reload persistence, cross-tab changes/clearing, blocked storage, multiple controls and subscription cleanup.
- Production route smoke checks: homepage, privacy, terms, restaurants, cart, search (redirects home) and Chick-fil-A all return successfully with pre-paint initialization and exactly one shared sun/moon footer control. This checks server output, not browser hydration or visual appearance.
- Full lint: 38 existing errors and 3549 warnings. Comparing all 51 modified tracked TypeScript files against HEAD found three diagnostics both before and after, with zero new diagnostics. New theme files/tests also pass lint.
- Full suite: 237/238 passed; one existing Chick-fil-A cheese/cart-resolution failure (`imagePresentation: undefined` versus absent property). No nutrition/cart logic or data was changed.
- `git diff --check`: passed.
- Desktop/mobile source audit covers base and responsive classes; homepage layout classes are unchanged. Browser screenshots, interactive hydration/navigation checks, both-theme viewport testing and physical-device QA remain blocked: no browser connector is available and native computer-use permission is not granted. They are outstanding checks, not passes.

## Remaining design and release checks

- Visually review both themes at mobile/tablet/desktop widths, all three walkthrough tabs, search query/results/loading/empty states, keyboard focus, the mobile drawer/search sheet and footer wrapping. Confirm the icon pill in a real browser before release.
- Restaurant directory, cart, legal pages, other restaurant builders, item/customization dialogs, cart drawers, confirmation/export dialogs and related sheets still need comprehensive dark-mode review. The globally applied preference and shared token inheritance do not certify every nested component.
- Protein-score elite/excellent/low tiers and slider tracks still need their own design pass.
- Proposed muted-panel, overlay-scrim and global focus-token changes remain deferred. Macro Split and caption fixes are now covered by the requested homepage nutrition audit; remaining detail/chart contexts still need visual review.
- Capacitor hides SiteFooter by existing design. It defaults to light and honors a saved manual choice, but a native theme-setting location needs review.

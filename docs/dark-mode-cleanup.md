# Dark-mode cleanup after merge

Preserves the approved Midnight Slate background/surface tokens, macro colors, layouts, spacing, type, image assets, and customization/sorting/cart logic. Light styles are retained except the explicitly requested neutral ranking icons and transparent app-logo wrappers.

## Changes

- Ranking: every metric icon is neutral gray in the trigger and desktop/mobile options; the overflow fade uses the dropdown surface in dark mode. Sorting, directions, keyboard navigation, and dismissal are unchanged.
- Logos: remove white wrapper fills from the Macro Maxxer mark in navigation, native home, footer, export, and social preview. Restaurant artwork retains white backgrounds. Shared image detection excludes the app mark.
- Protein Score: restrained tier surfaces, blue Excellent text, clearer Good supporting labels, and centralized neutral surfaces for Moderate. The existing tier order and green/blue/yellow/slate hierarchy remain.
- Restaurants: readable headings, descriptions and names; dark logo rail, card hover borders, and secondary actions. The merged layout is retained.
- Item customization: dark ingredient panels, portion controls, tabs/fades, selected rows, badges, nutrition panels, summary rows, and sticky macro/action footer.
- Cart: shared item controls, quantity steppers, empty states, headings, nutrition labels, dividers, confirmation dialogs, and export dialog chrome now adapt to dark mode. The existing drawer and Just Added popup inherit corrected shared controls and labels.
- Shared navigation/link/button states: dark ghost/pill buttons, native navigation, search scope links, category counts, sticky macro labels, and privacy/terms text/link hover states. Keyboard outlines use the theme foreground in dark mode.

## Verification

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm test`: all 367 tests passed (ranking, customization/nutrition, cart, theme, mobile controls, and other regression coverage).
- `npm run build`: passed with network access for the existing Google Fonts. The initial restricted-network attempt failed fetching Outfit and Unbounded.
- `git diff --check`: passed.
- No commit or merge performed.

## Manual visual QA still needed

No browser was connected to the available computer-use tool, so no rendered visual review was possible. Review desktop and narrow/mobile widths in both themes:

- Restaurants headings, moving logo rail, card badges, hover/focus, and View Menu actions.
- Rank By clipped/scrolling dropdown and bottom fade; all six metric icons; ascending/descending selection and keyboard dismissal.
- Each Protein Score tier and details sheet.
- Standard item, combo, and Chipotle preset customization: ingredient selections, removed ingredients, quantity/portion controls, tabs, footer, and nutrition recalculation.
- Cart drawer, Just Added popup, populated and empty My Meal, quantity/edit/remove actions, cross-restaurant confirmation, and export dialog.
- App logo transparency versus white restaurant-logo backgrounds in navigation/footer/native home/export/social preview.
- Light-mode visual comparison and keyboard focus on all affected controls.

## Files modified

- `app/cart/page.tsx`
- `app/globals.css`
- `app/privacy/page.tsx`
- `app/restaurant/[id]/opengraph-image.tsx`
- `app/restaurants/page.tsx`
- `app/terms/page.tsx`
- `components/DesktopNav.tsx`
- `components/DesktopRestaurantMenu.tsx`
- `components/EmptyStateCard.tsx`
- `components/GlobalMobileNav.tsx`
- `components/ItemDetailsPanel.tsx`
- `components/MenuItemCard.tsx`
- `components/MobileNavDrawer.tsx`
- `components/NativeBottomNav.tsx`
- `components/QuantityStepper.tsx`
- `components/SiteFooter.tsx`
- `components/StickyMacroTotalsBar.tsx`
- `components/cart/CartClearConfirmationDialog.tsx`
- `components/cart/CartControlButton.tsx`
- `components/cart/CartCustomizationSummary.tsx`
- `components/cart/CartItemsSection.tsx`
- `components/cart/CartMealBreakdown.tsx`
- `components/cart/CrossRestaurantCartDialog.tsx`
- `components/cart/ExportOrderDialog.tsx`
- `components/controls/RankOptions.tsx`
- `components/controls/ViewportMenu.tsx`
- `components/export/ExportOrderCard.tsx`
- `components/global-search/RestaurantScopeControl.tsx`
- `components/item-route-modal/CartItemPreviewContent.tsx`
- `components/item-route-modal/ItemModalStickyFooter.tsx`
- `components/item-route-modal/ItemRouteModal.tsx`
- `components/item-route-modal/PresetBuildReview.tsx`
- `components/item-route-modal/PresetHeaderPillButton.tsx`
- `components/item-route-modal/SelectionSummaryPanels.tsx`
- `components/native/NativeHomePage.tsx`
- `components/nutrition/MacroSplitDetails.tsx`
- `components/nutrition/NutritionFactsPanel.tsx`
- `components/nutrition/proteinScoreStyles.ts`
- `components/restaurant-view/RestaurantCategorySidebar.tsx`
- `components/ui/AppButton.tsx`
- `components/ui/SegmentedControl.tsx`
- `lib/logoPresentation.ts`
- `docs/dark-mode-cleanup.md` (this report).

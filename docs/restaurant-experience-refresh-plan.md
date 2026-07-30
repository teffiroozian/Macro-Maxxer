# Restaurant Experience Refresh — Implementation Plan

## Current Progress

- Slice 1: Audit and Shared Foundation — Next
- Slice 2: Restaurant Page Shell and Hierarchy — Planned
- Slice 3: Global Navigation Redesign — Planned
- Slice 4: Restaurant Secondary Navigation and Controls — Planned
- Slice 5: Menu-Item Card Redesign — Planned
- Slice 6: Full Menu Browsing Layout — Planned
- Slice 7: Entrée Selection and Builder Entry — Planned
- Slice 8: Responsive Restaurant Experience — Planned
- Slice 9: States, Accessibility, Consistency, and Testing — Planned

"Planned" means the slice has not started. "Next" means it is the active slice. "Completed" (used once slices finish) means the slice has been implemented and approved enough to move forward, not that it can never be touched again. Small cross-flow improvements may still surface during Slice 8 (responsive) and Slice 9 (final QA) if a whole-flow issue is identified.

## Source of Truth

- This document is the source of truth for restaurant-experience-refresh scope and slice order.
- Future implementation prompts — Claude, Codex, ChatGPT, or otherwise — should read this file before changing restaurant-flow or navigation code.
- Completed slices should not be reopened unless a later slice (8 or 9) specifically identifies a whole-flow issue.
- New decisions should be added to this file when they materially change the plan.
- This document records intent and decisions, not implementation detail. Inspect the actual repository code before making assumptions — the repository is the source of truth for current code.
- This plan is a sibling to [homepage-visual-refresh-plan.md](homepage-visual-refresh-plan.md). The homepage plan governs the marketing/discovery homepage; this plan governs everything a user reaches after choosing a restaurant. The visual language approved in the homepage plan's Slice 1 (typography, color roles, card/button treatment) is the starting point here and should carry into the app experience rather than being reinvented.

## Overview

The Macro Maxxer homepage has already gone through a visual refresh (see [homepage-visual-refresh-plan.md](homepage-visual-refresh-plan.md)). The restaurant browsing experience — standard menu pages, builder-based flows like Chipotle, and the navigation systems that connect them — has not received the same treatment and currently feels visually and structurally disconnected from the redesigned homepage.

This branch (`feature/restaurant-experience-refresh`) improves the restaurant browsing flow page by page so it feels polished, consistent with the homepage, and stronger in both UI and UX, without breaking existing menu, builder, search, or cart functionality.

## Primary Goal

Bring the restaurant experience to the same visual and interaction quality bar as the redesigned homepage, so that:

- moving from the homepage into a restaurant feels like one continuous product, not a handoff to an older UI
- restaurant identity, navigation, and menu browsing are clear and consistent across restaurants
- both simple menu restaurants (e.g. Chick-fil-A) and builder-based restaurants (e.g. Chipotle) share the same navigation, card, and layout language wherever their flows overlap
- the experience holds up across desktop, tablet, and mobile
- the flow remains fast, accessible, and functionally unchanged where no redesign is intended

## Known Areas In Scope (subject to confirmation in Slice 1)

Based on the current repository structure, the following areas are expected to be touched across this plan. Slice 1 should confirm, correct, and expand this list rather than treat it as final:

- Restaurant page shell: `app/restaurant/[id]/page.tsx`, `components/RestaurantView.tsx`, `components/RestaurantPageContent.tsx`
- Global navigation: `components/DesktopNav.tsx`, `components/GlobalMobileNav.tsx`, `components/MobileNavDrawer.tsx`
- Restaurant secondary navigation/controls: `components/StickyRestaurantBar.tsx`, `components/ControlsRow.tsx`, `components/restaurant-view/RestaurantCategorySidebar.tsx`, `components/controls/SelectorShell.tsx`, `components/controls/SortSelector.tsx`, `components/controls/ViewSelector.tsx`
- Menu browsing and cards: `components/MenuSections.tsx`, `components/MenuItemCard.tsx`, `components/menu-item-card/*`, `components/EmptyStateCard.tsx`
- Builder-based flows: `components/restaurant-view/chipotle/*` (`ChipotleRestaurantBuilderView.tsx`, `EntreeSelectionHero.tsx`, `ChipotleBuilderSection.tsx`, `KidsMealSelector.tsx`)
- Global search (as surfaced in-app, not on the homepage): `components/global-search/*`, `components/GlobalSearchContext.tsx`
- Cart entry points reachable from the restaurant flow: `components/cart/CartIconDropdown.tsx`, `components/cart/CartPreviewDrawer.tsx`
- Shared UI primitives: `components/ui/*` (`AppButton`, `AppIconButton`, `FilterChip`, `MacroBadge`, `RestaurantLogoBadge`, `SectionEyebrow`, `SurfaceCard`)

This plan does not cover the item detail page/modal (`app/restaurant/[id]/[itemSlug]`, `ItemDetailsPanel.tsx`) or the standalone cart page (`app/cart`) as primary targets, except where navigation or card components are shared with those surfaces. If shared components change, their effect on those surfaces must be checked, not redesigned.

## Approved Visual Direction (Carried Over From Homepage Slice 1)

- Unbounded for major display headings, Outfit for body copy, navigation, labels, controls, and dense UI
- soft green as the global Macro Maxxer accent; restaurant-specific brand colors stay scoped to restaurant contexts
- separate semantic colors for success/info/warning/error, distinct from macro-value colors
- consistent macro-color roles for calories, protein, carbohydrates, and fat, applied the same way everywhere a macro value appears
- strong card surfaces, restrained shadows, rounded corners, subtle interaction feedback
- product-led visuals over heavy food photography; utility-first, macro-focused direction

Whole-experience visual direction should not be reinvented per slice. Later slices extend this system; whole-flow visual changes belong in Slice 8 (responsive polish) or Slice 9 (final QA), not ad hoc in earlier slices.

---

# Slice 1: Audit and Shared Foundation — Next

## Purpose

Establish a shared, accurate understanding of the current restaurant flow before any visual changes are made, and decide which homepage visual patterns should carry into the app experience.

## Scope

- Review the current restaurant flow end to end: restaurant page shell, navigation, secondary controls, menu browsing, cards, and the Chipotle builder flow.
- Identify shared components versus restaurant-specific/one-off implementations, and flag components that should be consolidated (e.g. overlap between `components/MenuItemCard.tsx` and `components/menu-item-card/*`).
- Document inconsistencies between restaurants (e.g. Chick-fil-A's standard menu vs. Chipotle's builder flow) in layout, spacing, typography, and interaction patterns.
- Identify which homepage visual patterns (typography scale, card treatment, button/arrow interaction states, macro-color roles, background treatment) should carry into the restaurant flow, and which are homepage-specific and should not.
- Produce a short written inventory (in this document or a linked note) of: current component ownership, known inconsistencies, and confirmed/rejected carryover patterns.

## Out of Scope

- Any UI implementation or visual changes
- Any refactor of component boundaries (identify, do not yet execute)

## Status

Next. This slice's findings should be appended to this document (or linked from it) before Slice 2 begins.

---

# Slice 2: Restaurant Page Shell and Hierarchy — Planned

## Purpose

Improve the overall restaurant page structure so restaurant identity and content feel intentional and consistent with the homepage's visual language.

## Scope

- Restaurant identity presentation (name, logo, brand color usage) at the top of the restaurant page
- Heading hierarchy and typography consistent with the approved type system
- Spacing and content width/max-width consistency across restaurants
- Background treatment for the restaurant shell, consistent with (but not identical to) the homepage's ambient/dotted treatment
- Overall visual hierarchy: what a user sees first, second, and third on landing in a restaurant

## Constraints

- Preserve existing routing and data-loading behavior (`app/restaurant/[id]/page.tsx`, `RestaurantView.tsx`, `RestaurantPageContent.tsx`)
- Do not redesign navigation or secondary controls here — those are Slices 3 and 4
- Do not redesign menu-item cards here — that is Slice 5

## Out of Scope

- Global navbar changes
- Category/sort/filter control changes
- Card-level redesign

## Status

Planned.

---

# Slice 3: Global Navigation Redesign — Planned

## Purpose

Refresh the main app navbar so it feels consistent with the redesigned homepage and works well across every restaurant and page it appears on.

## Scope

- Logo treatment and placement, consistent with homepage logo handling
- Restaurant navigation (how a user gets from one restaurant to another, or back to the homepage)
- Global search entry point and behavior in the navbar context (`components/global-search/*`, `GlobalSearchContext.tsx`)
- Cart entry point in the navbar (`components/cart/CartIconDropdown.tsx`)
- Desktop navbar layout (`components/DesktopNav.tsx`)
- Mobile navbar and drawer (`components/GlobalMobileNav.tsx`, `components/MobileNavDrawer.tsx`)
- Interaction states: hover, focus, active/selected, open/closed drawer states

## Constraints

- Preserve existing search, cart, and routing behavior — this is a visual and interaction-consistency pass, not a rebuild of search or cart logic
- Keyboard accessibility and visible focus states are required, not optional

## Out of Scope

- Rebuilding global search matching/ranking logic
- Rebuilding cart state management
- Restaurant-specific secondary navigation (Slice 4)

## Status

Planned.

---

# Slice 4: Restaurant Secondary Navigation and Controls — Planned

## Purpose

Redesign the restaurant-specific toolbar that sits below the global navbar, covering menu/category navigation and menu controls.

## Scope

- Menu and category navigation (`components/restaurant-view/RestaurantCategorySidebar.tsx`, or equivalent in-page category controls)
- Sorting controls (`components/controls/SortSelector.tsx`)
- View/filter controls (`components/controls/ViewSelector.tsx`, `components/controls/SelectorShell.tsx`, `FilterChip.tsx`)
- The combined controls row as used today (`components/ControlsRow.tsx`)
- Sticky behavior of the restaurant bar while scrolling (`components/StickyRestaurantBar.tsx`)
- Dropdown behavior and styling consistency
- Mobile presentation of the same controls (collapsed/condensed states, touch targets)

## Constraints

- Preserve existing sort/filter logic and state; this is a presentation and interaction layer pass
- Sticky behavior must not visually conflict with the redesigned global navbar from Slice 3

## Out of Scope

- Menu-item card visuals (Slice 5)
- Full menu layout/category organization (Slice 6)

## Status

Planned.

---

# Slice 5: Menu-Item Card Redesign — Planned

## Purpose

Design and implement a stronger, reusable item-card system with clearer nutrition hierarchy, used across both standard menus and builder flows wherever a card-style item is shown.

## Scope

- Reusable card system covering the concerns currently spread across `components/MenuItemCard.tsx` and `components/menu-item-card/*` (`MenuItemCardHeader.tsx`, `MenuItemMacroSummary.tsx`, `MenuItemVariantControls.tsx`, `MenuCardActions.tsx`, `CartCardActions.tsx`, `IngredientCompactCard.tsx`)
- Clearer nutrition hierarchy using the established macro-color roles (calories, protein, carbs, fat)
- Image presentation, including graceful handling of missing images
- Badges (e.g. dietary tags, high-protein indicators) consistent with homepage badge/pill treatment
- Primary and secondary actions (add to cart, customize, view detail)
- Expanded/detail states for cards that reveal more information in place

## Constraints

- The card system must work for both simple items (Chick-fil-A) and configurable/builder items (Chipotle ingredients, variants) without forking into unrelated designs
- Reuse rather than duplicate existing macro-badge and surface-card primitives (`components/ui/MacroBadge.tsx`, `components/ui/SurfaceCard.tsx`) where they fit

## Out of Scope

- Full menu page layout and category organization (Slice 6)
- Entrée/builder entry flow redesign (Slice 7)

## Status

Planned.

---

# Slice 6: Full Menu Browsing Layout — Planned

## Purpose

Apply the new card system across full restaurant menus and improve how menus are organized and browsed.

## Scope

- Category organization and section layout (`components/MenuSections.tsx`)
- Spacing and rhythm across long menu lists
- Filtering feedback (what the user sees when filters/sorts are applied, including result counts and active-filter indication)
- Scrolling behavior, including interaction with sticky controls from Slice 4
- Empty states (`components/EmptyStateCard.tsx`) for no-results/filtered-to-zero scenarios

## Constraints

- Preserve existing filter/sort logic; this slice is about layout, organization, and feedback, not new filtering capability

## Out of Scope

- Entrée selection/builder entry (Slice 7)
- Responsive-specific refinement beyond baseline desktop layout (Slice 8)

## Status

Planned.

---

# Slice 7: Entrée Selection and Builder Entry — Planned

## Purpose

Refresh builder-entry pages like Chipotle's entrée selector, and generalize the pattern into a reusable entry experience for any restaurant with a build-your-own menu.

## Scope

- Chipotle entrée selection hero and flow (`components/restaurant-view/chipotle/EntreeSelectionHero.tsx`, `ChipotleBuilderSection.tsx`, `ChipotleRestaurantBuilderView.tsx`)
- Kids meal / alternate builder entry points (`components/restaurant-view/chipotle/KidsMealSelector.tsx`)
- A reusable "builder entry" pattern that other build-your-own restaurants could use in the future, extracted from the Chipotle-specific implementation rather than designed from scratch in the abstract
- Consistency with the new menu-item card system (Slice 5) wherever builder steps present item-like choices

## Constraints

- Do not change builder state logic (`useChipotleBuilderState.ts`, `useChipotleMenuControlAdjustments.ts`) — this is a presentation and flow-clarity pass
- Chipotle remains the only real consumer of the reusable pattern today; do not invent a second builder restaurant to validate it

## Out of Scope

- Adding new builder capability (extra steps, new customization types)
- Full menu layout (already covered in Slice 6)

## Status

Planned.

---

# Slice 8: Responsive Restaurant Experience — Planned

## Purpose

Refine the complete restaurant flow across tablet and mobile now that desktop layout, navigation, cards, and builder entry are in place.

## Scope

- Global and restaurant navigation on tablet/mobile (drawer behavior, condensed controls)
- Category and filter controls at reduced widths
- Card density and layout at mobile widths
- Sticky control behavior on mobile (avoiding overlap with browser chrome, cart drawer, etc.)
- Touch interactions (dragging, tapping targets, no hover-dependent functionality)

## Responsive Review

Test and refine across:

- mobile phones
- larger phones
- tablets
- laptops
- wide desktop screens

## Out of Scope

- New functionality
- Reopening desktop-approved visual direction from earlier slices unless a genuine whole-flow issue is found

## Status

Planned.

---

# Slice 9: States, Accessibility, Consistency, and Testing — Planned

## Purpose

Finish the remaining functional states and validate the complete restaurant experience as one cohesive, accessible, cross-restaurant-consistent flow.

## States to Finish

- Loading states (menu data, builder steps, search)
- Error states (failed data loads, network issues)
- Empty states (no menu items, filtered-to-zero results)
- Missing-data states (missing images, missing nutrition fields, unsupported restaurant configurations)

## Accessibility Review

- All interactive elements keyboard accessible
- Logical tab order and heading hierarchy
- Visible focus indicators
- Appropriate alt text for logos and meaningful images; decorative visuals hidden from assistive tech
- Status not communicated by color alone
- Adequate touch target sizing
- Motion respects reduced-motion preferences

## Functional and Consistency QA

- Navigation, sort, filter, and cart behavior work correctly across both standard-menu and builder-based restaurants
- Sticky behavior (navbar + restaurant controls) works correctly while scrolling on every reviewed breakpoint
- Cross-restaurant visual consistency: two structurally different restaurants (Chick-fil-A, Chipotle) should still feel like the same product
- No console errors
- No regressions in search, cart, or routing behavior established before this branch

## Final Acceptance Criteria

The restaurant experience refresh is complete when:

- the restaurant flow feels visually and structurally consistent with the redesigned homepage
- standard-menu and builder-based restaurants share the same navigation and card language
- desktop, tablet, and mobile experiences are all complete
- keyboard navigation and accessibility requirements are met
- existing search, cart, sort, filter, and builder logic remain functional
- there are no major visual, accessibility, or console issues

## Status

Planned.

---

# Shared Constraints Across All Slices

## Preserve Existing Functionality

Do not break or unnecessarily rebuild:

- restaurant routing and data loading
- menu sorting and filtering logic
- Chipotle builder state and customization logic
- global search matching/ranking logic
- cart state, cart drawer, and cart page behavior

## Avoid Unrelated Scope

Do not include unrelated work such as:

- new restaurant data or new restaurants
- user accounts, favorites, or saved meals
- a personalized dashboard or recommendations
- analytics infrastructure
- item detail page/modal redesign (`ItemDetailsPanel.tsx`) unless a shared component change forces a review
- standalone cart page (`app/cart`) redesign beyond shared-component effects
- dark mode
- a complete rebrand

These should be handled as separate features.

## Implementation Approach

For every slice:

1. Inspect the current implementation before changing code.
2. Reuse existing components and design patterns where appropriate, including patterns already approved in the homepage refresh.
3. Avoid large unrelated refactors.
4. Keep the slice independently reviewable.
5. Test desktop and mobile behavior.
6. Confirm existing functionality still works.
7. Stop after the slice is complete so it can be visually reviewed before moving forward.

## Visual Refinement Rule

Minor design refinement is expected during each slice.

However, do not repeatedly reinvent the restaurant experience's overall visual direction after it is established (informed by Slice 1's audit and the carried-over homepage direction). Later slices should extend the established system rather than introduce unrelated typography, spacing, colors, card treatments, or visual styles. Whole-flow visual changes belong in Slice 8 or Slice 9, not in ad-hoc changes during other slices.

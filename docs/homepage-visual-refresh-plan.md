# Homepage Visual Refresh — Implementation Plan

## Current Progress

- Slice 1: Homepage Visual Prototype — Completed
- Slice 2: Featured Restaurants — Completed
- Slice 3: Product Walkthrough — Next
- Slice 4: Menu-Item Discovery — Planned
- Slice 5: Responsive, Interaction, and Visual Polish — Planned
- Slice 6: Accessibility and Final QA — Planned
- Slice 7: Final Homepage UI Refinement — Planned

"Completed" means the slice has been implemented and approved enough to move forward, not that it can never be touched again. Small cross-page improvements may still happen during the later polish slices (Slice 5 and Slice 7) if a whole-page issue is identified.

## Source of Truth

- This document is the source of truth for homepage visual-refresh scope and slice order.
- Future implementation prompts — Claude, Codex, ChatGPT, or otherwise — should read this file before changing homepage code.
- Completed slices (1 and 2) should not be reopened unless a later polish slice (5 or 7) specifically identifies a whole-page issue.
- New decisions should be added to this file when they materially change the plan.
- This document records intent and decisions, not implementation detail. Inspect the actual repository code before making assumptions — the repository is the source of truth for current code.

## Overview

The Macro Maxxer homepage currently provides basic restaurant search and navigation, but it does not visually represent the quality or usefulness of the rest of the application.

This update should redesign the homepage into a modern, polished, and visually engaging product experience while keeping it fast and easy to use.

The homepage should remain a practical tool rather than becoming an oversized marketing landing page.

## Primary Goal

Create a search-first homepage that:

- makes it easy to find and open a restaurant
- clearly communicates what Macro Maxxer does
- feels modern, polished, and professionally designed
- uses the product interface and macro information as major visual elements
- helps first-time users understand the complete product
- remains efficient for returning users
- scales as more restaurants and menu data are added

## Approved Visual Direction (Established in Slice 1)

### Typography

- Unbounded for major display headings
- Outfit for body copy, navigation, labels, controls, and dense UI

### Color System

- soft green as the global Macro Maxxer accent
- restaurant-specific brand colors are used only inside restaurant contexts (e.g. the Featured Restaurants cards), not globally
- separate semantic colors exist for success, information, warning, and error — these are not reused for macro values
- consistent macro-color roles are used for calories, protein, carbohydrates, and fat, applied the same way anywhere a macro value appears

### Visual Treatment

- subtle dotted texture and ambient green treatment in the hero
- product-led visuals instead of heavy food-photography dependence
- modern, clean, utility-first, macro-focused visual direction
- strong card surfaces, restrained shadows, rounded corners, and subtle interaction feedback

The page should rely primarily on product visuals, restaurant branding, interface elements, and macro data. Food photography may be used selectively, but it should not dominate the design or make Macro Maxxer resemble a food-delivery application.

The background system beyond the hero is still expected to receive another pass during the polishing slices (Slice 5 and Slice 7) — it is not considered finished yet.

## Current Proposed Page Structure

1. Search-first hero
2. Featured restaurants
3. Product walkthrough
4. Menu-item discovery
5. Footer

The navigation and homepage search functionality may already be handled by another feature branch. Preserve all completed search behavior while working on the visual refresh.

---

# Slice 1: Homepage Visual Prototype — Completed

## Purpose

Establish and validate the visual language for the homepage before building every section. This slice was used to establish the visual language rather than finish all homepage content.

## Final Decisions

- the hero remains search-dominant; search is the strongest action in the hero
- floating metric pills were added to the hero for:
  - High Protein
  - Low Calorie
  - High Fiber
- each pill uses:
  - a small icon
  - a bold black category label
  - a category-colored macro value
  - unchanged item and restaurant text
- restaurant logo assets and wrappers were audited and corrected
- the shared logo treatment now supports different brand-mark shapes without distortion
- heading width was increased so major H2 headings can fit on one line where space allows
- the typography system was finalized (Unbounded for display headings, Outfit for everything else)
- initial color roles and shared visual tokens were established (global accent, semantic colors, macro-color roles)
- button and arrow interactions were refined (hover/active feedback, cursor, focus states)

## Constraints Observed

- existing search functionality was preserved
- not every remaining homepage section was built in this slice
- restaurant-card metadata was not finalized solely to fill space
- excessive gradients, shadows, animations, and decorative elements were avoided
- the prototype stayed visually connected to the internal Macro Maxxer pages
- the design looked intentional with only two supported restaurants

## Status

Completed and approved. This slice established the shared visual language — typography, color roles, card and button treatment, hero pills, and logo handling — used by all subsequent slices. Do not reopen unless a later polish slice (5 or 7) identifies a whole-page issue.

---

# Slice 2: Featured Restaurants — Completed

## Purpose

Create the primary browsing section beneath the hero so users can quickly open supported restaurants without using search.

## Final Implementation

Section framing:

- a section-level live-count pill above the heading, using the original rounded white pill style with a green status dot
- a wider H2 heading treatment

Carousel behavior:

- one large, centered active restaurant card
- partial neighboring-card previews on either side of the active card
- no autoplay — content never changes without user action
- arrow controls
- horizontal touch dragging on mobile
- scroll snapping so cards settle into the centered position
- a centered indicator made of short horizontal lines, one per restaurant
  - the active line is filled/darker
  - inactive lines are very muted
  - no restaurant names or logos appear in the indicator

Card system:

- one reusable card component driven by restaurant data
- equal card dimensions
- image panel on the left, content panel on the right
- the restaurant logo overlaps the image/content divider, vertically aligned with the restaurant name
- `FEATURED RESTAURANT` is restored inside the card, above the restaurant identity
- a clear View Menu CTA

## Rejected / Removed Approaches

- a standard equal-card grid
- a large active card with named selector buttons beneath it
- timed/automatic rotation
- a detached "Also Live" Chipotle card
- selector cards beneath the carousel

## Current Restaurant Coverage

The section currently supports Chick-fil-A and Chipotle. The card system and carousel should scale to additional restaurants without requiring a redesign.

## Interaction Requirements

- arrows, dragging, snapping, and the indicator all stay synchronized
- no content changes without user action
- carousel controls are keyboard accessible
- hover shadows must not be clipped by parent overflow
- overflow is handled structurally rather than with excessive padding
- arrow controls have a pointer cursor, hover/active feedback, and true vertical centering

## Status

Completed and approved. Do not reopen unless a later polish slice (5 or 7) identifies a whole-page issue.

---

# Slice 3: Product Walkthrough — Next

## Purpose

Explain the complete Macro Maxxer experience through one connected product story rather than several unrelated marketing sections.

This section must be built directly after Featured Restaurants and before the current menu-item/product-preview section.

The walkthrough should help first-time users understand that Macro Maxxer supports more than simple restaurant browsing.

## Core Product Journey

The walkthrough should communicate three connected stages:

### 1. Find and Compare

Show how users can explore a restaurant menu and identify useful options through:

- highest-protein sorting
- protein-to-calorie comparison
- lower-calorie sorting
- menu categories
- nutrition filters
- other existing menu-discovery tools

### 2. Customize and Build

Show how users can create an order by:

- adjusting ingredients
- changing quantities or portions
- building customizable meals
- building restaurant combos
- adding sides, sauces, drinks, and extras
- seeing nutrition values update

### 3. Review the Complete Order

Show how users can add items to the cart and review:

- total calories
- total protein
- total carbohydrates
- total fat
- individual items
- selected customizations
- the complete restaurant order

## Presentation Approach

Default to an interactive tabbed showcase: selectable Find, Customize, and Review controls with one large visual area that updates based on the selected stage, plus concise supporting copy for each stage.

Use a simpler static three-step layout (Find → Customize → Review, one product preview per stage, desktop row / mobile stacked) only if implementation review shows it is clearer, more accessible, or meaningfully simpler than the tabbed approach. Do not add interactivity only for decoration.

## Visual Requirements

- use real Macro Maxxer UI, or simplified product-preview versions, based on:
  - restaurant menu sorting and filtering
  - builders, combos, or ingredient customization
  - cart and total macro review
- do not redesign the internal pages being previewed
- avoid generic illustrations that do not reflect the actual application
- keep copy concise
- let product previews provide most of the explanation
- use the visual language established in Slice 1
- make the sequence easy to understand without requiring interaction
- avoid turning the section into a long technical tutorial

## Functional Requirements

When links or buttons are included, they should lead to real and relevant product pages.

Interactive controls must support:

- keyboard access
- visible focus states
- clear selected states
- reduced-motion preferences where applicable

## Out of Scope

- redesigning the demonstrated product pages
- inventing unsupported product functionality
- building user onboarding
- account-based personalization
- rebuilding menu sorting, builders, or cart logic

---

# Slice 4: Menu-Item Discovery — Planned

## Purpose

End the main homepage content with useful, real product data rather than another explanation section.

This section should show visitors examples of what they can discover through Macro Maxxer.

A temporary bottom preview exists on the homepage today as a placeholder. It does not lock in the final card design for this slice — the final design should be evaluated fresh against the requirements below.

## Final Card Requirements

The final homepage item cards should:

- feel related to the real menu cards used elsewhere in the app
- use the same macro order, terminology, and visual language as the real application
- be simplified for homepage discovery rather than showing full item detail
- avoid an unrelated four-block macro design if it does not match the real application's card language
- link into the correct restaurant or item flow

## Possible Section Concepts

Potential names include:

- Macro-Friendly Picks
- High-Protein Picks
- Explore Menu Picks
- Featured Menu Items

The final title should match the actual selection logic.

## Possible Content Categories

The section may include a small curated set of real menu items, such as:

- a high-protein option
- an efficient protein-to-calorie option
- a lower-calorie option with meaningful protein
- a customizable or build-your-own meal

The final categories should reflect actual application behavior and available data.

## Card Requirements

Each item card should display useful information such as:

- item name
- restaurant name or logo
- calories
- protein
- relevant ranking or category
- clear action to view the item or restaurant

Avoid filling the cards with unnecessary nutrition details.

## Data Requirements

Prefer using real restaurant data rather than duplicating hardcoded nutrition values.

If curated item identifiers must be configured manually, keep the selection separate from the raw nutrition data and document where it is maintained.

The section should handle:

- unavailable or removed items
- missing images
- varying item-name lengths
- restaurants with different item types
- future additions without significant component rewrites

## Interaction Requirements

- cards should link into the existing restaurant or item flow
- interactions should use existing routing patterns
- keyboard and focus behavior must be supported
- mobile interaction should not depend on hover

## Out of Scope

- personalized recommendations
- account-based meal suggestions
- location-based recommendations
- real-time popularity rankings
- analytics-driven content
- creating new restaurant or item data

---

# Slice 5: Responsive, Interaction, and Visual Polish — Planned

## Purpose

This is the dedicated whole-page polishing slice. It should refine the completed page rather than introduce major new product sections.

## Scope

- final section spacing and visual rhythm
- background improvements across the complete page
- subtle section banding
- soft ambient gradients
- selective dotted or grid textures
- restrained decorative shapes
- smoother section transitions
- removal of awkward empty space
- card, button, arrow, tab, indicator, hover, focus, and pressed-state consistency
- desktop, tablet, and mobile refinements
- motion and reduced-motion behavior
- whole-page visual consistency

## Responsive Review

Test and refine:

- mobile phones
- larger phones
- tablets
- laptops
- wide desktop screens

Review:

- container widths
- text wrapping
- heading size
- search prominence
- section spacing
- restaurant-card layout
- walkthrough layout
- menu-item cards
- footer structure

## Interaction States

Complete and standardize:

- hover states
- keyboard-focus states
- pressed states
- selected states
- disabled states where applicable
- transitions
- subtle entrance or state-change animations

Motion should:

- support understanding
- remain fast
- avoid delaying navigation
- avoid distracting from search
- respect reduced-motion preferences

## UX Review

Verify that:

- a user can search immediately
- a user can browse featured restaurants quickly
- explanatory sections do not interrupt primary use
- links lead to the expected destination
- cards clearly appear interactive
- mobile users do not rely on hover
- section order still feels natural

## Out of Scope

- major page restructuring
- introducing new homepage features
- changing underlying restaurant functionality
- redesigning the visual system established in Slice 1

---

# Slice 6: Accessibility and Final QA — Planned

## Purpose

Validate the completed homepage as one cohesive experience and resolve remaining usability, accessibility, visual, and technical issues.

## Accessibility Review

Verify:

- all interactive elements are keyboard accessible
- tab order follows the visual page order
- focus indicators are visible
- headings use a logical hierarchy
- links and buttons use appropriate semantics
- restaurant logos and meaningful visuals have appropriate alternative text
- decorative visuals are hidden from assistive technology
- status is not communicated through color alone
- text and controls have appropriate contrast
- touch targets are adequately sized
- motion respects reduced-motion preferences

## Functional QA

Verify:

- homepage search still behaves correctly
- existing navigation remains functional
- restaurant cards route correctly
- product-walkthrough links route correctly
- menu-item discovery links route correctly
- browser back and forward navigation work correctly
- no existing search or restaurant behavior has regressed
- missing or incomplete data fails gracefully
- there are no console errors

## Visual QA

Review the complete page for:

- consistent typography
- consistent container alignment
- consistent spacing
- balanced section rhythm
- consistent cards, buttons, and badges
- unnecessary empty areas
- overcrowded areas
- awkward transitions between sections
- responsive layout problems
- visual consistency with the rest of Macro Maxxer

## Performance Review

Check for:

- unnecessarily large images
- layout shifts
- excessive client-side JavaScript
- avoidable duplicated components
- animation performance issues
- unnecessary homepage data loading

Optimize only where there is a meaningful issue. Avoid unrelated refactoring.

## Final Acceptance Criteria

The homepage redesign is complete when:

- search remains the clearest primary action
- supported restaurants are easy to browse
- the page clearly communicates the complete product journey
- real menu-item data demonstrates the product's value
- the page feels modern, polished, and cohesive
- the page does not feel like an oversized marketing site
- the design works intentionally with two restaurants
- the layout can scale as restaurants are added
- mobile and desktop experiences are both complete
- keyboard navigation works throughout
- existing search and restaurant flows remain functional
- there are no major visual, accessibility, or console issues

---

# Slice 7: Final Homepage UI Refinement — Planned

## Purpose

Perform one last design-focused review after every functional homepage section is complete and visible together.

This slice exists because some UI decisions can only be judged accurately once the entire homepage is assembled.

## Scope

May include:

- improving sections that still feel visually weak
- refining section composition
- adjusting background treatments
- improving visual hierarchy
- reducing repetition
- replacing temporary visuals
- refining copy where the layout exposes weaknesses
- improving card balance and density
- tightening typography details
- improving transitions between sections
- making the full page feel cohesive and intentionally art-directed
- removing anything that feels overdesigned, underdesigned, or inconsistent

## Constraints

- do not add major new functionality
- do not reopen completed product logic
- do not redesign internal restaurant, builder, or cart pages
- do not use the slice as an excuse for broad unrelated refactoring
- prioritize visible homepage quality and cohesion

## Completion Criteria

- the homepage feels visually complete as one experience
- no section looks like a temporary prototype
- the visual language is consistent from hero to footer
- backgrounds, spacing, cards, and interactions feel intentional
- the page remains utility-first
- search and restaurant access remain the strongest actions
- the page is visually engaging without becoming cluttered
- no regressions are introduced after the final refinement

---

# Shared Constraints Across All Slices

## Preserve Existing Functionality

Do not break or unnecessarily rebuild:

- homepage search
- navbar search
- restaurant routing
- restaurant detail pages
- menu sorting and filtering
- builders and customization
- cart behavior

## Avoid Unrelated Scope

Do not include unrelated work such as:

- user accounts
- favorites
- saved meals
- a personalized dashboard
- analytics infrastructure
- restaurant-data expansion
- internal-page redesigns
- advanced directory filters
- dark mode
- a complete rebrand

These should be handled as separate features.

## Implementation Approach

For every slice:

1. Inspect the current implementation before changing code.
2. Reuse existing components and design patterns where appropriate.
3. Avoid large unrelated refactors.
4. Keep the slice independently reviewable.
5. Test desktop and mobile behavior.
6. Confirm existing functionality still works.
7. Stop after the slice is complete so it can be visually reviewed before moving forward.

## Visual Refinement Rule

Minor design refinement is expected during each slice.

However, do not repeatedly reinvent the homepage's overall visual direction after Slice 1 is approved.

Later slices should extend the established system rather than introduce unrelated typography, spacing, colors, card treatments, or visual styles. Whole-page visual changes belong in Slice 5 or Slice 7, not in ad-hoc changes during other slices.

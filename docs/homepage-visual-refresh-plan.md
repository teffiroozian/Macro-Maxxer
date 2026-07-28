# Homepage Visual Refresh — Implementation Plan

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

## Visual Direction

The homepage should combine:

### Clean nutrition utility

- clear and easy to scan
- practical and trustworthy
- focused on user actions
- restrained rather than overly decorative

### Modern macro product

- stronger typography and contrast
- visually interesting nutrition information
- polished cards and interface previews
- a clear Macro Maxxer identity
- subtle depth, backgrounds, and motion

The page should rely primarily on product visuals, restaurant branding, interface elements, and macro data.

Food photography may be used selectively, but it should not dominate the design or make Macro Maxxer resemble a food-delivery application.

## Current Proposed Page Structure

1. Search-first hero
2. Featured restaurants
3. Product walkthrough
4. Menu-item discovery
5. Footer

The navigation and homepage search functionality may already be handled by another feature branch. Preserve all completed search behavior while working on the visual refresh.

---

# Slice 1: Homepage Visual Prototype

## Purpose

Establish and validate the visual language for the homepage before building every section.

This slice should produce a representative visual prototype, not a completed homepage.

The goal is to answer:

> Does this visual direction feel appropriate for Macro Maxxer, and can it be reused across the entire homepage?

## Scope

Inspect the existing homepage and establish:

- page background treatment
- maximum content width
- typography hierarchy
- heading and body-text scale
- section spacing and vertical rhythm
- card surface treatment
- border and shadow approach
- corner-radius system
- button and link presentation
- badge and label styles
- macro-related accent treatment
- basic hover and focus behavior

Implement enough representative content to test the system:

- the updated homepage foundation
- the existing hero in its updated visual context
- one representative restaurant card
- one representative product-preview block
- any shared styles or components required by those examples

## Important Constraints

- Preserve the existing search functionality.
- Search must remain the strongest action in the hero.
- Do not build every remaining homepage section yet.
- Do not finalize questionable restaurant-card metadata solely to fill space.
- Avoid excessive gradients, shadows, animations, or decorative elements.
- The prototype must still feel connected to the internal Macro Maxxer pages.
- The design must look intentional with only two supported restaurants.

## Visual Review Checkpoint

Before continuing to the next slice, review whether:

- the homepage is noticeably more polished than before
- the visual language feels appropriate for a real product
- search remains visually dominant
- the typography feels strong and cohesive
- the page is visually interesting without being crowded
- the cards and surfaces feel consistent
- the macro focus is visible
- the same design language can support the remaining sections
- the hero and the content beneath it feel like one connected page
- the page works visually with the current restaurant count

Continue refining this slice until the overall direction is approved.

Small spacing, shadow, or padding details may remain for final polish. Fundamental uncertainty about the typography, page style, layout, or overall direction should be resolved before proceeding.

## Out of Scope

- complete restaurant grid
- complete product walkthrough
- complete featured-menu-item section
- final animations
- full responsive polish
- redesigning internal restaurant pages
- changing search behavior

---

# Slice 2: Featured Restaurants

## Purpose

Create the primary browsing section beneath the hero so users can quickly open supported restaurants without using search.

## Scope

Build a visually polished featured-restaurant section that:

- displays supported restaurants only
- works intentionally with the current two-restaurant state
- scales as more restaurants are added
- uses equal-sized cards unless a stronger functional reason is discovered
- provides clear navigation into each restaurant
- follows the visual system established in Slice 1

## Section Naming

Until real analytics exist, use an honest label such as:

- Featured Restaurants
- Explore Restaurants
- Available Restaurants

Do not label the section “Popular Restaurants” unless the ordering is based on real usage data.

In the future, analytics may rank restaurants using signals such as:

- restaurant-page visits
- search frequency
- menu-item engagement
- repeat visits
- recent increases in activity

Analytics implementation is not part of this slice.

## Restaurant Card Requirements

Each card should include:

- restaurant logo
- restaurant name
- clear clickable behavior
- an obvious hover and keyboard-focus state
- visual treatment appropriate to the restaurant brand
- a layout that works consistently across different restaurant names and logos

Restaurant cards do not need unnecessary facts simply to fill space.

The following types of metadata are currently unresolved and should not be introduced without a clear user benefit:

- total number of menu items
- highest-protein item
- best protein score
- generic claims about the restaurant
- arbitrary descriptive tags

It is acceptable for the first version of the card to rely on branding, composition, and interaction rather than secondary facts.

## Current Restaurant State

With only Chick-fil-A and Chipotle available:

- use two intentional, well-balanced cards
- do not add large disabled cards to fill the layout
- do not give unavailable restaurants equal visual importance
- ensure the section does not appear broken or unfinished

As restaurants are added, the section should expand into a responsive grid without requiring a redesign.

## Responsive Requirements

- cards should remain readable and easy to tap on mobile
- the layout should scale cleanly from two cards to a larger collection
- card imagery and logos should not become distorted
- spacing should remain consistent with the overall page system

## Out of Scope

- full restaurant directory
- analytics implementation
- advanced restaurant sorting
- restaurant filtering
- coming-soon card grid
- redesigning restaurant detail pages

---

# Slice 3: Product Walkthrough

## Purpose

Explain the complete Macro Maxxer experience through one connected product story rather than several unrelated marketing sections.

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

### 2. Customize and Combine

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

## Possible Presentation

The implementation may use one of these approaches:

### Option A: Interactive showcase

- selectable Find, Customize, and Review controls
- one large visual area that changes with the selected stage
- concise supporting copy for each stage

### Option B: Three-step layout

- Find → Customize → Review
- one product preview for each stage
- desktop row and mobile stacked layout

Choose the approach that best balances clarity, implementation complexity, accessibility, and visual impact.

Do not add interactivity only for decoration. The simpler three-step layout is acceptable if it explains the product more clearly.

## Visual Requirements

- use real Macro Maxxer UI where practical
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

# Slice 4: Menu-Item Discovery

## Purpose

End the main homepage content with useful, real product data rather than another explanation section.

This section should show visitors examples of what they can discover through Macro Maxxer.

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

# Slice 5: Responsive and Interaction Polish

## Purpose

Refine the completed homepage so it feels intentional across screen sizes and interaction methods.

This slice should improve the existing work rather than introduce major new sections or redesign the page again.

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

# Slice 6: Accessibility and Final QA

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
- real menu-item data demonstrates the product’s value
- the page feels modern, polished, and cohesive
- the page does not feel like an oversized marketing site
- the design works intentionally with two restaurants
- the layout can scale as restaurants are added
- mobile and desktop experiences are both complete
- keyboard navigation works throughout
- existing search and restaurant flows remain functional
- there are no major visual, accessibility, or console issues

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

However, do not repeatedly reinvent the homepage’s overall visual direction after Slice 1 is approved.

Later slices should extend the established system rather than introduce unrelated typography, spacing, colors, card treatments, or visual styles.
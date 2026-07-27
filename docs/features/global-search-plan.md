# Global Search — Remaining Slices

## Current status

Completed:
- Slice 1: Homepage hero restaurant search
- Slice 2: Navbar global restaurant search
- Slice 3: Global menu-item search
- Slice 4: Current-restaurant search
- Slice 5: Global navigation consistency
- Slice 6: Item-result behavior in every context

Current:
- Slice 7

Pending:
- Slices 8–10

### Slice 6 decisions/deviations

- Standard menu-item results now branch on whether the current page is the
  item's own restaurant page: if so, the existing intercepted `@modal` route
  is used (unchanged); otherwise the item modal opens locally (new
  `GlobalItemPreviewContext`/`useItemPreviewModal`, mounted app-wide in
  `app/layout.tsx`) with no navigation and no history entry, reusing
  `ItemRouteModal`'s existing `closeBehavior="local"` mode (the same pattern
  the cart page already used for editing existing cart items).
- Discovered `components/home/RestaurantSearch.tsx` (the homepage hero
  widget) was a second, independent copy of the select-item/select-ingredient
  handlers rather than going through `useGlobalSearchState` — it had the same
  bugs and needed the same fix, applied directly (not deduplicated into one
  shared implementation — out of scope for this slice, flagged for Slice 10
  cleanup).
- `handleStartBuild` now explicitly pushes `?view=ingredients` instead of
  relying on the restaurant page's implicit default-view behavior.
- `ItemRouteModal`'s root z-index raised from `220` to `235` (Global Search's
  overlay/dropdown sit at `228`–`230`; `CartClearConfirmationDialog` already
  used `240`, so `235` avoids both).

---

## Slice 6: Item-result behavior in every context

### Goal

Make sure restaurant, menu-item, and builder-ingredient results open the correct existing flow from every place Global Search is used.

### Contexts that must work

- Homepage hero
- Sticky/global nav search
- Restaurant pages
- Entrée-selection pages
- Build-your-own entry pages
- Cart page

### Expected behavior

Restaurant result:
- Opens the correct restaurant page.
- Search closes cleanly before navigation.

Standard menu-item result:
- Opens the existing item detail/modal flow.
- Reuses the current customization and add-to-cart system.
- Does not create a duplicate item-detail system.
- Search closes before the item flow opens.
- The item modal should not appear behind the search panel.

Cart-page behavior:
- Uses the correct local modal behavior where needed.
- Returning from the item flow should leave the cart in a sensible state.

Builder-ingredient result:
- Shows Start a Build.
- Opens the correct restaurant builder or entrée-selection flow.
- Does not add the ingredient directly to the cart.
- Ingredient preselection remains deferred.

Routing and browser history:
- Browser Back should behave correctly.
- Search should not remain open behind another route or modal.
- Opening and closing results should not create duplicate or broken history entries.

### Success criteria

- Every result type opens correctly from every supported page context.
- Search closes cleanly before navigation or modal opening.
- Existing item customization and cart behavior are reused.
- Builder ingredients open the correct builder flow.
- Browser Back behaves predictably.
- No duplicate item modal, builder, or routing system is introduced.

---

## Slice 7: Cross-restaurant cart confirmation

### Goal

Create one shared cart rule for adding an item from a restaurant that is not already represented in a nonempty cart.

### Trigger

Example:

Cart contains Taco Bell items
→ user attempts to add a McDonald's item
→ confirmation appears

This must apply to every add-to-cart path:

- Restaurant-page Add to Cart
- Item modal Add to Cart
- Global Search Quick Add
- Any other shared cart-add action

### Confirmation options

Cancel:
- Do not add the new item.
- Leave the cart unchanged.

Add Anyway:
- Keep all current cart items.
- Add the new item.
- Allow the cart to contain multiple restaurants.

Replace Cart:
- Remove all current cart items.
- Add only the new item.

### Architecture requirement

- Implement this as one shared add-to-cart rule or hook.
- Do not duplicate confirmation logic inside each component.
- Existing success feedback should appear only after the item is actually added.
- Cancel must not trigger an Added state.

### Success criteria

- Every add-to-cart path uses the same confirmation.
- Cancel, Add Anyway, and Replace Cart all work correctly.
- Mixed-restaurant carts remain valid after Add Anyway.
- Replace Cart clears old items and adds the new one.
- Success feedback only appears after a completed add.

---

## Slice 8: Group cart items by restaurant

### Goal

Make mixed-restaurant carts easy to understand by grouping items beneath restaurant headings.

### Expected layout

Taco Bell
- Crunchwrap
- Baja Blast

McDonald's
- Fries

### Requirements

- Always show the restaurant heading, even when the cart contains only one restaurant.
- Preserve the existing order of items within each restaurant group.
- Keep all current item controls working:
  - quantity changes
  - edit
  - removal
  - item dropdowns
- Keep overall cart nutrition totals calculated across the full cart.
- Restaurant grouping must not change cart data storage unnecessarily.
- Grouping should be a presentation layer over the existing cart items where possible.

### Success criteria

- Single-restaurant carts show one clear restaurant heading.
- Mixed carts are separated into clear restaurant groups.
- Editing, removing, and changing quantities still work.
- Cart totals and macros remain correct.

---

## Slice 9: Quick Add with variant selection

### Goal

Allow eligible standard menu items to be added directly from Global Search without opening the full item modal.

### Eligible fixed items

A straightforward standard item with no required choices can show:

- View Item
- Quick Add

Quick Add should:
- add the item immediately
- update cart totals and count
- reuse the existing Just Added feedback
- keep Global Search open

### Eligible variant-only items

Items with simple sizes or variants may also use Quick Add.

Expected result behavior:

- Show a small inline variant selector.
- Default variant is preselected.
- User may choose another variant.
- Displayed nutrition updates to match the selected variant.
- Quick Add adds the selected variant.

Reuse the existing variant system and cart-payload helpers.

### Items excluded from Quick Add

Do not show Quick Add for items involving:

- required add-ons
- combo configuration
- configurable ingredients
- build-your-own flows
- restaurant-specific builder logic
- required choices beyond a simple variant

These items show:

- View Item

Builder ingredients show:

- Start a Build

### Cross-restaurant behavior

Quick Add must use the shared Slice 7 confirmation automatically.

### Success criteria

- Fixed eligible items Quick Add correctly.
- Variant-only items allow variant selection and add the chosen variant.
- Nutrition changes with the selected variant.
- Complicated items do not show Quick Add.
- Builder ingredients never show Quick Add.
- Existing added-to-cart feedback is reused.
- Search remains open after a successful Quick Add.

---

## Slice 10: Cleanup, accessibility, testing, and polish

### Goal

Finish the Global Search feature by removing old behavior, fixing edge cases, and validating the full system.

### Cleanup

- Remove obsolete homepage-only search code after parity is confirmed.
- Remove old anchor-link search behavior.
- Remove duplicate matching and result logic.
- Remove abandoned temporary components.
- Remove remaining old Restaurants links/dropdowns where applicable.
- Confirm Coming Soon restaurants remain excluded from Global Search.

### Accessibility

Verify:

- Keyboard navigation through results
- Enter selects a result
- Escape closes search
- One outside click closes search
- Focus moves into the search input when opened
- Focus remains when switching Restaurants/Menu Items tabs
- Focus returns to the correct trigger when closed
- Visible focus states
- Correct dialog/listbox semantics where applicable
- Body scroll locking while search is open

### Responsive polish

Check:

- Homepage hero
- Sticky nav
- Restaurant pages
- Entrée-selection pages
- Build-your-own entry pages
- Cart page
- Desktop
- Tablet
- Mobile

### Search states

Complete and verify:

- Empty state
- Recently searched restaurants
- Recently searched menu items
- Popular restaurants
- No-results state
- Current-restaurant scope
- All-restaurants scope
- Builder-ingredient results
- Long item names
- Long restaurant names
- Many results and scrolling

### Regression testing

Confirm existing behavior still works:

- Restaurant menu filtering
- Sorting and nutrition filters
- Item modals
- Builders
- Cart editing
- Cart totals
- Browser Back
- Navigation
- Recent-search persistence

### Out of scope

- Fuzzy or typo-tolerant matching
- Search state in the URL
- Shareable search links
- Builder ingredient preselection
- Advanced nutrition-language queries

### Success criteria

- No obsolete search code remains.
- Global Search works consistently across all supported pages.
- Keyboard and focus behavior are reliable.
- Mobile and desktop interfaces are polished.
- Existing cart, menu, builder, and routing behavior still works.
- Relevant tests and manual checks pass.

---

## Workflow rule

For each slice:

1. Implement one slice only.
2. Do not begin the next slice.
3. Report files changed.
4. Report behavior completed.
6. Give manual acceptance checks.
7. Wait for approval.
8. Update this file:
   - mark the completed slice as complete
   - mark the next slice as current
   - record any decisions or deviations
9. Commit only after approval.

Use this file as the source of truth in future Claude sessions.

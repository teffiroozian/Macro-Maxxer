# Browser observations — MOD Pizza

October 20, 2026, America/Los_Angeles. Read-only navigation and transient customization selections; no cart addition or checkout.

- Direct entry to https://orders.modpizza.com/store/4080 initially yielded an empty accessibility tree. Console logs included React hydration errors and a TypeError reading `label` in the ordering bundle.
- Navigated to https://orders.modpizza.com/, entered public ZIP 40509, and searched. Result: Hamburg, 2217 War Admiral Way, Lexington, KY 40509; Order Pickup link https://orders.modpizza.com/store/4080/Hamburg. No user geolocation was requested or transmitted.
- Following that pickup link loaded the catalog successfully, with Pizza, Salads, Sides, Desserts, Kids Meal, Beverages, Extras, and a separate Catering link.
- Opened The MOD. URL: https://orders.modpizza.com/store/4080/Hamburg/121706/Pizza/112938647/The%20MOD%20 . Five crust choices appeared.
- Selected Regular thin crust: displayed 467 Cals. Sauces and Cheeses were required, each allowing 1–8 options including No Sauce / No Cheese.
- Selected Tomato Sauce: Regular was selected by default; total 472 Cals. Light / Regular / Extra controls appeared.
- Selected Extra: sauce displayed 7 Cals; total changed to 474 Cals.
- Ordering footer qualifies calorie values as topping additions to standard preparation for a one-topping item, potentially lower on multi-topping items.
- No protein, carbohydrate, or fat readout appeared in the inspected customization state.
- The browser tool exposed DOM, logs, and asset capabilities, but no network capture/HAR API. Direct HTTP and public bundle analysis supplied the structured-source evidence instead.

These are recorded observations, not a raw network capture or screenshot archive.

# Restaurant menu and ranking counts

The header and restaurant directory count canonical top-level public menu
items through `getCanonicalMenuItemCount`. Internal `sourceOnly` records are
excluded and parent IDs are counted once. Ranking expansion never contributes
to this count.

The controls row uses `getMenuResultCounts`:

- **X** counts ranking results matching all applied category, variant,
  nutrition and search filters.
- **Y** counts the current category pool under the active metric and variant
  settings, before nutrition/search restrictions. This makes `X of Y` useful
  when refining nutrition without presenting the full restaurant as the scope.
- Neither count includes internal records or duplicate candidate identities.
- Real size/count and recipe expansion follows the Variants settings. Identical
  size macros are deduped, and the chosen grouping representatives are fixed
  before nutrition filtering.

These counts intentionally differ from an all-restaurant header. No restaurant
specific counting rules or fixed counts are used.

McDonald's previously displayed 133 canonical parents versus 142 grouped
ranking rows over its entire catalog. Eight extra rows came from treating
`Extra Small` and `Kids` as recipe labels; the generic size grammar now
recognizes those labels. The remaining National/California milk distinction is
kept as a real variant distinction. With size grouping and recipe separation,
the entire McDonald's ranking pool has 134 rows. Default Protein ranking with
Main entrées selected has 46 rows; grouping its sizes reduces that scope to 42.

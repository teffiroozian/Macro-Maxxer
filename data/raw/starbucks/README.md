# Starbucks raw sources

This directory contains only authoritative Starbucks source data.

- `menu.json` is the consolidated US ordering snapshot. It embeds the national
  category tree and all 282 collected product/form API responses, including
  product numbers, SKUs, sizes, nutrition, default recipes, customization trees,
  option quantities/limits, images, and other menu metadata.
- `provenance.json` records the menu checksum and provenance for each retained
  official nutrition/allergen PDF.
- `ireland/` and `uk/` contain the current official regional nutrition/allergen
  PDFs available at collection time. They are regional references and must not
  be treated as US nutrition sources.

Historical sources, previous per-product captures, reports, audits, and inference
work are archived under `data/research/starbucks/`. Validate the consolidated menu
with `python3 scripts/analyze/starbucks-catalog-index.py`.

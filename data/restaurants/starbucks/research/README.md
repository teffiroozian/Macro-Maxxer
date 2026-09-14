# Starbucks research archive

This directory contains the Starbucks reverse-engineering findings and reusable
evidence retained after cleanup.

- `captures/interactive-legacy/` retains exact nutrition-calculation requests and
  responses, customization evidence, relevant first-party client code, and modifier
  audits. Duplicate product/catalog captures and failed retries were removed.
- `captures/interactive/capture-plan.json` is the reusable collection plan.
- `experiments/` contains equation datasets and recipe-component inference results.
- `reports/` contains findings about recipes, customization rules, nutrition
  calculation behavior, modifier inference, and Starbucks API behavior.

Nothing here is an importer source of truth. Current source data lives in
`data/raw/starbucks/`.

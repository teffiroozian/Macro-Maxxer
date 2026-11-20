---
name: restaurant-normalization
description: Integrate restaurant extraction evidence with Macro Maxxer's existing adapter and normalization engine.
---

Inspect the central workflow run and its extraction pair. Follow the [adapter integration guide](../../../docs/phase-3/import-workflow.md) for a missing adapter. Reuse the universal `AdapterOutput` and existing adapter mappings where applicable. Add only source-specific item, serving and ordering mappings. Preserve unlinked and conflicting evidence in the match report.

Use the extraction-backed pipeline to project draft IDs and runtime relationships in staging. Treat missing values as absent and dated values as evidence awaiting verification. See [nutrition standards](../../../docs/nutrition-data-quality-standards.md) for the governing rules.

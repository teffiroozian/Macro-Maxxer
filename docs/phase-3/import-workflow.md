# Restaurant import workflow

From the repository root, run one command to prepare a staged review.

```sh
npm run pipeline -- import mod --replay --enrich
npm run pipeline -- import chipotle --live --browser --record
npm run pipeline -- import --help
```

The command runs discovery, extraction, normalization, validation, optional enrichment, and publication review in order. It reuses the existing stage commands and defaults to replay. Use explicit `--live` for authorized reads from official public sources. Only MOD has a configured replay at present. The browser option uses the existing passive collection rules.

Each run prints its ID and writes to `data/restaurants/staging/<restaurant>/imports/<run-id>/`. Start with `import-run.json`, then read `discovery.md` and `extraction.md` for source evidence and `normalization/publication-review.md` for owner decisions. The extraction pair and normalization reports stay together in that run. Standalone commands still use their original paths.

## When the run stops

- Discovery uses its existing request budget and deeper investigation pass. `--max-requests` sets the base budget. Each stage also has a five-minute ceiling and runs once.
- If discovery yields no sources or extraction yields no records, inspect the staged findings before trying again. Change the input or the collection conditions first. A blocked request is a source gap and remains subject to the existing access rules.
- A partial extraction continues when other sources produce records. Review the gaps, disputed servings and held records in the reports. Missing nutrients remain absent and dated observations stay flagged. A completed review can contain zero eligible records.
- `--research-only` stops after extraction. It collects evidence even when normalization support is missing.

## Integrate another restaurant

The full workflow currently recognizes extraction adapters for MOD and Chipotle. The McDonald's, Starbucks and Chick-fil-A adapters still work through the existing raw-input pipeline. A restaurant without an extraction adapter receives a capability error before collection unless research-only mode was requested.

```sh
npm run pipeline -- import example --research-only --live \
  --name "Example Restaurant" --domain example.com
```

1. Add a target in `scripts/discovery/targets.ts` for repeatable collection, or pass the target options directly.
2. Implement a translator from `ExtractionInput` to the existing `AdapterOutput` in `scripts/pipeline/adapters/`. Reuse the restaurant's existing mappings, where available. Preserve source and serving links and record exclusions in the disposition map when applicable.
3. Register the restaurant ID, adapter ID and translator in `scripts/pipeline/extraction-adapters.ts`. Reuse the engine, audit, enrichment and projection as-is. Use staged evidence and existing fixtures to verify the mapping. The review keeps an unregistered publication target blocked for integration. To test a new mapping with an existing research run, use `npm run pipeline -- <adapter-id> --from-extraction --run-id <research-run-id>`.

## Agent handoff and approval

The repository registers Research, Developer and QA profiles in `.codex/agents/` and four skills in `.agents/skills/`. Research hands over the source gaps and run ID. Developer integrates missing mappings. QA reviews the same staged artifacts and reports findings before owner review. The CLI runs independently of an agent session.

The workflow stops at review. The existing publisher is a separate owner-controlled action. When authorized, its optional `--run-id <id>` selects the exact completed live run. All existing approval, eligibility, freshness, baseline, locking and archive checks still apply. The publisher remains limited to eligible independent Chipotle panels. See the [publication contract](../phase-2/publication.md) and [nutrition standards](../nutrition-data-quality-standards.md).

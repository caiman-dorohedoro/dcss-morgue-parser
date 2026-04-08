# dcss-morgue-parser

Monorepo for a Dungeon Crawl Stone Soup morgue parser and the collection pipeline used to validate it against real public-server samples.

This repository is organized so that:

- `packages/parser` can become the publishable npm package
- `apps/pipeline` can keep collecting, sampling, and reviewing real morgues
- `fixtures/` can stay shared between parser development and pipeline QA

## Repository Layout

```text
dcss-morgue-parser/
  README.md
  AGENTS.md
  docs/

  packages/
    parser/

  apps/
    pipeline/

  fixtures/
    morgue/
    xlog/
```

## What Lives Where

- [`packages/parser`](./packages/parser/README.md)
  - browser-safe parser library
  - structured JSON output
  - parser model and schema history
- [`apps/pipeline`](./apps/pipeline/)
  - xlog/logfile discovery
  - raw morgue fetching
  - stratified sampling and QA workflows
- [`fixtures/morgue`](./fixtures/morgue/)
  - focused parser regressions
  - full morgue goldens
  - expected JSON snapshots prefixed with `focused-` or `full-`
- [`docs`](./docs/meta--catalog.md)
  - project-level provenance, QA workflow, and maintenance strategy docs

## Quick Start

Install workspace dependencies:

```bash
npm install
```

Typecheck everything:

```bash
npm run typecheck
```

Run parser/pipeline tests:

```bash
npm test
```

Build the publishable parser package:

```bash
npm run build
```

Collect and parse a QA sample:

```bash
npm run bootstrap -- --server CBRG,CDI,CXC,CAO,CBR2,CNC,CPO --per-bucket 10 --min-xl 10 --data-dir ./data/bootstrap-stratified-xl10 --fresh --verbose --timeout-ms 30000
```

This workspace command runs inside `apps/pipeline`, so `--data-dir ./data/bootstrap-stratified-xl10` resolves to `apps/pipeline/data/bootstrap-stratified-xl10` from the repository root. The current active server ids are `CBRG`, `CNC`, `CDI`, `CXC`, `CBR2`, `CAO`, `LLD`, and `CPO`. This example uses a broader practical subset of `CBRG`, `CDI`, `CXC`, `CAO`, `CBR2`, `CNC`, and `CPO`, while intentionally skipping `LLD`; `CUE` is not part of the current active manifest. `--timeout-ms 30000` is an operational cushion for this geographically broader run, not a claim that `CXC` is intrinsically slower everywhere.

For the full QA sampling flag set, see [docs/workflow--qa.md](./docs/workflow--qa.md). That document now covers deterministic vs random sampling, `--seed`, `--skip-first`, and xlog metadata filters such as `--species`, `--background`, and `--god`, including the `--god none` case for games that ended without a god.

## Key Documents

- [Documentation Catalog](./docs/meta--catalog.md)
- [Parser Model](./packages/parser/docs/parser_model.md)
- [Parser Design Changelog](./packages/parser/docs/parser_changelog.md)
- [Pipeline Origin](./docs/origin--pipeline.md)
- [Raw Morgue Collection](./docs/origin--raw-morgue-collection.md)
- [QA Workflow](./docs/workflow--qa.md)
- [Fixture Strategy](./docs/strategy--fixture.md)
- [Implementation Notes](./docs/notes--implementation.md)

## Notes worth preserving

- most development was done in VS Code with the ChatGPT Codex extension. ChatGPT 5.4 with extra high thinking was the primary model used
- the raw morgue acquisition and public-server sampling workflow was informed by the `dcss-stats` repository
- public-server fetches used per-host politeness defaults: host concurrency `1`, queue interval cap `1`, and a minimum delay of `2000 ms` between requests; logfile discovery and morgue fetches shared the same host-level limit

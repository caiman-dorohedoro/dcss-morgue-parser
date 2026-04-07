# dcss-morgue-parser

Monorepo for a Dungeon Crawl Stone Soup morgue parser and the collection
pipeline used to validate it against real public-server samples.

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
  - shared parser fixtures
  - full morgue goldens
  - expected JSON snapshots
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
npm run bootstrap -- --server CAO,CBR2,CNC --per-bucket 10 --min-xl 10 --data-dir /tmp/dcss-parser-qa --fresh --verbose
```

## Key Documents

- [Documentation Catalog](./docs/meta--catalog.md)
- [Parser Model](./packages/parser/docs/parser_model.md)
- [Parser Design Changelog](./packages/parser/docs/parser_changelog.md)
- [Pipeline Origin](./docs/pipeline_origin.md)
- [Raw Morgue Collection](./docs/raw_morgue_collection.md)
- [QA Workflow](./docs/qa_workflow.md)
- [Fixture Strategy](./docs/fixture_strategy.md)
- [Implementation Notes](./docs/implementation_notes.md)

## Provenance

This repository grew out of parser and pipeline work originally done inside the
broader `dcss-stats` repository.

Notes worth preserving:

- a lot of the parser and QA iteration was done in VS Code with the Codex
  extension
- GPT-5.4 was used heavily during parser design, schema refinement, and
  regression cleanup
- the raw morgue acquisition and public-server sampling workflow was informed by
  the `dcss-stats` repository, especially the original `dcss-morgue-pipeline`
  implementation used to fetch morgues and compare parsed output against real
  samples

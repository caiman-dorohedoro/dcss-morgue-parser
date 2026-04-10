# dcss-morgue-parser

Parses DCSS morgue text into structured JSON. Works in Node.js and browsers.

## Usage

```bash
npm install dcss-morgue-parser
```

```ts
import { parseMorgueText } from 'dcss-morgue-parser'

const result = parseMorgueText(morgueText)

if (result.ok) {
  console.log(result.record) // species, background, god, skills, equipment, spells, mutations, etc.
} else {
  console.error(result.failure.reason)
}
```

See [packages/parser README](./packages/parser/README.md) for full API details.

## Structure

| Path | Description |
|------|-------------|
| [`packages/parser`](./packages/parser/README.md) | Publishable parser library |
| [`apps/pipeline`](./apps/pipeline/) | QA pipeline: collects and samples morgues from public servers |
| [`apps/web`](./apps/web/) | Local viewer: paste a morgue, see parsed output |
| [`fixtures/`](./fixtures/) | Test fixtures |
| [`docs/`](./docs/meta--catalog.md) | Project docs |
| `crawl/` | Upstream Crawl source submodule (optional) |

## Development

```bash
npm install
npm test          # tests
npm run build     # build parser
npm run typecheck # typecheck
npm run web:dev   # local viewer
```

### QA sample collection

Collect and parse morgues from public DCSS servers:

```bash
npm run bootstrap -- --server CBRG,CDI,CXC,CAO,CBR2,CNC,CPO \
  --per-bucket 10 --min-xl 10 --data-dir ./data/sample --fresh --verbose
```

The pipeline enforces a minimum 2-second delay between requests per host to avoid putting load on public servers. See [QA Workflow](./docs/workflow--qa.md) for all sampling options.

## Docs

- [Documentation Catalog](./docs/meta--catalog.md) — index of all project documents
- [Parser Model](./packages/parser/docs/parser_model.md) — what the parser outputs and why

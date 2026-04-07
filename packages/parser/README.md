# dcss-morgue-parser

Browser-safe DCSS morgue parser package intended to be publishable on npm.

It parses morgue text into structured JSON in a browser-safe way. The parser does not fetch files, touch the filesystem, or depend on SQLite.

## Status

This package lives inside the `dcss-morgue-parser` monorepo alongside:

- the collection and QA pipeline in `apps/pipeline`
- shared fixtures in `fixtures/`
- project-level provenance and workflow docs in `../../docs/`

## Installation

```bash
npm install dcss-morgue-parser
```

## Usage

```ts
import { parseMorgueText } from 'dcss-morgue-parser'

const result = parseMorgueText(morgueText)

if (result.ok) {
  console.log(result.record.playerName)
  console.log(result.record.species)
  console.log(result.record.background)
  console.log(result.record.skills.fighting)
  console.log(result.record.effectiveSkills.fighting)
} else {
  console.error(result.failure.reason, result.failure.detail)
}
```

The parser ships with a built-in canonical spell vocabulary. Callers can also supplement it:

```ts
parseMorgueText(morgueText, {
  canonicalSpellNames: [
    "Iskenderun's Mystic Blast",
    'Construct Spike Launcher',
  ],
})
```

## Output Highlights

The parser favors reusable semantic fields over presentation-only strings.

Examples:

- exact morgue version via `version`
- canonicalized `species` plus `speciesVariant` where useful
- `background`
- `xl`, `ac`, `ev`, `sh`, and base stats
- `skills` and `effectiveSkills`
- structured `mutations`
- slot summary fields plus equipment `...Details`
- property bags split into:
  - `properties`
  - `intrinsicProperties`
  - `egoProperties`
  - `artifactProperties`

More detail:

- [Repository Documentation Catalog](../../docs/meta--catalog.md)
- [Parser Model](./docs/parser_model.md)
- [Parser Design Changelog](./docs/parser_changelog.md)
- [Pipeline Origin](../../docs/origin--pipeline.md)
- [Raw Morgue Collection](../../docs/origin--raw-morgue-collection.md)
- [QA Workflow](../../docs/workflow--qa.md)
- [Fixture Strategy](../../docs/strategy--fixture.md)
- [Implementation Notes](../../docs/notes--implementation.md)

## Scope

This package only parses morgue text.

It deliberately does not:

- fetch raw morgues from servers
- discover xlog candidates
- manage caches or politeness queues
- write datasets or database state

Those concerns belong in a wrapper or pipeline around the parser.

## Development Notes

This package was prepared from the parser work maintained in the broader `dcss-stats` repository and then moved into this dedicated monorepo.

Project notes worth preserving in this dedicated public monorepo:

- a lot of the recent parser iteration was done in VS Code with the Codex extension
- GPT-5.4 was used heavily during parser design, regression cleanup, and schema refinement
- raw morgue acquisition and server-sampling ideas were informed by the `dcss-stats` repository, especially `dcss-morgue-pipeline`, which was used as the reference implementation for fetching morgues from Crawl servers and validating parsed output against real samples

## Local Development

From the monorepo root:

```bash
npm install
npm run typecheck -w packages/parser
npm run build -w packages/parser
npm run pack:dry -w packages/parser
```

## Release Checklist

Before publishing:

1. choose a license and replace `LICENSE.md`
2. update `package.json` metadata such as repository URL
3. run `npm run typecheck`
4. run `npm run build`
5. run `npm run pack:dry`
6. verify the exported `dist/` contents and README render correctly

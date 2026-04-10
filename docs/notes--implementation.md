# Implementation Notes

This note captures the implementation-side lessons that were worth keeping from the early `dcss-morgue-pipeline` build plan.

The original plan was task-oriented and agent-oriented. This rewritten note keeps the useful engineering guidance and removes outdated file names and old schema assumptions.

## Build the Parser as a Small Core

One of the best early decisions was to treat the parser as a small core instead of wiring it directly into collection code.

That meant:

- no filesystem dependency in parser code
- no network dependency in parser code
- no SQLite dependency in parser code
- string input in, typed result out

That separation is why the parser can now be reused from browser code and why a publishable npm package fits naturally in this monorepo.

## Prefer Extractor Stages Over One Big Regex Pass

The parser benefited from staged extraction:

1. base stats
2. equipment
3. skills
4. mutations
5. spells
6. strict validation

This kept edge-case fixes local and made it easier to turn raw bug reports into focused tests.

## Full Morgues Matter More Than Tiny Snippets

Tiny extractor tests are still useful, but most of the real regressions came from interactions between sections:

- wrapped `A:` lines
- spell-table truncation
- artefact property formatting
- Poltergeist haunted auxiliary slots
- melded gear and talisman/form interactions

That is why the current test strategy relies heavily on full morgue golden fixtures and not only small unit snippets.

## Let the Crawl Data Model Shape the Parser

A recurring lesson was that the parser became more reliable whenever it moved toward Crawl's own semantics.

Examples:

- distinguish armour `ego` from jewellery `subtypeEffect`
- keep `artifactKind` separate from raw or display names
- split `properties` into intrinsic, ego, and artefact sources
- preserve `speciesVariant` when canonical `species` intentionally loses detail

This made the parser more useful for downstream tools and reduced later schema rework.

## QA Is Not Optional

The parser got noticeably better only after repeated loops of:

1. collect real morgues from public servers
2. export raw and parsed pairs
3. compare them manually
4. turn bugs into fixtures and tests

That workflow is now part of the documentation because it directly influenced the current schema and extractor behavior.

## Keep Sampling Separate From Success

The pipeline should not treat "selected for this run" and "successfully fetched and parsed" as the same state.

If sampled markers are written before fetch and parse complete, a transient network failure or a temporarily missing morgue can become a silent long-term omission.

The safer rule is:

- select candidates first
- fetch and parse them
- mark them sampled only after successful processing

This keeps retry behavior straightforward and avoids forcing recovery through manual cache resets.

## Keep One Parser Boundary

The monorepo works better when `packages/parser` is the only parser boundary that other apps depend on.

That means:

- export parser-facing types and helpers from one public entry point
- avoid duplicating parser types inside pipeline code
- avoid thin re-export wrappers that only mirror parser internals

This keeps parser refactors local and makes it easier to change internals without touching pipeline and web imports everywhere.

## Validate Discovery Metadata Against Morgues

Xlog metadata is useful for finding candidate games, but the morgue itself is
the authoritative final snapshot.

That means the pipeline should:

- reject parsed morgues whose player name disagrees with the candidate metadata
- treat a cached fetch success as reusable only while its local file still exists
- record read failures as candidate-level parse failures instead of aborting the whole run

Those checks keep cache drift and bad URL resolution from silently turning into
"successful" parsed rows.

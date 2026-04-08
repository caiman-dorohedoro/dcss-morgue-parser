# Parser Debugging Workflow

This note captures the practical loop that has been most useful when checking
whether a real morgue is parsed correctly.

It complements `docs/workflow--qa.md`. That document explains how to collect a
sample. This one explains how to inspect that sample and turn findings into
reproducible parser work.

## 1. Start From Real Samples

Use the pipeline to collect live morgues first.

The important part is not the exact command but the shape of the sample:

- multiple servers
- stable and trunk coverage when useful
- filters such as `--min-xl`, `--species`, `--background`, or `--god` when you
  want to stress a specific slice
- a dedicated `--data-dir` when you want a clean review set

For collection commands and flag meanings, use `docs/workflow--qa.md`.

## 2. Export Review Pairs

Do not debug from the database alone.

After a run, export each successful parse into a review directory where every
case has:

- `raw.txt`
- `parsed.json`

The useful shape is:

```text
apps/pipeline/data/<run-name>/review/<SERVER>/<BUCKET>/<ENDED_AT>__<PLAYER>/
```

The goal is simple: raw morgue and parsed JSON must be visible side by side.

## 3. Read The Files Directly

When trying to decide whether parsing is correct, prefer direct reading over an
automatic diff first.

Why:

- morgues use abbreviations such as `MiFi`, `GrEE`, or `PoHs`
- inventory lines can contain alias prefixes such as `A - ...: G - ...`
- some sections wrap awkwardly across lines
- a naive comparison script can report false positives even when the parser is
  correct

Automatic comparison can still be useful later, but the first pass should be
human review of the actual files.

When raw and parsed output are still ambiguous, check the upstream Crawl source
locally instead of guessing.

This repository keeps an optional `crawl/` git submodule for that purpose. If
it is not initialized yet, run:

```bash
git submodule update --init crawl
```

The most useful source areas during parser debugging have been:

- `crawl/crawl-ref/source/`
- `crawl/crawl-ref/source/dat/forms/`
- `crawl/crawl-ref/source/mutation-data.h`

Use that lookup sparingly and only to answer semantics questions such as:

- whether a parenthesized `A:` entry means a suppressed trait
- whether a trait is form-based or location-dependent
- whether a current-form property comes from the transformation or an innate mutation

## 4. Compare High-Signal Sections First

For each `raw.txt` / `parsed.json` pair, compare these areas in order:

1. Header summary
   - `species`
   - `speciesVariant`
   - `background`
   - `xl`
   - `AC`, `EV`, `SH`
   - `Str`, `Int`, `Dex`
   - final god shown in the morgue
2. Equipped items
   - weapon / offhand
   - armour slots
   - Octopode ring layout
   - talisman and current form
   - Poltergeist haunted or melded state
3. Mutation and status lines
   - `A:` mutations
   - `@:` form or status line when relevant
4. Spell sections
   - memorized spells
   - spell library
   - truncation recovery for long spell names
   - `Failure = N/A` or other unusual rows
5. Skills
   - `skills`
   - `effectiveSkills`

This order catches most real bugs quickly.

## 5. Classify What You Found

When something looks wrong, classify it before touching code.

Common cases:

- parser bug
  - raw morgue is clear
  - parsed field is wrong or missing
- fetch problem
  - morgue was never fetched
  - pipeline summary may show a failure that is not a parser failure
- schema or naming confusion
  - the parser may be internally consistent, but a field name is easy to
    misread
  - example: `orb` currently refers to orb-slot equipment, not `Orb of Zot`
- comparison-tool false positive
  - raw uses abbreviations or wrapped lines
  - the parser is correct, but a helper script matched the wrong thing

This classification matters because only the first case should lead directly to
parser changes.

## 6. Turn A Real Bug Into A Fixture

When a parser bug is confirmed:

1. save the raw morgue as a fixture if it is small enough or already suitable
2. add a focused regression if the bug is isolated to one extractor
3. update the golden expected JSON when the output intentionally changes
4. document the behavior change in parser docs when the schema meaning changed

Useful fixture locations:

- `fixtures/morgue/focused`
- `fixtures/morgue/full`
- `fixtures/morgue/expected`

Useful parser docs:

- `packages/parser/docs/parser_model.md`
- `packages/parser/docs/parser_changelog.md`

## 7. Re-run The Same Case

After fixing a bug, re-run the exact morgue that exposed it.

That is the fastest way to answer the only question that matters:

- did the parsed output for this morgue actually improve?

Then run the parser test suite and, when helpful, sample another live batch.

## 8. Keep Notes About Why A Case Was Interesting

A short note is often enough.

Examples:

- `talisman summary overrides inventory state`
- `spell library unusable rows preserved`
- `functional inscriptions separated from free text`
- `manual review confirmed parser was correct; comparison helper was wrong`

These notes make future QA passes much faster because the same edge cases recur.

## Working Rule

The most reliable debugging loop for this project is:

1. collect live morgues
2. export `raw.txt` and `parsed.json`
3. read the pair directly
4. classify the discrepancy
5. only then change parser code
6. re-run the same morgue and the relevant tests

That loop has been more reliable than starting from a broad automated diff,
because Crawl morgues contain enough abbreviations, wrapped lines, and special
cases that human reading is often needed to decide what is actually wrong.

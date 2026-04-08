# Fixture Strategy

The parser uses two complementary test styles:

- focused extractor tests
- full morgue golden fixtures

Both are necessary.

Under `fixtures/morgue/`, that maps to:

- `focused/` for targeted text regressions
- `full/` for complete raw morgues
- `expected/` for expected structured JSON

Expected JSON stays in one flat directory, but the file names encode the source fixture type:

- `focused-*.json` for fixtures under `focused/`
- `full-*.json` for fixtures under `full/`

## Extractor Tests

Extractor tests are good for:

- one very specific formatting bug
- section boundary handling
- canonical spell restoration
- mutation tokenization
- equipment-slot classification edge cases

They are fast and make it obvious which extractor broke.

Examples of good extractor-test targets:

- wrapped `A:` lines
- uppercase spell hotkeys
- parenthesized legacy mutation entries
- unrand shield recognition

## Full Morgue Golden Fixtures

Golden fixtures are where most parser confidence comes from.

A full morgue test exercises:

- section splitting
- extractor interaction
- record assembly
- strict validation
- field ordering and output shape

These tests catch regressions that tiny snippets often miss, especially in species or item edge cases.

Examples that have been especially valuable:

- Poltergeist
- Octopode
- Draconian color variants
- Jiyva mutation-heavy morgues
- spell-heavy endgame morgues
- talisman/form runs

## When To Add Which

Add a focused extractor test when:

- the bug has a narrow textual cause
- you want a short and readable regression

Add or update a full golden fixture when:

- the bug depends on interactions between multiple sections
- the fix changes the final output contract
- the bug was discovered by comparing real raw morgues with parsed JSON

In practice, many good fixes end up with both:

- one extractor regression
- one full morgue fixture that proves the whole record is now right

## Expected JSON Philosophy

Expected JSON should reflect current parser intent, not legacy output for its own sake.

That means:

- regenerate expected JSON when the schema intentionally improves
- do not keep stale output just because an older parser happened to emit it
- keep changes small and explain them in the parser changelog when they affect downstream consumers

## Fixture Metadata Inventory

When you want a quick view of current coverage, regenerate the fixture metadata
inventory from the tests:

```bash
npm run fixtures:meta
```

This writes `fixtures/morgue/test-referenced-metadata.json`.

The inventory is built from the fixtures that current tests actually reference,
not from whatever happens to be sitting in the pipeline database. That keeps the
report aligned with parser coverage instead of mixing in incidental live-sample
history.

The generated JSON is intentionally compact. It stores summary statistics and
zero-filled Crawl-source coverage counts, not a long per-fixture dump.

The generated JSON is meant to answer practical questions such as:

- how many focused and full fixtures are currently referenced by tests
- how many fixtures parse fully versus extractor-only partial coverage
- which feature buckets are already represented
- which 0.34 and 0.35-trunk species, backgrounds, and gods from Crawl source
  still have zero fixture coverage

Use that report to decide what new live morgues are worth collecting next and
to sanity-check whether a proposed regression fixture fills a real gap.

## Practical Rule

When in doubt:

1. save the full morgue
2. add or update expected JSON
3. add the smallest targeted extractor regression you can

That combination has been the most reliable way to improve parser quality without losing confidence in earlier behavior.

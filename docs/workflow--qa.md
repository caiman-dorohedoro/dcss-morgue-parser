# QA Workflow

This note documents the workflow that proved most useful for improving parser
accuracy against real morgues.

The parser package itself does not contain collection code, but this workflow
was used repeatedly with `dcss-morgue-pipeline`.

## 1. Collect a Stratified Sample

Typical bootstrap command from the monorepo root:

```bash
npm run bootstrap -- \
  --server CAO,CBR2,CNC \
  --per-bucket 10 \
  --min-xl 10 \
  --data-dir /tmp/dcss-parser-qa-20 \
  --fresh \
  --verbose
```

What this gives you:

- multiple public servers
- stable and trunk coverage
- roughly `server_count * bucket_count * per_bucket` successful parses
- bias toward richer morgues when `--min-xl` is used

## 2. Export Raw/Parsed Review Pairs

After collection, export each successful parse as:

- `raw.txt`
- `parsed.json`

under a review directory such as:

```text
/tmp/dcss-parser-qa-20/review/<SERVER>/<BUCKET>/<ENDED_AT>__<PLAYER>/
```

This is useful because parser bugs are easiest to catch when the raw morgue and
the parsed JSON are side by side.

## 3. Manual Comparison

When reviewing pairs, the most useful checklist has been:

- does `species`, `speciesVariant`, `background`, and `xl` match the header?
- do equipped items land in the right slots?
- do `artifactKind`, `ego`, and `subtypeEffect` make sense?
- do `properties`, `intrinsicProperties`, and `artifactProperties` add up?
- do `skills` and `effectiveSkills` match the skill table?
- do `mutations` reflect the `A:` line without bleeding across section
  boundaries?
- do memorized spells and library spells match the morgue spell sections?
- does `form` and `talisman` reflect the actual state shown in the morgue?

## 4. Turn Findings Into Tests

The most effective habit has been:

1. spot a bug in raw vs parsed comparison
2. add or reuse a full morgue fixture
3. add a focused extractor regression if the bug is isolated enough
4. regenerate expected JSON if the fix intentionally changes the output

This loop is the reason the parser now has strong coverage for:

- wrapped mutation lines
- spell-name truncation
- Poltergeist haunted gear
- Octopode ring layouts
- talisman/form handling
- Ashenzari and melded gear interactions

## 5. Re-run and Compare Again

After a fix:

- re-run parser golden tests
- optionally re-run a fresh real-world QA sample
- compare raw/parsed pairs again

This last step is important because many parser bugs only become obvious in
live samples, not in the fixture you originally fixed.

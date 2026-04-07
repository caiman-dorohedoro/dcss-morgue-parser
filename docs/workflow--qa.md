# QA Workflow

This note documents the workflow that proved most useful for improving parser accuracy against real morgues.

The parser package itself does not contain collection code, but this workflow was used repeatedly with `dcss-morgue-pipeline`.

## 1. Collect a Stratified Sample

Typical bootstrap command from the monorepo root:

```bash
npm run bootstrap -- \
  --server CAO,CBR2,CNC \
  --per-bucket 10 \
  --min-xl 10 \
  --data-dir ./data/qa-20 \
  --fresh \
  --verbose
```

What this gives you:

- multiple public servers
- stable and trunk coverage
- roughly `server_count * bucket_count * per_bucket` successful parses
- bias toward richer morgues when `--min-xl` is used

Operational details worth remembering:

- the first discovery pass is tail-first, so a fresh bucket starts by reading only the most recent logfile bytes rather than the entire remote logfile
- the tail size is controlled by `--initial-tail-bytes`
- this workspace command runs inside `apps/pipeline`, so `--data-dir ./data/qa-20` resolves to `apps/pipeline/data/qa-20` from the repository root
- `--fresh` clears DB, morgues, and audit output but keeps logfile slice cache
- `--fresh-logfiles` also clears cached logfile slices when you want a clean discovery baseline
- if a bootstrap bucket is underfilled, the pipeline can keep walking backward through older logfile chunks via `--backfill-chunk-bytes`

The current active server ids are `CBRG`, `CNC`, `CDI`, `CXC`, `CBR2`, `CAO`, `LLD`, and `CPO`. Many QA examples use `CAO`, `CBR2`, and `CNC` as a smaller subset, but omitting `--server` targets the full active set.

For repeated QA passes, `incremental` mode keeps the same discovery logic but starts from the saved logfile offsets and then samples only candidates newly discovered since `--since`.

## 2. Export Raw/Parsed Review Pairs

After collection, export each successful parse as:

- `raw.txt`
- `parsed.json`

under a review directory such as:

```text
/tmp/dcss-parser-qa-20/review/<SERVER>/<BUCKET>/<ENDED_AT>__<PLAYER>/
```

This is useful because parser bugs are easiest to catch when the raw morgue and the parsed JSON are side by side.

## 3. Manual Comparison

When reviewing pairs, the most useful checklist has been:

- does `species`, `speciesVariant`, `background`, and `xl` match the header?
- do equipped items land in the right slots?
- do `artifactKind`, `ego`, and `subtypeEffect` make sense?
- do `properties`, `intrinsicProperties`, and `artifactProperties` add up?
- do `skills` and `effectiveSkills` match the skill table?
- do `mutations` reflect the `A:` line without bleeding across section boundaries?
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

This last step is important because many parser bugs only become obvious in live samples, not in the fixture you originally fixed.

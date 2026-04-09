# QA Workflow

This note documents the workflow that proved most useful for improving parser accuracy against real morgues.

The parser package itself does not contain collection code, but this workflow was used repeatedly with `dcss-morgue-pipeline`.

For the post-collection inspection loop, use `docs/workflow--parser-debugging.md`.

## 1. Collect a Stratified Sample

Typical bootstrap command from the monorepo root:

```bash
npm run bootstrap -- \
  --server CBRG,CDI,CXC,CAO,CBR2,CNC,CPO \
  --per-bucket 10 \
  --min-xl 10 \
  --data-dir ./data/bootstrap-stratified-xl10 \
  --fresh \
  --verbose \
  --timeout-ms 30000
```

What this gives you:

- multiple public servers
- stable and trunk coverage
- roughly `server_count * bucket_count * per_bucket` successful parses
- bias toward richer morgues when `--min-xl` is used

If you want a deliberately different bootstrap sample from the same deterministic
selection order, add `--skip-first <n>` so each `(server, version)` bucket skips
its first `n` sorted candidates before taking `--per-bucket`.

If you want the sampler to choose a different order across fresh clones instead
of walking the same deterministic window, switch to `--sample random`. Add
`--seed <value>` when you want that random order to stay reproducible across
machines or reruns.

The sampler can also filter directly on xlog metadata before any morgues are
fetched:

- `--species <names>` matches the xlog `race` field
- `--background <names>` matches the xlog `cls` field
- `--god <names>` matches the xlog `god` field
- `--god none` matches games that ended without a god

For example:

```bash
npm run bootstrap -- \
  --server CBRG,CDI,CXC,CAO,CBR2,CNC,CPO \
  --per-bucket 2 \
  --sample random \
  --seed qa-2026-04-08 \
  --species Octopode,Deep\ Elf \
  --background Shapeshifter,Hedge\ Wizard \
  --god none,Sif\ Muna \
  --min-xl 15 \
  --data-dir ./data/bootstrap-random-filtered \
  --fresh \
  --verbose
```

### Bootstrap / Incremental Parameters

The pipeline CLI has enough flags now that it is worth keeping a compact
reference here instead of forcing readers to inspect `src/cli.ts`.

Common sampling and filter parameters:

| Flag | Commands | Meaning |
| --- | --- | --- |
| `--per-bucket <n>` | `bootstrap`, `incremental` | Successful candidates to take per `(server, version)` bucket. Default: `10`. |
| `--sample <mode>` | `bootstrap`, `incremental` | Sampling mode: `deterministic` or `random`. Default: `deterministic`. |
| `--seed <value>` | `bootstrap`, `incremental` | Stable seed for `--sample random`, useful for reproducible QA reruns. |
| `--min-xl <n>` | `bootstrap`, `incremental` | Only consider candidates whose xlog `xl` is at least `n`. |
| `--species <names>` | `bootstrap`, `incremental` | Comma-separated xlog `race` filter with OR semantics. |
| `--background <names>` | `bootstrap`, `incremental` | Comma-separated xlog `cls` filter with OR semantics. |
| `--god <names>` | `bootstrap`, `incremental` | Comma-separated xlog `god` filter with OR semantics. Use `none` for no final god. |
| `--server <ids>` | `bootstrap`, `incremental` | Comma-separated active server ids. Default: all active servers. |

Run-shape and runtime parameters:

| Flag | Commands | Meaning |
| --- | --- | --- |
| `--data-dir <path>` | `bootstrap`, `incremental`, `audit` | Override the runtime data directory. From the repo root, `./data/...` resolves under `apps/pipeline/data/...`. |
| `--fresh` | `bootstrap`, `incremental` | Clear DB, morgues, and audit output before running, while keeping logfile cache. |
| `--fresh-logfiles` | `bootstrap`, `incremental` | Also clear cached logfile slices. Implies `--fresh`. |
| `--dry-run` | `bootstrap`, `incremental` | Discover and sample, but do not fetch or parse morgues. |
| `--verbose` | `bootstrap`, `incremental` | Print discovery, backfill, fetch, and parse progress. |
| `--min-delay-ms <n>` | `bootstrap`, `incremental` | Per-host politeness delay. Default: `2000`. |
| `--timeout-ms <n>` | `bootstrap`, `incremental` | HTTP timeout in milliseconds. Default: `10000`. |
| `--initial-tail-bytes <n>` | `bootstrap`, `incremental` | Recent logfile bytes to read when a bucket is first seen. Default: `1048576`. |

Bootstrap-only parameters:

| Flag | Meaning |
| --- | --- |
| `--skip-first <n>` | Skip the first `n` sorted candidates in each deterministic bucket before taking `--per-bucket`. Default: `0`. |
| `--backfill-chunk-bytes <n>` | Older logfile bytes to fetch per backfill step when a bucket is underfilled. Default: `initial-tail-bytes`. |

Incremental-only parameter:

| Flag | Meaning |
| --- | --- |
| `--since <iso8601>` | Lower bound for `discovered_at`. Default: current time minus 6 hours. |

Audit-only parameter:

| Flag | Meaning |
| --- | --- |
| `--sample-size <n>` | Number of audit rows to write. Default: `20`. |

Operational details worth remembering:

- the first discovery pass is tail-first, so a fresh bucket starts by reading only the most recent logfile bytes rather than the entire remote logfile
- the tail size is controlled by `--initial-tail-bytes`
- this workspace command runs inside `apps/pipeline`, so `--data-dir ./data/bootstrap-stratified-xl10` resolves to `apps/pipeline/data/bootstrap-stratified-xl10` from the repository root
- `--fresh` clears DB, morgues, and audit output but keeps logfile slice cache
- `--fresh-logfiles` also clears cached logfile slices when you want a clean discovery baseline
- if a bootstrap bucket is underfilled, the pipeline can keep walking backward through older logfile chunks via `--backfill-chunk-bytes`
- `--skip-first` is useful when a fresh clone would otherwise keep surfacing nearly the same morgues; it shifts the deterministic per-bucket window instead of relying on randomness
- `--sample random` reduces cross-clone overlap, but it does not guarantee disjoint samples across machines; it only changes the per-bucket order before `--per-bucket` is applied
- `--seed` makes random sampling reproducible; the same filtered candidate set and the same seed produce the same selection order
- `--skip-first` only applies to deterministic sampling; it is rejected together with `--sample random`
- `--species`, `--background`, and `--god` work from logfile/xlog metadata, so they narrow the candidate set before any morgue fetches happen
- `--timeout-ms 30000` is a practical choice for this broader seven-server subset when the runner and servers are spread across different regions; depending on where the command is run, a different server could be the slow one

The current active server ids are `CBRG`, `CNC`, `CDI`, `CXC`, `CBR2`, `CAO`, `LLD`, and `CPO`. This workflow example uses the broader practical subset `CBRG`, `CDI`, `CXC`, `CAO`, `CBR2`, `CNC`, and `CPO`, while intentionally skipping `LLD`; `CUE` is not part of the current active manifest.

For repeated QA passes, `incremental` mode keeps the same discovery logic but starts from the saved logfile offsets and then samples only candidates newly discovered since `--since`.

## 2. Export Raw/Parsed Review Pairs

After collection, export each successful parse as:

- `raw.txt`
- `parsed.json`

under a review directory such as:

```text
apps/pipeline/data/bootstrap-stratified-xl10/review/<SERVER>/<BUCKET>/<ENDED_AT>__<PLAYER>/
```

This is useful because parser bugs are easiest to catch when the raw morgue and the parsed JSON are side by side.

If the parser schema changes after those review pairs or runtime SQLite snapshots
have already been generated, refresh the stored outputs in place before manual
comparison:

```bash
npm run backfill:parsed -w apps/pipeline
```

This rewrites every `parsed.json` under `apps/pipeline/data/**` from its sibling
`raw.txt`, and also reparses every SQLite `parse_results.parsed_json` row whose
fetched morgue is still available locally.

## 3. Manual Comparison

The detailed debugging loop now lives in `docs/workflow--parser-debugging.md`.
Keep this document focused on sample collection and review setup.

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

# Pipeline Origin

This note captures the parts of the original pipeline design that are still useful for understanding why the parser exists and how it was validated.

It is adapted from the early `dcss-morgue-pipeline` design documents rather than copied verbatim. Old parser-specific requirements that no longer match the current schema were intentionally removed.

## Why the Parser Was Built Around Morgues

The original goal was not just to scrape game metadata. It was to build a strict, reusable character snapshot parser that could answer questions about:

- species and background
- final stats and XL
- worn equipment and item properties
- skills and effective skills
- mutations and active traits
- memorized spells and spell-library rows

Xlog/logfile data is enough to discover candidate games, but it is not enough to reconstruct the full final character state. Morgues are the authoritative source for that snapshot.

That led to a deliberate split:

- xlog/logfile for discovery and indexing
- morgue text for extraction

## Why Discovery and Parsing Stayed Separate

The pipeline architecture separated concerns on purpose.

Discovery and collection needed to solve:

- which public servers to sample
- how to map source version labels into stable buckets like `0.34` and `trunk`
- how to fetch politely from volunteer-run infrastructure
- how to cache logfile slices and raw morgues

Parsing needed to solve:

- section detection in semi-structured text
- strict extraction and validation
- canonicalization where appropriate
- structured failure when required information could not be extracted

Keeping those concerns separate made the parser reusable from:

- the SQLite-backed dataset pipeline
- the browser paste UI
- ad hoc analysis and helper tools
- the dedicated parser package in this monorepo

## Architecture Ideas That Still Matter

Several parts of the original architecture still explain the current parser well.

### Strict failure policy

The pipeline preferred correct failure over guessed output.

That mindset still shapes the parser:

- absence is okay when it is clearly represented in the morgue
- ambiguity should not silently normalize into a misleading value
- regressions should become fixtures and tests

### Per-host politeness

The collection side treated Crawl servers as volunteer-run infrastructure and kept fetch behavior conservative:

- per-host concurrency of `1`
- minimum delay between requests to the same host
- shared politeness for logfile discovery and morgue fetches

Those details belong to the pipeline, not the parser package, but they are part of the reason the parser was developed against real public samples instead of toy input only.

### Stratified sampling

The original collection workflow sampled by `(server, version)` bucket rather than only "whatever is newest". That produced broader parser coverage across:

- different public servers
- stable and trunk formatting differences
- species and equipment edge cases

In the current pipeline manifest, the active server ids are `CBRG`, `CNC`, `CDI`, `CXC`, `CBR2`, `CAO`, `LLD`, and `CPO`. In practice, many QA examples use the broader operational subset `CBRG`, `CDI`, `CXC`, `CAO`, `CBR2`, `CNC`, and `CPO`, which keeps coverage broad while skipping `LLD`; `CUE` is not part of the current active manifest.

That sampling mindset is still reflected in the QA workflow and fixture selection.

By default, the current bootstrap sampler is deterministic inside each bucket:

- candidate ids are derived deterministically from xlog identity fields
- filtered candidates are ordered deterministically
- `--per-bucket` then takes the first window from that order

That default is useful for reproducible QA, but it also means fresh clones can
surface nearly the same morgues when they see the same logfile snapshot. The
pipeline now also supports:

- random per-bucket sampling with an optional seed for reproducibility
- direct xlog metadata filters for species, background, and god

Those filters come from xlog itself rather than morgue parsing:

- `race` -> species
- `cls` -> background
- `god` -> final god

This keeps candidate discovery cheap while making QA sampling more targeted.

## What Was Intentionally Not Carried Forward

The earliest design documents described parser requirements that no longer match the current parser model. Examples include:

- `helmet` / `gloves` as booleans
- `wizardry`, `channel`, and `wildMagic` as required top-level outputs
- `armourSkill` and `schoolSkills` as old field names

Those requirements were useful during initial planning, but the parser evolved into a more semantic model with:

- `skills` and `effectiveSkills`
- structured `mutations`
- slot summary fields plus detailed equipment objects
- property bags split into intrinsic, ego, and artefact sources

This note keeps the architectural lessons while leaving behind schema ideas that were replaced.

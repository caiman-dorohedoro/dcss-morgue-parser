# Raw Morgue Collection Provenance

The parser package in this monorepo does not fetch raw morgues itself, but a lot of its design and QA work came from running the pipeline in `apps/pipeline` against real public Crawl servers.

This note explains the collection model that informed parser development.

## Goals

The collection workflow existed to produce real-world inputs for parser QA and schema iteration, not only to build a dataset.

That meant we wanted:

- real morgues from active public servers
- stable/trunk coverage
- conservative server politeness
- easy side-by-side comparison of raw morgue text and parsed JSON

## Discovery Model

Collection was split into two stages:

1. discover candidate games from xlog/logfile sources
2. fetch corresponding morgues for a selected sample

Xlog/logfile is useful for:

- finding games efficiently
- grouping by server and version bucket
- filtering by metadata such as `xl`

Morgues are then fetched as the authoritative extraction source.

## Logfile Slice Strategy

The collector did not assume that full remote logfiles should be downloaded on every run.

When a `(server, version)` bucket was first seen, discovery read only a tail slice of the logfile. The default was controlled by `--initial-tail-bytes`, and the implementation intentionally trimmed the leading partial record when the range started in the middle of a line.

After that first discovery pass, the pipeline stored a byte offset for each `(server, version, logfile_url)` and only requested bytes after the saved offset. It also advanced the saved offset only after complete newline-terminated records were committed, so an appended partial line would not be treated as a real candidate yet.

The pipeline also cached fetched logfile slices on disk by server, version, and starting byte offset. That cache made repeated discovery and later backfill work reproducible without forcing the collector to re-download the same logfile ranges every time.

## Incremental Discovery and Backfill

Incremental runs still performed discovery first. The practical difference was in candidate selection, not in whether discovery happened at all.

On an incremental run, the collector re-read each logfile from the saved byte offset, inserted any newly discovered complete records, and then sampled only candidates whose `discovered_at` was within the requested `--since` window. That was the mechanism used to pick up recently appended logfile rows without reprocessing the entire logfile history.

Bootstrap runs had a different fallback when a bucket did not yet have enough eligible candidates. In that case the pipeline could request older logfile chunks before the current cursor using `--backfill-chunk-bytes`. Backfill worked from older byte ranges toward the beginning of the file and reused the nearest older cached slice when available.

This combination of tail-first discovery, offset-based incremental sync, and optional backfill was a major part of how the pipeline stayed polite while still building useful QA samples from public servers.

## Server Selection

The pipeline used an explicit active server set derived from the broader `dcss-stats` repository. In the current manifest, that active set is:

- `CBRG`
- `CNC`
- `CDI`
- `CXC`
- `CBR2`
- `CAO`
- `LLD`
- `CPO`

During parser QA we often sampled from a broader practical subset such as:

- `CBRG`
- `CDI`
- `CXC`
- `CAO`
- `CBR2`
- `CNC`
- `CPO`

That subset kept review loops broad across multiple hosts while intentionally skipping `LLD`; `CUE` and some other special cases were intentionally excluded when anonymous fetches were not reliable.

## Version Buckets

Sampling usually worked on normalized version buckets such as:

- `0.34`
- `trunk`

Even when upstream servers used labels like `git`, the collector mapped them into a stable bucket so parser QA could compare broad groups while the parser still preserved the raw morgue version token.

## Politeness Rules

Fetches were intentionally conservative because public Crawl servers are volunteer-run infrastructure.

Typical rules:

- per-host concurrency = `1`
- minimum delay between requests to the same host
- logfile discovery and morgue fetches share the same host politeness rules

These rules belong to the collector, not this parser package, but they matter for provenance because they shaped how QA samples were gathered.

## Sampling Patterns

Common QA sampling styles included:

- stratified bootstrap by `(server, version)` bucket
- incremental sampling over recent discovery windows
- `--min-xl` filtering to bias toward more information-rich morgues

This was useful because parser bugs were often concentrated in:

- high-XL games with many sections
- trunk formatting changes
- species with unusual equipment rules
- spell-heavy or mutation-heavy morgues

## Review Export

One especially useful workflow exported each successful parse into a review directory containing:

- `raw.txt`
- `parsed.json`

laid out by:

- server
- version bucket
- end timestamp and player name

That made manual parser review fast and reproducible, and many current fixtures came from those review loops.

## Why This Matters for the Parser

This package intentionally focuses on parsing only. But its current shape was influenced by repeated collection-and-review cycles against real public data.

If this package moves into its own public repository, keeping a short record of that provenance is useful because it explains:

- why the parser is stricter than a toy text parser
- why certain edge cases were prioritized
- how raw morgue QA samples were originally obtained

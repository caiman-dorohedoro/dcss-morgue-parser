# Documentation Catalog

Created: 2026-04-07  
Last updated: 2026-04-25

## Purpose

- Keep the project-level document inventory and the main reference paths in one place.
- Separate parser contract docs from project provenance, QA workflow, and maintenance docs while preserving a clear reading order.
- Make it easy to onboard into a fresh session or repository clone without guessing where to start.

## Naming Convention

- Root documents:
  - `README.md`: repository overview and workspace usage
  - `AGENTS.md`: working instructions
  - `llms.txt`: curated LLM-facing index into the parser and project docs
- Project-level documents under `docs/`:
  - use lowercase ASCII file names only
  - put the document kind first, not last
  - prefer a short BEM-like segment chain:
    - 2 segments when the topic is already unique: `<kind>--<topic>.md`
    - 3 segments when extra scope avoids ambiguity: `<kind>--<area>--<topic>.md`
  - supported `kind` prefixes:
    - `meta`: document catalogs and index pages
    - `origin`: design background and provenance
    - `workflow`: recurring operations and review procedures
    - `strategy`: testing and fixture maintenance strategy
    - `notes`: implementation notes and engineering judgment
  - local language reference copies may add a trailing locale segment, such as `origin--pipeline--ko.md`
- Package docs under `packages/parser/docs/`:
  - keep package-specific artifact names such as `parser_model.md` and `parser_changelog.md`
  - these documents describe parser contract artifacts rather than project-level process categories

## Canonical File Inventory

| File | Summary | Location |
| --- | --- | --- |
| `README.md` | Monorepo overview, workspace layout, and common commands | `/` |
| `AGENTS.md` | Working instructions and documentation entry point | `/` |
| `llms.txt` | Curated LLM-facing doc index for parser usage and repo context | `/` |
| `meta--catalog.md` | Canonical document catalog and reading order | `/docs` |
| `origin--pipeline.md` | Pipeline design background, including discovery/parsing separation, strict failure, and sampling rationale | `/docs` |
| `origin--raw-morgue-collection.md` | Provenance for collecting raw morgues from public Crawl servers for QA and schema iteration | `/docs` |
| `workflow--qa.md` | Repeatable parser QA workflow built around stratified sampling and raw/parsed review pairs | `/docs` |
| `workflow--parser-debugging.md` | Manual debugging loop for reviewing exported raw/parsed pairs and classifying real parser issues | `/docs` |
| `strategy--fixture.md` | Test and fixture maintenance strategy across focused regressions and full golden morgues | `/docs` |
| `notes--implementation.md` | Engineering notes distilled from the earlier implementation plan | `/docs` |
| `llms.txt` | Package-local LLM-facing index shipped with the parser npm tarball | `/packages/parser` |
| `parser_model.md` | Current parser schema and Crawl-aligned model explanation | `/packages/parser/docs` |
| `parser_usage.md` | Practical parser calling contract, field invariants, and edge-case guide | `/packages/parser/docs` |
| `parser_changelog.md` | Schema and contract history for the parser package | `/packages/parser/docs` |

## Recommended Reading Order

1. `README.md`
2. `llms.txt`
3. `packages/parser/README.md`
4. `packages/parser/llms.txt`
5. `packages/parser/docs/parser_usage.md`
6. `packages/parser/docs/parser_model.md`
7. `packages/parser/docs/parser_changelog.md`
8. `docs/origin--pipeline.md`
9. `docs/origin--raw-morgue-collection.md`
10. `docs/workflow--qa.md`
11. `docs/workflow--parser-debugging.md`
12. `docs/strategy--fixture.md`
13. `docs/notes--implementation.md`

## Status Notes

- `packages/parser/docs/parser_usage.md`, `packages/parser/docs/parser_model.md`, and `packages/parser/docs/parser_changelog.md` are the parser package contract documents at different depths.
- `packages/parser/llms.txt` is the package-local LLM entrypoint that ships inside the published parser tarball.
- `llms.txt` is the shortest repo-level entrypoint for LLMs that need to find the parser contract quickly.
- `docs/origin--pipeline.md` and `docs/origin--raw-morgue-collection.md` describe provenance outside the parser package itself.
- `docs/workflow--parser-debugging.md` is the practical inspection loop to use after a sample has already been collected; it also documents the local Crawl equipment catalog generator.
- `docs/notes--implementation.md` is not a raw historical dump of the original plan; it is an edited note that keeps only the engineering judgment that still matters.

## Change Log

- 2026-04-07: Converted the catalog to English, adopted prefix-first document naming for `docs/`, and aligned project-level file names to category-first topics.
- 2026-04-08: Added `workflow--parser-debugging.md` as the dedicated manual inspection and parser debugging note.
- 2026-04-10: Updated implementation and parser changelog notes to cover shared skill metadata and stricter pipeline morgue validation.
- 2026-04-10: Expanded implementation notes with guidance on shared helper boundaries for pipeline, web viewer, and parser refactors.
- 2026-04-10: Added `packages/parser/docs/parser_usage.md` and root `llms.txt` as the shortest LLM-facing parser contract entrypoints.
- 2026-04-11: Added `packages/parser/llms.txt` to the canonical reading order and package inventory so the parser npm tarball carries its own LLM-facing index.
- 2026-04-25: Documented the local Crawl equipment catalog generator in the parser debugging workflow, root README, and root LLM-facing index.

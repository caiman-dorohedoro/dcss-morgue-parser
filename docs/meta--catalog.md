# Documentation Catalog

Created: 2026-04-07  
Last updated: 2026-04-08

## Purpose

- Keep the project-level document inventory and the main reference paths in one place.
- Separate parser contract docs from project provenance, QA workflow, and maintenance docs while preserving a clear reading order.
- Make it easy to onboard into a fresh session or repository clone without guessing where to start.

## Naming Convention

- Root documents:
  - `README.md`: repository overview and workspace usage
  - `AGENTS.md`: working instructions
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
| `meta--catalog.md` | Canonical document catalog and reading order | `/docs` |
| `origin--pipeline.md` | Pipeline design background, including discovery/parsing separation, strict failure, and sampling rationale | `/docs` |
| `origin--raw-morgue-collection.md` | Provenance for collecting raw morgues from public Crawl servers for QA and schema iteration | `/docs` |
| `workflow--qa.md` | Repeatable parser QA workflow built around stratified sampling and raw/parsed review pairs | `/docs` |
| `workflow--parser-debugging.md` | Manual debugging loop for reviewing exported raw/parsed pairs and classifying real parser issues | `/docs` |
| `strategy--fixture.md` | Test and fixture maintenance strategy across focused regressions and full golden morgues | `/docs` |
| `notes--implementation.md` | Engineering notes distilled from the earlier implementation plan | `/docs` |
| `parser_model.md` | Current parser schema and Crawl-aligned model explanation | `/packages/parser/docs` |
| `parser_changelog.md` | Schema and contract history for the parser package | `/packages/parser/docs` |

## Recommended Reading Order

1. `README.md`
2. `packages/parser/README.md`
3. `packages/parser/docs/parser_model.md`
4. `packages/parser/docs/parser_changelog.md`
5. `docs/origin--pipeline.md`
6. `docs/origin--raw-morgue-collection.md`
7. `docs/workflow--qa.md`
8. `docs/workflow--parser-debugging.md`
9. `docs/strategy--fixture.md`
10. `docs/notes--implementation.md`

## Status Notes

- `packages/parser/docs/parser_model.md` and `packages/parser/docs/parser_changelog.md` are the canonical parser contract documents.
- `docs/origin--pipeline.md` and `docs/origin--raw-morgue-collection.md` describe provenance outside the parser package itself.
- `docs/workflow--parser-debugging.md` is the practical inspection loop to use after a sample has already been collected.
- `docs/notes--implementation.md` is not a raw historical dump of the original plan; it is an edited note that keeps only the engineering judgment that still matters.

## Change Log

- 2026-04-07: Converted the catalog to English, adopted prefix-first document naming for `docs/`, and aligned project-level file names to category-first topics.
- 2026-04-08: Added `workflow--parser-debugging.md` as the dedicated manual inspection and parser debugging note.

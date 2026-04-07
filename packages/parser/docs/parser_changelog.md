# Parser Design Changelog

This document records the major parser model changes, what changed, and why.

It complements [parser_model.md](./parser_model.md):

- `parser_model.md` explains the current model
- `parser_changelog.md` explains how the model became more detailed over time

## 1. Raw Morgue Version Preservation

### What changed

The parser stores the raw morgue version token, for example:

- `0.34.1`
- `0.35-a0-257-gf9e06672e4`

instead of collapsing parsed output to a coarse bucket like `trunk`.

### Why

For trunk games, the commit suffix matters. Two morgues from different `0.35-a0-*` revisions can come from meaningfully different upstream Crawl states.

## 2. Background Extraction

### What changed

The parser stores `background` in addition to `species`, and preserves `speciesVariant` when canonicalizing `species` would lose useful detail.

Examples:

- `Formicid Fighter` -> `species: "Formicid"`, `background: "Fighter"`
- `Red Draconian Summoner` -> `species: "Draconian"`, `speciesVariant: "Red Draconian"`, `background: "Summoner"`

### Why

Downstream tools often care about build archetype, not only species.

## 2.5. XL Extraction

### What changed

The parser stores `xl` from the stat line.

### Why

`XL` is one of the most common grouping and power-level fields in downstream tools, so it belongs in the same stable header block as `AC`, `EV`, and `SH`.

## 3. Skills vs Effective Skills

### What changed

The parser split skill data into:

- `skills`
- `effectiveSkills`

For example:

```text
- Level 15.2(19.5) Fighting
```

becomes:

- `skills.fighting = 15.2`
- `effectiveSkills.fighting = 19.5`

### Why

The parenthesized number is often what the player actually saw after Ashenzari, Heroism, or other modifiers. Keeping both values avoids re-parsing skill table text downstream.

## 4. Structured Mutations

### What changed

`mutations` changed from a flat string list to:

```ts
type MutationEntrySnapshot = {
  name: string
  level: number | null
}
```

### Why

Mutation level matters for analysis, and the `A:` line is the most stable summary of active special traits at game end.

## 5. Equipment Summary vs Details

### What changed

The parser keeps both:

- summary slot strings such as `bodyArmour` and `rings`
- semantic `...Details` objects

### Why

The summary preserves the morgue-facing name. The detail object is what makes the parsed data reusable for analysis and tooling.

## 6. Armour Ego, Jewellery Subtype, and Artefact Separation

### What changed

The parser now treats these as different concepts:

- armour `baseType`
- armour `ego`
- jewellery `subtypeEffect`
- artefact `artifactKind`

### Why

Crawl internally models these differently. A `hat of intelligence` is not the same kind of thing as a `ring of intelligence`, and a randart hat is not just another ego item.

References that informed this model:

- `item-name.cc`
- `item-prop.cc`
- `item-def.h`

## 7. Property Bags

### What changed

Equipment properties now use structured bags:

- `properties`
- `intrinsicProperties`
- `egoProperties`
- `artifactProperties`

instead of only flat string arrays.

### Why

This keeps source attribution and lets downstream tools reason about combined values correctly. For example, a base-item `rN+` plus an artefact `rN+` should produce a final `rN = 2`, not a lossy string list.

References:

- `artefact.h`
- `artefact.cc`
- `item-prop.cc`

## 8. Poltergeist Haunted Auxiliary Equipment

### What changed

`helmets`, `gloves`, `footwear`, and `cloaks` became arrays, and item details gained `equipState` values such as:

- `worn`
- `haunted`
- `melded`

### Why

Poltergeists can use multiple haunted auxiliary slots. A single `helmet` or `cloak` field was not expressive enough.

References:

- `equipment-slot.h`
- `player-equip.cc`

## 9. Talisman and Form Extraction

### What changed

The parser stores:

- `talisman`
- `talismanDetails`
- `form`

### Why

Shapeshifting state matters for character analysis, and in many morgues it is not recoverable from equipment slots alone.

## 10. Canonical Spell Name Restoration

### What changed

The parser ships with built-in canonical spell names and uses them to restore truncated morgue spell names.

### Why

Morgue spell tables often shorten names such as `Lehudib's Crystal Sp`. The canonical vocabulary lets the parser recover stable names without callers having to supply their own list.

## 11. Golden Fixtures and Full Morgue Regression

### What changed

The parser grew around full morgue regression fixtures, not only tiny extractor unit cases.

### Why

Most real parser regressions come from interactions between sections, wrapping, equipment formatting, and edge-case species. Full morgues catch those problems earlier than isolated extractor snippets.

## 12. Unusable Modern Spell-Library Rows

### What changed

Modern spell-library rows with `Failure = N/A` are now preserved as spells with `failurePercent = 100` when the morgue still provides a numeric spell level.

### Why

Recent morgues can list unusable library spells this way. Treating those rows as unparsable caused the parser to drop valid spell names from the library section.

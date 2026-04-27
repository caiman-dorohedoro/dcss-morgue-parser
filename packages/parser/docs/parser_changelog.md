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

## 1.5. Final God Extraction

### What changed

The parser now stores `god` from the morgue header `God:` field.

### Why

Manual QA passes repeatedly compare the final god shown in the header, and that value was previously missing from parsed output even when the raw morgue was unambiguous.

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

## 4. Structured `A:` Traits

### What changed

`mutations` changed from a flat string list to structured entries copied from
the Crawl `A:` line:

```ts
type MutationEntrySnapshot = {
  name: string
  level: number | null
  suppressed?: true
  transient?: true
}
```

### Why

Mutation level matters for analysis, and the `A:` line is the most stable
summary of the terse special-trait state Crawl shows at game end.

The field name is historical. It should be read as "displayed `A:` traits",
not as "only real Crawl mutation catalog entries"; Crawl includes actual
mutations plus fakemuts such as species, form, god/passive, and derived body
traits.

Parenthesized entries remain `suppressed: true`, while bracketed entries are now preserved as `transient: true` to match Crawl's own mutation UI semantics.

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

Modern spell-library rows with `Failure = N/A` are now preserved with:

- `failurePercent = null`
- `castable = false`

### Why

Recent morgues can list unusable library spells this way. Treating those rows as numeric `100%` failures was a workable stopgap, but a dedicated unusable state preserves the morgue meaning more faithfully and avoids overloading the numeric failure field.

## 13. Functional Item Inscriptions

### What changed

Equipment detail objects now expose:

- raw brace text through `propertiesText`
- recognized functional Crawl inscription tokens through `functionalInscriptions`

Recognized functional inscription tokens are excluded from `properties.opaqueTokens`.

### Why

## 14. Shared Skill Table Metadata

### What changed

The parser package now also exports shared skill-table helpers:

- `parseOrderedSkillKeys(text)`
- `SKILL_DISPLAY_LABELS`

These helpers reuse the same skill-name mapping as `extractSkills()`.

### Why

The local web viewer previously kept its own skill label map and `Skills:`
section parsing logic. That duplication made it too easy for the viewer to
drift from the parser whenever Crawl added or renamed a skill row.

The same `{...}` syntax in morgues can contain both item properties and player-added inscription commands such as `!w`, `=f`, and `@r3`. Those command tokens are not equipment properties and should not be mixed into downstream property bags.

Free-form custom note text is still not fully separated from unknown property tokens, so `opaqueTokens` may continue to include strings that are really player notes.

## 13.5. Orb-Slot Unrand Classification

### What changed

Known orb-slot unrands whose names do not literally contain `orb` are now classified as `orb` equipment instead of falling through to `bodyArmour`.

Example:

- `sphere of Battle`

### Why

Manual review against live morgues found that header-slot placement and inventory state were clear, but the parser still emitted `bodyArmour = "sphere of Battle"` and `orb = "none"`.
The orb-slot detector now considers the known orb-unrand list as well as plain `orb` name matches.

## 13.6. Coglin Gizmo Slot Extraction

### What changed

The parser now recognizes Coglin gizmos as a dedicated equipment slot:

- `gizmo`
- `gizmoDetails`

and it preserves the morgue inventory state as `equipState = "installed"`.

Known gizmo property tokens such as `Clar` and `RMsl` are also normalized into structured boolean properties instead of falling through to free-form opaque tokens.

### Why

Manual review of fresh Coglin morgues showed that the raw morgue consistently exposes gizmos in a separate `Gizmo` inventory section and on the header `Will` row, while the parser dropped them entirely.

Crawl source references such as `equipment-slot.h`, `item-name.cc`, and `artefact.cc` confirm that gizmos are a real slot with generated property bundles, not disguised amulets or rings.

## 13.7. Property Bag Naming Clarification

### What changed

Equipment property bags now use:

- `booleanProps` instead of `flags`
- `opaqueTokens` instead of `specials`

### Why

The old names were concise but too generic. The new names make the contract clearer:

- `booleanProps` are normalized non-numeric properties the parser understands semantically
- `opaqueTokens` are preserved raw tokens whose meaning is still parser-defined, item-specific, or otherwise not fully normalized

## 13.8. Common Artprops and System Tags Split Out of `opaqueTokens`

### What changed

The parser now separates several previously mixed token families:

- common Crawl artprop abbreviations such as `Bane`, `-Cast`, `^Drain`, `*Rage`, `*Corrode`, `^Contam`, and `rMut` are normalized into `booleanProps`
- gizmo-only effect tags such as `RevGuard` are exposed as `gizmoEffects` when the parsed item is a gizmo
- named non-generic item effects such as `Dragonpray`, `Riposte`, `Gadgeteer`, and `Wandboost` are exposed as `namedEffects` on non-gizmo items
- Ashenzari curse shorthand such as `Elem`, `Sorc`, `Comp`, and `Self` are exposed as `ashenzariCurses`

`opaqueTokens` now stays focused on the residual bucket:

- unrand-only inscription strings such as `Infuse+∞` and `VampMP`
- item-specific tokens the parser still does not model semantically
- free-form note text that cannot yet be separated cleanly

### Why

Fresh Coglin and Ashenzari morgue review showed that `opaqueTokens` had become too broad. It was mixing at least four different things:

- normalized Crawl artprops
- gizmo system tags
- named non-generic item effects
- Ashenzari system tags
- true leftovers

Splitting those families makes the output more queryable without pretending that every inscription-like string is the same kind of data.

## 13.9. Extra Amulets From Justicar's Regalia

### What changed

The parser now preserves multiple equipped amulets when Crawl exposes more than one amulet slot:

- summary output now uses `amulets: string[]`
- detail output now uses `amuletDetails: EquipmentItemSnapshot[]`

### Why

`justicar's regalia` is a real Crawl item that grants an extra amulet slot. Raw morgues can therefore show two equipped amulets in both the header summary and the inventory section.

Keeping a singular amulet field silently dropped the second amulet or forced awkward compatibility shims. Treating amulets like other multi-item slots keeps the contract simpler and preserves the full equipped state directly.

## 13.10. Randart Jewellery `displayName` Keeps the Item Name

### What changed

Randart jewellery no longer collapses `displayName` to generic placeholders such as `randart ring` or `randart amulet`.

For randart rings and amulets:

- `displayName` now matches `rawName`
- summary arrays still continue to use the equipped item names directly

### Why

The generic placeholders hid the actual item identity in downstream UI consumers even though the parser had already preserved the true morgue name in `rawName`.

Keeping `displayName` aligned with the real jewellery name makes randart accessories behave like other named randart items and removes the need for UI-specific workarounds.

## 13.11. Species Descriptor Fallback Ignores Current-Form Prose

### What changed

`extractBaseStats` now tries character descriptors in this order:

- `Began as ...`
- title-line descriptor such as `(Oni Monk)`
- current overview prose such as `You are a living statue of rough stone.`

and returns the first descriptor that can be parsed as a real species/background pair.

### Why

Modern shapeshifting morgues can include overview prose that looks grammatically like a species line but is actually current-form text. The parser previously treated lines such as `You are a living statue of rough stone.` as the character descriptor and failed before it ever considered the title line.

Trying all available descriptors in a stable order preserves real species/background data while still keeping the overview prose available for form parsing.

## 13.12. Broader Equipment Unrand Coverage And Base Types

### What changed

The equipment parser now recognizes more non-weapon unrands directly from Crawl names and fills in more hidden `baseType` values for named armour.

This update covers current Crawl items such as:

- `robe of Misfortune`
- `fungal fisticloak`
- `crown of vainglory`

and also backfills missing `baseType` values for known named equipment such as:

- `justicar's regalia` -> `scale mail`
- `Maxwell's patent armour` -> `plate armour`
- `scales of the Dragon King` -> `golden dragon scales`
- `shield of the Gong` -> `kite shield`
- `warlock's mirror` -> `buckler`
- `lightning scales` -> `barding`

Legacy aliases such as `tower shield "Bullseye"` are now recognized as shield unrands as well.

### Why

Several Crawl armour unrands do not expose their slot or base item in the visible morgue name. Without an explicit unrand table entry, the parser either left `baseType` empty or treated the item as a generic randart.

Filling those mappings keeps named armour consistent with Crawl source data, improves downstream display quality, and lets property splitting move intrinsic armour resistances out of the artefact-only bucket when the base item is known.

## 13.13. Form Extraction Now Prefers `@:` and Equipped Talismans

### What changed

`extractForm` now resolves current form in this order:

- current `@:` status text
- equipped talisman base type
- overview prose fallback

It also recognizes non-`-form` status labels such as `eel hands`.

### Why

The most stable current-form signal in a morgue is usually the `@:` status line because Crawl populates it from `Form::get_long_name()`. Overview prose is still useful, but it is less canonical and in some cases more dynamic.

Using the equipped talisman as a second-tier fallback lets the parser recover forms such as `dragon-form`, `sphinx-form`, and `vampire-form` even when the overview prose is absent or too loose to trust as the primary signal.

## 13.13. Current God State and Religion Note History

### What changed

The parser now stores:

- current god-state fields:
  - `godPietyDisplay`
  - `godPietyRank`
  - `godOstracismPips`
  - `godStatus`
  - `godUnderPenance`
- structured religion-note history in `godHistory`

### Why

Downstream Crawl analysis often needs more than the final `god` name:

- current star bucket is enough to reason about many god passives
- penance and Ostracism are visible current-state signals that should not stay trapped in prose
- conversions, abandonment, forgiveness, and god gifts matter for run history and cannot be recovered from the final header alone

The model intentionally stops short of pretending morgues always reveal exact
piety. Header stars remain a bucketed approximation, while `godHistory`
captures the exact religion events that Crawl already prints in the `Notes`
section.

## 13.14. Notes-Based Base Stats Fallback for Live Dumps

### What changed

`extractBaseStats` now uses the first `Notes` entry as a fallback descriptor
source when a live `#` character dump only shows an abbreviated title line such
as `(GCAE)` and does not include a top-level `Began as ...` line.

### Why

Current Crawl live dumps can abbreviate the title descriptor based on line
width, while final morgues still include a verbose hiscore section with
`Began as ...`. Using the start note as a secondary fallback keeps the parser
compatible with in-progress dumps without changing the primary descriptor
precedence for regular morgues.

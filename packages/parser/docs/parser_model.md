# Morgue Parser Model

This document explains what the parser extracts, why the output is structured the way it is, and which parts of the DCSS source tree informed the model.

The short version is:

- the parser is intentionally more semantic than a pretty-string formatter
- downstream tools need queryable fields, not only rendered text
- equipment therefore keeps both a raw summary layer and a structured detail layer

## Goals

The parser is intended to be reused from:

- browser paste tools
- data pipelines
- analysis or helper scripts

Because of that, the model prefers:

- stable normalized fields over presentation-only strings
- enough structure to answer questions like:
  - "is this a normal hat of intelligence or a randart hat?"
  - "does this armour grant `rF++` intrinsically, or via artefact properties?"
  - "what exact skills and effective skills did this character have?"
  - "what mutations or innate traits were active at game end?"

## Parse Pipeline

`parseMorgueText()` builds a record from five extractors:

1. `extractBaseStats()`
2. `extractEquipment()`
3. `extractSkills()`
4. `extractMutations()`
5. `extractSpells()`

The combined row is then validated by `validateStrict()`.

Code:

- `src/parseMorgueText.ts`
- `src/validateStrict.ts`

## Crawl Source References

The equipment model follows Crawl's item concepts rather than only the printed English strings in morgues.

Main references in the Crawl source tree:

- `item-def.h`
  - object categories such as `OBJ_ARMOUR` and `OBJ_JEWELLERY`
  - subtype concept for specific items inside those categories
- `item-name.cc`
  - how normal items, ego items, and artefacts are rendered into player-facing names
  - useful for distinguishing armour egos from jewellery subtypes
- `item-prop.cc`
  - which armour egos are legal for which subtypes
  - intrinsic properties on armour bases such as dragon scales
- `artefact.h`
  - fixed unrand property storage
- `artefact.cc`
  - artefact property enumeration
  - code paths that combine intrinsic item properties with artefact properties for display and evaluation
- `player-equip.h`
  - `player_equip_set`
  - `player_equip_entry`
- `equipment-slot.h`
  - slot enums such as `SLOT_BODY_ARMOUR`, `SLOT_HELMET`, `SLOT_GLOVES`, `SLOT_BOOTS`, `SLOT_CLOAK`, `SLOT_RING`, `SLOT_AMULET`
  - `SLOT_HAUNTED_AUX` for poltergeist-compatible haunted auxiliary equipment
- `player-equip.cc`
  - compatible slot mapping, including `SLOT_HAUNTED_AUX`

These are the reason the parser treats these as separate concepts:

- armour base type
- armour ego
- jewellery subtype effect
- randart/unrand artefact properties
- intrinsic base-item properties

## Base Stats

Base stats are intentionally simple:

- `version`
- `playerName`
- `species`
- `speciesVariant`
- `background`
- `god`
- `xl`
- `ac`
- `ev`
- `sh`
- `strength`
- `intelligence`
- `dexterity`

Notes:

- `version` keeps the raw morgue version token, for example `0.35-a0-257-gf9e06672e4`
- `species` is normalized to canonical species names
- `speciesVariant` preserves extra descriptor detail such as `White Draconian`
- `god` comes from the morgue header `God:` field and is `null` when the header is blank

Code:

- `src/extractBaseStats.ts`

## Skills

Skills live under two parallel objects:

- `skills`: the trained or base values
- `effectiveSkills`: the currently displayed values after passive or temporary modifiers

Examples:

- `skills.fighting`
- `skills.axes`
- `skills.armour`
- `skills.spellcasting`
- `skills.conjurations`
- `skills.invocations`
- `effectiveSkills.fighting`
- `effectiveSkills.spellcasting`

When a skill line includes a parenthesized value:

- the first number is stored in `skills`
- the parenthesized number is stored in `effectiveSkills`

When no parenthesized value exists, `effectiveSkills` falls back to the same number as `skills`.

Code:

- `src/extractSkills.ts`

## Mutations and Innate Traits

`mutations` comes from the `A:` line in the morgue header.

Important detail:

- this is not only "mutation-causing effects"
- it is the terse trait list shown by Crawl on the `A:` line in that morgue
- parenthesized entries are preserved as `suppressed: true`
- bracketed entries are preserved as `transient: true`

So `mutations` may include:

- species innate traits
- form- or god-derived traits shown on the `A:` line
- actual mutations such as `devolution 1`
- suppressed traits that Crawl shows in parentheses

Each entry is stored as:

```ts
type MutationEntrySnapshot = {
  name: string
  level: number | null
  suppressed?: true
  transient?: true
}
```

Examples:

- `horns 3` -> `{ name: "horns", level: 3 }`
- `devolution 1` -> `{ name: "devolution", level: 1 }`
- `big wings` -> `{ name: "big wings", level: null }`
- `(nimble swimmer 1)` -> `{ name: "nimble swimmer", level: 1, suppressed: true }`
- `[poor constitution 2]` -> `{ name: "poor constitution", level: 2, transient: true }`

Code:

- `src/extractMutations.ts`

## Spells

The parser extracts both memorized spells and spell-library tables.

Each spell row stores:

- `name`
- `failurePercent`
- `castable`
- `memorized`

Built-in canonical spell names help restore truncated morgue spell names like `Lehudib's Crystal Sp` back to `Lehudib's Crystal Spear`.
`failurePercent` is numeric for castable rows and `null` for modern spell-library rows that the morgue marks as unusable. `castable` makes that two-state distinction explicit without adding a string enum.

Code:

- `src/extractSpells.ts`
- `src/canonicalSpellNames.ts`

## Equipment Model

The parser keeps two layers:

1. slot summary strings
2. semantic `...Details` objects

Examples:

- `bodyArmour`
- `shield`
- `helmets`
- `gloves`
- `footwear`
- `cloaks`
- `rings`

plus:

- `bodyArmourDetails`
- `shieldDetails`
- `helmetDetails`
- `glovesDetails`
- `footwearDetails`
- `cloakDetails`
- `ringDetails`

The summary values keep the morgue-facing item names. The detail objects try to mirror Crawl item semantics more closely.

Each detail contains fields such as:

- `rawName`
- `displayName`
- `objectClass`
- `equipState`
- `isCursed`
- `baseType`
- `enchant`
- `artifactKind`
- `ego`
- `subtypeEffect`
- `propertiesText`
- `functionalInscriptions`
- `properties`
- `intrinsicProperties`
- `egoProperties`
- `artifactProperties`

### Property Bags

Equipment properties use a structured bag:

```ts
type EquipmentPropertyBag = {
  numeric: Partial<Record<EquipmentNumericPropertyKey, number>>
  flags: Partial<Record<EquipmentFlagPropertyKey, true>>
  specials: string[]
}
```

This mirrors Crawl's distinction between:

- intrinsic base-item properties
- ego-derived properties
- artefact-derived properties

and avoids lossy string arrays such as `["rN+", "rN++"]`.

Example:

- intrinsic `rN+` from pearl dragon scales
- extra `rN+` from randart properties
- final `properties.numeric.rN = 2`

Notes:

- `propertiesText` preserves the raw `{...}` inscription text from the morgue line.
- `functionalInscriptions` is emitted when the parser recognizes special Crawl inscription controls such as `!w`, `=f`, or `@r3`.
- `specials` may still contain unknown artefact tags or free-form player inscription text. The parser does not yet reliably split arbitrary custom note text away from all unknown item-property tokens.

Code:

- `src/extractEquipment.ts`
- `src/types.ts`

## Non-goals

This package only parses morgue text.

It does not:

- fetch raw morgues
- read xlogfiles
- manage SQLite state
- implement server politeness or retry logic

Those concerns belong in a wrapper or pipeline around the parser.

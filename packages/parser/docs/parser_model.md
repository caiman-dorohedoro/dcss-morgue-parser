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

`parseMorgueText()` builds a record from seven extractors:

1. `extractBaseStats()`
2. `extractEquipment()`
3. `extractForm()`
4. `extractSkills()`
5. `extractMutations()`
6. `extractSpells()`
7. `extractGodHistory()`

The combined row is then validated by `validateStrict()`.

Code:

- `src/parseMorgueText.ts`
- `src/validateStrict.ts`

## Crawl Source References

The equipment model follows Crawl's item concepts rather than only the printed English strings in morgues.

Main references in the Crawl source tree:

- `crawl/crawl-ref/source/item-def.h`
  - object categories such as `OBJ_ARMOUR` and `OBJ_JEWELLERY`
  - subtype concept for specific items inside those categories
- `crawl/crawl-ref/source/item-name.cc`
  - how normal items, ego items, and artefacts are rendered into player-facing names
  - useful for distinguishing armour egos from jewellery subtypes
  - gizmo display names and `installed` phrasing
- `crawl/crawl-ref/source/item-prop.cc`
  - which armour egos are legal for which subtypes
  - intrinsic properties on armour bases such as dragon scales
- `crawl/crawl-ref/source/artefact.h`
  - fixed unrand property storage
- `crawl/crawl-ref/source/artefact.cc`
  - artefact property enumeration
  - code paths that combine intrinsic item properties with artefact properties for display and evaluation
  - gizmo property generation
- `crawl/crawl-ref/source/player-equip.h`
  - `player_equip_set`
  - `player_equip_entry`
- `crawl/crawl-ref/source/equipment-slot.h`
  - slot enums such as `SLOT_BODY_ARMOUR`, `SLOT_HELMET`, `SLOT_GLOVES`, `SLOT_BOOTS`, `SLOT_CLOAK`, `SLOT_RING`, `SLOT_AMULET`
  - `SLOT_GIZMO` for Coglin gizmos
  - `SLOT_HAUNTED_AUX` for poltergeist-compatible haunted auxiliary equipment
- `crawl/crawl-ref/source/player-equip.cc`
  - compatible slot mapping, including `SLOT_HAUNTED_AUX`

Specific Crawl source paths worth checking when equipment parsing changes:

- `crawl/crawl-ref/source/artefact.cc`
  - common artefact property abbreviations such as `Clar`, `RMsl`, `Bane`, `-Cast`, `^Drain`, `*Rage`, `*Corrode`, and `^Contam`
- `crawl/crawl-ref/source/describe.cc`
  - player-facing descriptions for common artefact properties and gizmo effects
- `crawl/crawl-ref/source/item-prop-enum.h`
  - `special_gizmo_type` enum for `SpellMotor`, `Gadgeteer`, `RevGuard`, and `AutoDazzle`
- `crawl/crawl-ref/source/item-name.cc`
  - gizmo effect display tokens used in morgue `{...}` property text
- `crawl/crawl-ref/source/god-abil.cc`
  - Ashenzari curse shorthand mapping such as `Elem`, `Sorc`, `Comp`, `Self`, `Fort`, `Cun`, `Bglg`, `Melee`, `Range`, and `Dev`
- `crawl/crawl-ref/source/art-data.txt`
  - unrand-only inscription strings such as `Infuse+∞`, `VampMP`, `*Englaciate`, and `Wandboost`

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
- `godPietyDisplay`
- `godPietyRank`
- `godOstracismPips`
- `godStatus`
- `godUnderPenance`
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
- `godPietyDisplay` preserves the raw header bracket token such as `****..`
- `godPietyRank` counts `*` pips from the header when that display really means piety
- `godOstracismPips` counts `X` pips from the same header display
- `godStatus` preserves the current religion prose line such as `Vehumet was exalted by your worship.`
- `godUnderPenance` is a convenience boolean derived from penance prose or penitent title text

Important Crawl-aligned caveats:

- Gozag does not use the normal header pip display, so `godPietyDisplay` and `godPietyRank` may both be `null` even when `god` is not
- Xom's header pips are not ordinary piety rank, so the parser leaves `godPietyRank = null` there instead of pretending the stars are comparable
- the star display is a piety bucket, not exact piety

Relevant Crawl references:

- `crawl/crawl-ref/source/output.cc`
- `crawl/crawl-ref/source/religion.cc`
- `crawl/crawl-ref/source/chardump.cc`
- `crawl/crawl-ref/source/god-prayer.cc`

Code:

- `src/extractBaseStats.ts`

## Religion Notes

`godHistory` is a filtered structured view over religion-related entries in the
`Notes` section. It is intentionally narrower than a full generic note parser.

Each event stores:

- `type`
- `turn`
- `place`
- `god`
- optional `pietyRank`

Current event types:

- `join`
- `abandon`
- `penance`
- `forgiven`
- `gift`
- `piety_rank`

Examples:

- `Became a worshipper of Trog the Wrathful` -> `type: "join", god: "Trog"`
- `Fell from the grace of Ignis` -> `type: "abandon", god: "Ignis"`
- `Reached *** piety under Vehumet` -> `type: "piety_rank", god: "Vehumet", pietyRank: 3`
- `Received a gift from Okawaru` -> `type: "gift", god: "Okawaru"`

This is the parser layer that lets downstream tools detect conversions,
abandonment, forgiveness, and milestone timing without re-parsing free-form
note strings.

Relevant Crawl references:

- `crawl/crawl-ref/source/notes.cc`
- `crawl/crawl-ref/source/notes.h`

Code:

- `src/extractGodHistory.ts`

## Current Form

`form` is the parser's best snapshot of the character's current end-of-game
shape. It is not a full shapeshifting history and it is not restricted to the
exact wording of one printed line.

The parser resolves `form` in this order:

1. current `@:` status text
2. equipped talisman base type
3. overview prose fallback

This ordering matches Crawl semantics more closely than prose-only parsing.

- `@:` is usually the most stable source because Crawl fills it from the active
  form's long name
- equipped talismans help recover canonical forms such as `dragon-form`,
  `sphinx-form`, and `vampire-form` when the explicit status token is absent
- overview prose is still useful, but it is less canonical and sometimes more
  dynamic

Examples of normalized outputs:

- `dragon-form`
- `sphinx-form`
- `vampire-form`
- `statue-form`
- `eel hands`

Non-`-form` labels are still valid when Crawl itself uses that wording for the
active form. `eel hands` is the main example in current morgues.

The talisman fallback is based on Crawl's item and form concepts, not only on
free-form English prose. `protean talisman` is intentionally excluded from a
direct fixed mapping because it is a transforming intermediary rather than a
stable final form signal.

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
- `amulets`
- `rings`
- `gizmo`

plus:

- `bodyArmourDetails`
- `shieldDetails`
- `helmetDetails`
- `glovesDetails`
- `footwearDetails`
- `cloakDetails`
- `amuletDetails`
- `ringDetails`
- `gizmoDetails`

The summary values keep the morgue-facing item names. The detail objects try to mirror Crawl item semantics more closely.

Coglin gizmos are modeled as a dedicated slot instead of being folded into jewellery. Their inventory lines use `equipState = "installed"` rather than `worn`.

Amulets now follow the same array-shaped contract as rings or auxiliary armour. Even when only one amulet is worn, the parser emits `amulets` and `amuletDetails` as arrays so extra-slot items such as justicar's regalia do not need a special compatibility path.

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
- `gizmoEffects`
- `namedEffects`
- `ashenzariCurses`
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
  booleanProps: Partial<Record<EquipmentBooleanPropertyKey, true>>
  opaqueTokens: string[]
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
- common Crawl artprop abbreviations such as `Bane`, `-Cast`, `^Drain`, `*Rage`, `*Corrode`, `^Contam`, and `rMut` are normalized into `booleanProps`
- gizmo-only effect tokens are emitted separately as `gizmoEffects` when the item itself is a gizmo
- named non-generic item effects such as `Dragonpray`, `Riposte`, `Gadgeteer`, and `Wandboost` are emitted separately as `namedEffects` on non-gizmo items
- Ashenzari curse shorthand tokens are emitted separately as `ashenzariCurses`
- `opaqueTokens` are now the true residual bucket for unrand-specific strings, still-unknown tags, or free-form player inscription text

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

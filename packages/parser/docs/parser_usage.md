# Parser Usage Contract

This document is the shortest accurate guide for calling `dcss-morgue-parser`.
It is written for both human readers and LLM-powered coding tools.

Use this document when you need the exact calling pattern, return contract,
field invariants, and common edge cases without reading the longer model note.

For the full schema explanation, see [parser_model.md](./parser_model.md).
For the history behind the current contract, see [parser_changelog.md](./parser_changelog.md).

## Start Here

For most callers, the correct entrypoint is `parseMorgueText(text, options?)`.

The package:

- parses a morgue text string into structured JSON
- does not fetch morgues
- does not read or write files
- does not manage caches, queues, or databases

If you are generating code with this library, start from `parseMorgueText()`
and only reach for lower-level helpers when you have a specific need.

## Minimal Example

```ts
import { parseMorgueText } from 'dcss-morgue-parser'

const result = parseMorgueText(morgueText)

if (!result.ok) {
  console.error(result.failure.reason, result.failure.detail)
  return
}

const { record } = result

console.log(record.playerName)
console.log(record.species)
console.log(record.background)
console.log(record.skills.fighting)
console.log(record.effectiveSkills.fighting)
console.log(record.amulets)
console.log(record.gizmo ?? null)
```

If you need extra canonical spell names:

```ts
import { parseMorgueText } from 'dcss-morgue-parser'

const result = parseMorgueText(morgueText, {
  canonicalSpellNames: [
    "Iskenderun's Mystic Blast",
    'Construct Spike Launcher',
  ],
})
```

## Return Contract

`parseMorgueText()` returns a discriminated union:

```ts
type ParseMorgueTextResult =
  | {
      ok: true
      record: ParsedMorgueTextRecord
    }
  | {
      ok: false
      failure: {
        reason: string
        detail: string | null
      }
    }
```

Important rules:

- Check `result.ok` before reading `result.record`.
- On failure, there is no partial record.
- On success, `record` is already strict-validated.

## Success Record Invariants

The fields below are especially easy to misuse if you only skim the types.

### Nullable fields

These fields may be `null` on success:

- `playerName`
- `speciesVariant`
- `background`
- `god`
- `godPietyDisplay`
- `godPietyRank`
- `godStatus`
- `form`
- `statusText`

### Summary equipment fields

These summary fields are always strings on success and use `"none"` when no
item is equipped:

- `bodyArmour`
- `shield`
- `orb`
- `talisman`

These summary fields are always arrays and may be empty:

- `helmets`
- `gloves`
- `footwear`
- `cloaks`
- `amulets`
- `rings`

`gizmo` is the one special case:

- inside the lower-level equipment extractor it falls back to `"none"`
- in the final `parseMorgueText()` record it is omitted when no gizmo is installed

In other words, treat `record.gizmo` as optional and use `record.gizmo ?? null`
if you want a nullable display value.

### Detail objects

Detail objects are optional and only appear when the corresponding item exists.

Examples:

- `bodyArmourDetails`
- `shieldDetails`
- `helmetDetails`
- `amuletDetails`
- `ringDetails`
- `gizmoDetails`

When you need semantics, prefer the detail object over the summary string.

Examples:

- use `bodyArmour` when you just want the morgue-facing item name
- use `bodyArmourDetails` when you need `artifactKind`, `baseType`, `ego`, `properties`, or `equipState`

`baseType` follows Crawl's item subtype, not only the visible artefact name. For
example, `faerie dragon scales` is preserved as the raw/display name, while its
`baseType` is `acid dragon scales` because Crawl defines the unrand as
`OBJ_ARMOUR/ARM_ACID_DRAGON_ARMOUR`.

### Skills, spells, and displayed traits

- `skills` and `effectiveSkills` are full fixed-key maps, not sparse objects
- `spells` is always an array on success
- `statuses` is always an array on success
- `mutations` is always an array on success, but it stores the Crawl `A:` line's displayed traits
- `godHistory` is always an array on success

### God state

These fields are always present on success:

- `godOstracismPips`
- `godUnderPenance`

These fields are nullable because Crawl does not always expose them in the same
way:

- `godPietyDisplay`
- `godPietyRank`
- `godStatus`

Important interpretation rules:

- `godPietyDisplay` is the raw header pip token, for example `***...` or `****XX`
- `godPietyRank` is a star-count bucket, not exact piety
- `godOstracismPips` counts `X` pips from Ostracism-style god standing loss
- Gozag usually has no normal pip display
- Xom pips do not mean normal piety rank, so `godPietyRank` is left `null`
- `godStatus` is the religion prose line such as `Ru was exalted by your worship.`
- `godUnderPenance` is a convenience boolean derived from current prose or penitent title text

### God history

`godHistory` is a structured subset of the morgue `Notes` section.

It currently includes:

- `join`
- `abandon`
- `penance`
- `forgiven`
- `gift`
- `piety_rank`

Example:

```json
{
  "type": "abandon",
  "turn": 15490,
  "place": "Temple",
  "god": "Ignis"
}
```

### Current form

`form` is a nullable current-state snapshot, not a full shapeshifting history.

When present, the parser resolves it in this order:

- current `@:` status text
- equipped talisman base type
- overview prose fallback

Examples of returned values include:

- `dragon-form`
- `sphinx-form`
- `vampire-form`
- `statue-form`
- `eel hands`

Treat this field as normalized parser output rather than a literal copy of one
specific morgue line.

### Current statuses

`statusText` preserves the current `@:` line after wrapped continuation lines
are joined. It is `null` only when no `@:` line exists in the input.

`statuses` is the comma-split current status list in display order. Parentheses
and bracket details stay attached to the entry:

```json
{ "display": "fragile (+50% incoming damage)", "id": null }
{ "display": "ephemerally shielded", "id": "ephemeral_shield" }
```

Only a small set of calculator-relevant statuses currently receives normalized
IDs. Unknown or version-specific entries keep `id: null`. When Crawl prints
`@: no status effects`, `statusText` is `"no status effects"` and `statuses` is
empty.

## Normalization Rules

### Species and background

`species` is canonicalized when possible, while `speciesVariant` preserves
useful extra detail that would otherwise be lost.

Example:

```json
{
  "species": "Draconian",
  "speciesVariant": "White Draconian",
  "background": "Summoner"
}
```

### Skills vs effective skills

`skills` stores the trained or base values.
`effectiveSkills` stores the displayed values after modifiers.

When a skill line has no parenthesized value, both objects hold the same number.

### `mutations` mirrors the Crawl `A:` trait line

Despite the field name, `mutations` is not a whitelist-validated list of Crawl
`mutation_type` values. It is a structured snapshot of the terse trait list that
Crawl prints after `A:` in the morgue header.

Crawl builds that line from both actual mutations and "fakemuts", so entries can
include:

- innate species traits that are not implemented as real mutations
- form-derived traits
- god-related traits shown there
- actual mutations
- derived body traits such as ring capacity or amphibiousness
- suppressed entries from parentheses
- transient entries from brackets

The parser preserves the displayed label instead of resolving it back to a Crawl
enum. For example, `MP-powered wands` is the displayed mutation short description,
while `almost no armour` and `8 rings` are displayed traits rather than real
mutation catalog entries.

Examples:

```json
{ "name": "horns", "level": 3 }
{ "name": "nimble swimmer", "level": 2, "suppressed": true }
{ "name": "subdued magic", "level": 2, "transient": true }
```

### Spells use an explicit unusable state

For modern spell-library rows that the morgue marks as unusable:

- `failurePercent` is `null`
- `castable` is `false`

This is not the same thing as `100%` failure.

### Equipment keeps both summary text and semantic structure

The parser intentionally keeps:

- a summary layer, such as `shield: "buckler"`
- a detail layer, such as `shieldDetails.baseType = "buckler"`

The detail layer also splits properties by source:

- `properties`
- `intrinsicProperties`
- `egoProperties`
- `artifactProperties`

## Failure Reasons

These are the current failure reasons returned by `parseMorgueText()`.

| `failure.reason` | Meaning | Typical next step |
| --- | --- | --- |
| `missing_required_field` | A required field was absent after extraction | inspect `failure.detail` and the source morgue |
| `stat_parse_failed` | `Str`, `Int`, or `Dex` could not be parsed | inspect the stat line layout |
| `xl_parse_failed` | `XL` could not be parsed | inspect the stat line layout |
| `combat_stat_parse_failed` | `AC`, `EV`, or `SH` could not be parsed | inspect the stat line layout |
| `ambiguous_body_armour` | body armour summary could not be resolved | inspect equipment section formatting |
| `ambiguous_shield` | shield summary could not be resolved | inspect equipment section formatting |
| `skill_parse_failed` | the skill table could not be validated | inspect `Skills:` rows and current skill labels |
| `spell_section_parse_failed` | the spell section was missing or a spell row could not be parsed | inspect the spell table and `failure.detail` |
| `mutation_parse_failed` | the `A:` line could not be parsed into an array | inspect the mutation or trait line |
| `unsupported_morgue_layout` | an unexpected error escaped the parser-specific failures | inspect `failure.detail` and treat as a likely unsupported layout bug |

## Common Edge Cases

### Draconian variants

Do not treat `speciesVariant` as redundant decoration.
It preserves information that is intentionally not folded into canonical `species`.

```json
{
  "species": "Draconian",
  "speciesVariant": "White Draconian",
  "background": "Summoner"
}
```

### Two amulets are valid

Do not model amulets as a single nullable field.
The parser always uses arrays for `amulets` and `amuletDetails`.

```json
{
  "bodyArmour": "justicar's regalia",
  "amulets": [
    "amulet of regeneration",
    "amulet of dissipation"
  ]
}
```

### `gizmo` is optional in the final record

Do not assume `record.gizmo` always exists.
Use:

```ts
const gizmoName = result.ok ? (result.record.gizmo ?? null) : null
```

### Unusable spell-library rows are not numeric failures

```json
{
  "name": "Soul Splinter",
  "failurePercent": null,
  "castable": false,
  "memorized": false
}
```

### Summary and detail names can differ

For ego items and some presentation cases, `rawName` and `displayName` are not
the same string.

Example:

```json
{
  "rawName": "scarf",
  "displayName": "scarf of resistance"
}
```

### `form` may be inferred even when overview prose is absent

Modern morgues often expose current form most clearly on the `@:` line, but
some samples are more useful after a talisman-based fallback.

For example, the parser may emit:

```json
{
  "talisman": "dragon-coil talisman",
  "form": "dragon-form"
}
```

This is intentional. `form` is the parser's best current-form snapshot, while
`talisman` is the equipped item summary.

## Lower-Level Exports

The package also exports lower-level helpers such as:

- `extractBaseStats`
- `extractEquipment`
- `extractForm`
- `extractMutations`
- `extractSkills`
- `extractSpells`
- `splitSections`
- `validateStrict`
- `parseOrderedSkillKeys`
- `SKILL_DISPLAY_LABELS`
- `DEFAULT_SPECIES_NAMES`
- `DEFAULT_CANONICAL_SPELL_NAMES`

Most callers should not start here.
These exports are mainly useful for advanced tooling, debugging, and keeping
UIs aligned with parser behavior.

## Related Documents

- [Package README](../README.md)
- [Parser Model](./parser_model.md)
- [Parser Design Changelog](./parser_changelog.md)
- [Repository Documentation Catalog](../../../docs/meta--catalog.md)
- [Fixture Strategy](../../../docs/strategy--fixture.md)
- [Parser Debugging Workflow](../../../docs/workflow--parser-debugging.md)

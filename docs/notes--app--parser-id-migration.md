# App Migration Notes for Parser Canonical IDs

Created: 2026-04-28

## Purpose

This note is for application code that consumes `dcss-morgue-parser` records and
calculates derived values such as AC, SH, spell failure, or mutation modifiers.

Parser version `0.6.7` added canonical parser-owned IDs for selected current
statuses and displayed `A:` traits. The goal is to let apps stop comparing
version-sensitive display strings while keeping calculation rules in the app.

## What Changed

The parser now exports:

```ts
import {
  KNOWN_MUTATION_TRAIT_IDS,
  KNOWN_STATUS_IDS,
  type KnownMutationTraitId,
  type KnownStatusId,
} from 'dcss-morgue-parser'
```

`StatusEntrySnapshot.id` is now typed as:

```ts
id: KnownStatusId | null
```

`MutationEntrySnapshot` now includes:

```ts
traitId: KnownMutationTraitId | null
```

`name` is still the display-preserving label from the Crawl `A:` line. Use it
for UI and raw traceability. Use `traitId` for calculation branches.

## Before and After

Before parser `0.6.7`, apps had to compare displayed mutation names:

```ts
const hasDeformedBody = mutations.some(
  (mutation) => mutation.name === 'deformed body' || mutation.name === 'pseudopods',
)
```

After parser `0.6.7`, apps can compare the canonical trait ID:

```ts
const hasDeformedBody = mutations.some(
  (mutation) => mutation.traitId === KNOWN_MUTATION_TRAIT_IDS.deformedBody,
)
```

The parsed records preserve the original display label while adding the shared
identity:

```json
{ "name": "deformed body", "level": null, "traitId": "deformed_body" }
{ "name": "pseudopods", "level": null, "traitId": "deformed_body" }
```

## Migration Targets

Replace local status string constants with `KNOWN_STATUS_IDS`:

```ts
const hasIcemailDepleted = statuses.some(
  (status) => status.id === KNOWN_STATUS_IDS.icemailDepleted,
)
```

Replace mutation display-name checks with `KNOWN_MUTATION_TRAIT_IDS`:

```ts
const hasEphemeralShield = mutations.some(
  (mutation) => mutation.traitId === KNOWN_MUTATION_TRAIT_IDS.ephemeralShield,
)
```

When mutation level matters, keep reading `level` from the same entry:

```ts
const icemailLevel =
  mutations.find((mutation) => mutation.traitId === KNOWN_MUTATION_TRAIT_IDS.icemail)
    ?.level ?? 0
```

## Canonical Trait Coverage

The initial trait ID vocabulary intentionally covers only displayed `A:` traits
that downstream calculators already need:

| Display labels | `traitId` | Export |
| --- | --- | --- |
| `anti-wizardry`, `disrupted magic` | `disrupted_magic` | `KNOWN_MUTATION_TRAIT_IDS.disruptedMagic` |
| `distortion field`, `repulsion field` | `repulsion_field` | `KNOWN_MUTATION_TRAIT_IDS.repulsionField` |
| `tengu flight`, `evasive flight` | `evasive_flight` | `KNOWN_MUTATION_TRAIT_IDS.evasiveFlight` |
| `deformed body`, `pseudopods` | `deformed_body` | `KNOWN_MUTATION_TRAIT_IDS.deformedBody` |
| `ephemeral shield` | `ephemeral_shield` | `KNOWN_MUTATION_TRAIT_IDS.ephemeralShield` |
| `icemail` | `icemail` | `KNOWN_MUTATION_TRAIT_IDS.icemail` |
| `condensation shield` | `condensation_shield` | `KNOWN_MUTATION_TRAIT_IDS.condensationShield` |
| `reckless` | `reckless` | `KNOWN_MUTATION_TRAIT_IDS.reckless` |

Unknown or currently unmapped displayed traits keep `traitId: null`. Do not
treat `null` as a parser failure.

## Canonical Status Coverage

Current status IDs are still parsed from the `@:` line:

| Display labels | `id` | Export |
| --- | --- | --- |
| `ephemerally shielded` | `ephemeral_shield` | `KNOWN_STATUS_IDS.ephemeralShield` |
| `ice-armoured`, `icy armour` | `icy_armour` | `KNOWN_STATUS_IDS.icyArmour` |
| `icemail depleted` | `icemail_depleted` | `KNOWN_STATUS_IDS.icemailDepleted` |
| `vertiginous`, `vertigo` | `vertigo` | `KNOWN_STATUS_IDS.vertigo` |

Unknown or version-specific current statuses keep `id: null`.

## Responsibility Boundary

Keep these responsibilities in the parser:

- preserve Crawl display text
- expose stable IDs for selected parser-known statuses and displayed traits
- normalize known display aliases to the same ID

Keep these responsibilities in the app:

- decide how `ephemeral_shield` affects SH
- decide how `icemail_depleted` suppresses icemail AC or condensation SH
- decide how `[reckless]`, icemail level, condensation shield, and spell failure
  modifiers combine
- decide ordering rules for calculator effects

In short: branch on parser IDs, but keep calculator semantics in the app.

## Suggested App Checklist

1. Upgrade `dcss-morgue-parser` to `0.6.7` or newer.
2. Import `KNOWN_STATUS_IDS` and replace app-local status ID literals.
3. Import `KNOWN_MUTATION_TRAIT_IDS` and replace `mutation.name === ...`
   branches for the covered traits.
4. Keep UI display code on `mutation.name`, not `traitId`.
5. Add focused calculator tests for each replaced branch.
6. Keep fallback handling for `traitId: null` and `status.id: null`.

## Compatibility Note

`traitId` is a parser contract field, not a Crawl mutation enum. The
`mutations` array still mirrors the displayed `A:` trait line, including real
mutations, species traits, form traits, god/passive traits, suppressed entries,
and transient bracketed entries.

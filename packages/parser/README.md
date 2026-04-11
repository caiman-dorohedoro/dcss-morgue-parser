# dcss-morgue-parser

Parses DCSS morgue text into structured JSON. Works in Node.js and browsers.

## Installation

```bash
npm install dcss-morgue-parser
```

## Usage

```ts
import { parseMorgueText } from 'dcss-morgue-parser'

const result = parseMorgueText(morgueText)

if (result.ok) {
  console.log(result.record.playerName)
  console.log(result.record.species)
  console.log(result.record.background)
  console.log(result.record.skills.fighting)
} else {
  console.error(result.failure.reason, result.failure.detail)
}
```

## Output

- `version`, `playerName`, `species`, `speciesVariant`, `background`, `god`
- `xl`, `ac`, `ev`, `sh`, `strength`, `intelligence`, `dexterity`
- `skills` and `effectiveSkills`
- Equipment slot summaries plus `...Details` with property bags
- `spells`, `mutations`, `form`

See [Parser Model](./docs/parser_model.md) for the full schema.

## Scope

This package only parses morgue text. It does not fetch morgues, manage caches, or write to disk.

## Docs

- [LLM Index](./llms.txt) — shortest package-local index for LLM and agent consumers
- [Parser Model](./docs/parser_model.md) — output schema reference
- [Parser Usage Contract](./docs/parser_usage.md) — exact calling contract for agents and tooling

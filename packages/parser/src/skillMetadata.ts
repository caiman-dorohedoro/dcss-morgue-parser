import { splitSections } from './splitSections'
import type { SkillLevelsSnapshot } from './types'

export const SKILL_DISPLAY_LABELS: Record<keyof SkillLevelsSnapshot, string> = {
  fighting: 'Fighting',
  macesFlails: 'Maces & Flails',
  axes: 'Axes',
  polearms: 'Polearms',
  staves: 'Staves',
  unarmedCombat: 'Unarmed',
  throwing: 'Throwing',
  shortBlades: 'Short Blades',
  longBlades: 'Long Blades',
  rangedWeapons: 'Ranged',
  armour: 'Armour',
  dodging: 'Dodging',
  shields: 'Shields',
  stealth: 'Stealth',
  spellcasting: 'Spellcasting',
  conjurations: 'Conjurations',
  hexes: 'Hexes',
  summonings: 'Summonings',
  necromancy: 'Necromancy',
  forgecraft: 'Forgecraft',
  translocations: 'Translocations',
  transmutations: 'Transmutations',
  alchemy: 'Alchemy',
  fireMagic: 'Fire',
  iceMagic: 'Ice',
  airMagic: 'Air',
  earthMagic: 'Earth',
  poisonMagic: 'Poison',
  invocations: 'Invocations',
  evocations: 'Evocations',
  shapeshifting: 'Shapeshifting',
}

const SKILL_NAME_LOOKUP = {
  fighting: 'fighting',
  'maces & flails': 'macesFlails',
  axes: 'axes',
  polearms: 'polearms',
  staves: 'staves',
  'unarmed combat': 'unarmedCombat',
  throwing: 'throwing',
  'short blades': 'shortBlades',
  'long blades': 'longBlades',
  'ranged weapons': 'rangedWeapons',
  armour: 'armour',
  dodging: 'dodging',
  shields: 'shields',
  stealth: 'stealth',
  spellcasting: 'spellcasting',
  conjurations: 'conjurations',
  hexes: 'hexes',
  summonings: 'summonings',
  necromancy: 'necromancy',
  forgecraft: 'forgecraft',
  translocations: 'translocations',
  transmutations: 'transmutations',
  alchemy: 'alchemy',
  'fire magic': 'fireMagic',
  'ice magic': 'iceMagic',
  'air magic': 'airMagic',
  'earth magic': 'earthMagic',
  'poison magic': 'poisonMagic',
  invocations: 'invocations',
  evocations: 'evocations',
  shapeshifting: 'shapeshifting',
} as const satisfies Record<string, keyof SkillLevelsSnapshot>

const EMPTY_SKILL_LEVELS: SkillLevelsSnapshot = {
  fighting: 0,
  macesFlails: 0,
  axes: 0,
  polearms: 0,
  staves: 0,
  unarmedCombat: 0,
  throwing: 0,
  shortBlades: 0,
  longBlades: 0,
  rangedWeapons: 0,
  armour: 0,
  dodging: 0,
  shields: 0,
  stealth: 0,
  spellcasting: 0,
  conjurations: 0,
  hexes: 0,
  summonings: 0,
  necromancy: 0,
  forgecraft: 0,
  translocations: 0,
  transmutations: 0,
  alchemy: 0,
  fireMagic: 0,
  iceMagic: 0,
  airMagic: 0,
  earthMagic: 0,
  poisonMagic: 0,
  invocations: 0,
  evocations: 0,
  shapeshifting: 0,
}

const SKILL_LINE_PATTERN =
  /^(?:[O+*-]\s+)?Level\s+([0-9]+(?:\.[0-9])?)(?:\(([0-9]+(?:\.[0-9])?)\))?\s+(.+?)$/

type ParsedSkillEntry = {
  name: string
  key: keyof SkillLevelsSnapshot | null
  level: number
  effectiveLevel: number
}

export function createEmptySkillLevels(): SkillLevelsSnapshot {
  return { ...EMPTY_SKILL_LEVELS }
}

export function parseSkillEntries(text: string): ParsedSkillEntry[] {
  const section = splitSections(text).skills

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(SKILL_LINE_PATTERN)

      if (!match) {
        throw new Error(`Could not parse skill line: ${line}`)
      }

      return {
        name: match[3].trim(),
        key: SKILL_NAME_LOOKUP[match[3].trim().toLowerCase() as keyof typeof SKILL_NAME_LOOKUP] ?? null,
        level: Number(match[1]),
        effectiveLevel: match[2] ? Number(match[2]) : Number(match[1]),
      }
    })
}

export function parseOrderedSkillKeys(text: string): (keyof SkillLevelsSnapshot)[] {
  const ordered: (keyof SkillLevelsSnapshot)[] = []

  for (const entry of parseSkillEntries(text)) {
    if (entry.key && !ordered.includes(entry.key)) {
      ordered.push(entry.key)
    }
  }

  return ordered
}

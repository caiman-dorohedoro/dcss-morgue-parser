import {
  parseOrderedSkillKeys,
  SKILL_DISPLAY_LABELS,
  type EquipmentItemSnapshot,
  type ParsedMorgueTextRecord,
  type SkillLevelsSnapshot,
  type SpellSnapshot,
} from 'dcss-morgue-parser'

export type EquipmentGroup = {
  label: string
  summary: string[]
  details?: EquipmentItemSnapshot[]
}

const MORGUE_INPUT_STORAGE_KEY = 'dcss-morgue-viewer.raw-morgue'
const MORGUE_PERSISTENCE_STORAGE_KEY = 'dcss-morgue-viewer.persist-raw-morgue'

export function formatNullable(value: string | null | undefined) {
  if (!value || value === 'none') {
    return 'None'
  }

  return value
}

export function formatSkillValue(value: number) {
  return value.toFixed(value % 1 === 0 ? 0 : 1)
}

export function formatEnchantValue(value: number) {
  return value >= 0 ? `+${value}` : String(value)
}

export function summarizePropertyBag(item: EquipmentItemSnapshot) {
  const segments: string[] = []

  const numericEntries = Object.entries(item.properties.numeric).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
  if (numericEntries.length > 0) {
    segments.push(
      ...numericEntries.map(([key, value]) => {
        const sign = value > 0 ? '+' : ''
        return `${key} ${sign}${value}`
      }),
    )
  }

  const flags = Object.keys(item.properties.booleanProps)
  if (flags.length > 0) {
    segments.push(...flags)
  }

  if (item.properties.opaqueTokens.length > 0) {
    segments.push(...item.properties.opaqueTokens)
  }

  return segments
}

export function buildEquipmentGroups(record: ParsedMorgueTextRecord): EquipmentGroup[] {
  return [
    {
      label: 'Body',
      summary: [record.bodyArmour],
      details: record.bodyArmourDetails ? [record.bodyArmourDetails] : undefined,
    },
    {
      label: 'Shield',
      summary: [record.shield],
      details: record.shieldDetails ? [record.shieldDetails] : undefined,
    },
    {
      label: 'Aux',
      summary: [...record.helmets, ...record.cloaks, ...record.gloves, ...record.footwear],
      details: [
        ...(record.helmetDetails ?? []),
        ...(record.cloakDetails ?? []),
        ...(record.glovesDetails ?? []),
        ...(record.footwearDetails ?? []),
      ],
    },
    {
      label: 'Jewellery',
      summary: [...record.amulets, ...record.rings],
      details: [...(record.amuletDetails ?? []), ...(record.ringDetails ?? [])],
    },
    {
      label: 'Orb / Gizmo / Talisman',
      summary: [record.orb, record.gizmo, record.talisman].filter(Boolean) as string[],
      details: [record.orbDetails, record.gizmoDetails, record.talismanDetails].filter(
        (value): value is EquipmentItemSnapshot => Boolean(value),
      ),
    },
  ]
}

export function getTopSkills(
  skills: SkillLevelsSnapshot,
  effectiveSkills: SkillLevelsSnapshot,
  sourceText: string,
) {
  const parsedOrder = parseOrderedSkillKeys(sourceText)
  const fallbackOrder = (Object.keys(SKILL_DISPLAY_LABELS) as (keyof SkillLevelsSnapshot)[]).filter(
    (key) => !parsedOrder.includes(key),
  )

  return [...parsedOrder, ...fallbackOrder]
    .map((key) => ({
      key,
      label: SKILL_DISPLAY_LABELS[key],
      base: skills[key],
      effective: effectiveSkills[key],
    }))
    .filter((entry) => entry.effective > 0 || entry.base > 0)
    .slice(0, 10)
}

export function splitSpells(spells: SpellSnapshot[]) {
  return {
    memorized: spells.filter((spell) => spell.memorized),
    library: spells.filter((spell) => !spell.memorized),
  }
}

export function handleFailureDetail(detail: string | null) {
  return detail ?? 'The parser could not recognize the morgue layout.'
}

export function readPersistPreference() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const storedValue = window.localStorage.getItem(MORGUE_PERSISTENCE_STORAGE_KEY)
    return storedValue === null ? true : storedValue === 'true'
  } catch {
    return true
  }
}

export function readStoredInput() {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    return window.localStorage.getItem(MORGUE_INPUT_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function storePersistPreference(persistInput: boolean) {
  window.localStorage.setItem(MORGUE_PERSISTENCE_STORAGE_KEY, String(persistInput))
}

export function clearStoredInput() {
  window.localStorage.removeItem(MORGUE_INPUT_STORAGE_KEY)
}

export function storeInput(input: string) {
  window.localStorage.setItem(MORGUE_INPUT_STORAGE_KEY, input)
}

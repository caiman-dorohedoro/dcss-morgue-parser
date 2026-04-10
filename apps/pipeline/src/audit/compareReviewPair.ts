import {
  splitSections,
  type ParsedMorgueTextRecord,
} from 'dcss-morgue-parser'

const EQUIPPED_STATE_PATTERN = /\((worn|melded|haunted|installed)\)/
const ROLE_LINE_PATTERN = /^[^\n]*\(([^()]+)\)\s+Turns:/m

export type ReviewPairComparison = {
  rawRole: string | null
  parsedRoles: string[]
  inventoryEquippedNames: string[]
  parsedEquippedNames: string[]
  mismatches: string[]
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}

function normalizeInventoryEquippedName(segment: string): string {
  return segment
    .trim()
    .replace(/^[A-Za-z]+:\s*/, '')
    .replace(/^[A-Za-z0-9]+ -\s*/, '')
    .replace(/^(?:a|an|the)\s+/i, '')
    .replace(/^(?:cursed|uncursed)\s+/i, '')
    .replace(/^[+-]\d+\s+/, '')
    .replace(/\s+\{[^}]*\}\s*$/, '')
    .trim()
}

function extractEquippedNameFromInventoryLine(line: string): string | null {
  const stateIndex = line.search(EQUIPPED_STATE_PATTERN)

  if (stateIndex === -1) {
    return null
  }

  const beforeState = line.slice(0, stateIndex).trim()
  const lastSegment = beforeState.includes(':')
    ? beforeState.slice(beforeState.lastIndexOf(':') + 1)
    : beforeState
  const normalized = normalizeInventoryEquippedName(lastSegment)

  return normalized.length > 0 ? normalized : null
}

function buildParsedRoleVariants(record: ParsedMorgueTextRecord): string[] {
  const roles = record.speciesVariant
    ? [`${record.speciesVariant} ${record.background}`, `${record.species} ${record.background}`]
    : [`${record.species} ${record.background}`]

  return dedupe(roles)
}

function buildParsedEquippedNames(record: ParsedMorgueTextRecord): string[] {
  return dedupe(
    [
      record.bodyArmour,
      record.shield,
      ...record.helmets,
      ...record.gloves,
      ...record.footwear,
      ...record.cloaks,
      record.orb,
      ...record.amulets,
      ...record.rings,
      record.gizmo,
      record.talisman,
    ].filter((value): value is string => Boolean(value) && value !== 'none'),
  )
}

function isCompactRoleToken(rawRole: string): boolean {
  return !rawRole.includes(' ')
}

export function extractRawRole(text: string): string | null {
  const match = text.match(ROLE_LINE_PATTERN)
  return match ? match[1].trim() : null
}

export function extractInventoryEquippedNames(text: string): string[] {
  return dedupe(
    splitSections(text)
      .equipment
      .split('\n')
      .map((line) => extractEquippedNameFromInventoryLine(line))
      .filter((name): name is string => name !== null),
  )
}

export function compareReviewPair(
  rawText: string,
  parsed: ParsedMorgueTextRecord,
): ReviewPairComparison {
  const rawRole = extractRawRole(rawText)
  const parsedRoles = buildParsedRoleVariants(parsed)
  const inventoryEquippedNames = extractInventoryEquippedNames(rawText)
  const inventoryEquippedSet = new Set(inventoryEquippedNames)
  const parsedEquippedNames = buildParsedEquippedNames(parsed)
  const mismatches: string[] = []

  if (rawRole && !isCompactRoleToken(rawRole) && !parsedRoles.includes(rawRole)) {
    mismatches.push(`role mismatch: raw=${rawRole} parsed=${parsedRoles[0]}`)
  }

  for (const equippedName of parsedEquippedNames) {
    if (!inventoryEquippedSet.has(equippedName)) {
      mismatches.push(`equipped item missing from inventory snippet: ${equippedName}`)
    }
  }

  return {
    rawRole,
    parsedRoles,
    inventoryEquippedNames,
    parsedEquippedNames,
    mismatches,
  }
}

export function formatReviewPairComparison(result: ReviewPairComparison): string {
  const lines = [
    `Raw role: ${result.rawRole ?? 'unknown'}`,
    `Parsed role: ${result.parsedRoles[0] ?? 'unknown'}`,
    `Inventory equipped: ${result.inventoryEquippedNames.join(', ') || 'none'}`,
    `Parsed equipped: ${result.parsedEquippedNames.join(', ') || 'none'}`,
  ]

  if (result.mismatches.length === 0) {
    lines.push('Status: no auto mismatches')
    return lines.join('\n')
  }

  lines.push('Status: auto-check mismatches')
  for (const mismatch of result.mismatches) {
    lines.push(`- ${mismatch}`)
  }

  return lines.join('\n')
}

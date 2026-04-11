import { DEFAULT_SPECIES_NAMES } from './canonicalSpecies'
import type { BaseStatsSnapshot } from './types'

const SORTED_SPECIES_NAMES = [...DEFAULT_SPECIES_NAMES].sort((left, right) => right.length - left.length)

type ExtractBaseStatsOptions = {
  speciesNames?: readonly string[]
}

function parseVersion(text: string): BaseStatsSnapshot['version'] {
  const versionText = text.match(/Dungeon Crawl Stone Soup version ([^\s(]+)/)?.[1]

  if (!versionText) {
    throw new Error('Could not find morgue version line')
  }

  return versionText
}

function parsePlayerName(text: string): string | null {
  const summaryLineName = text.match(/^\s*\d+\s+(\S+)\s+the\b/m)?.[1]

  if (summaryLineName) {
    return summaryLineName
  }

  const titleLineName = text.match(/^\s*(\S+)\s+the\s+.+Turns:/m)?.[1]

  if (titleLineName) {
    return titleLineName
  }

  return null
}

function matchSpecies(descriptor: string, speciesNames: readonly string[]): string {
  const normalizedDescriptor = descriptor.trim().replace(
    /^[A-Za-z]+ Draconian(?:\b.*)?$/,
    'Draconian',
  )
  const species = speciesNames.find(
    (name) => normalizedDescriptor === name || normalizedDescriptor.startsWith(`${name} `),
  )

  if (!species) {
    throw new Error(`Could not match species from line: ${descriptor}`)
  }

  return species
}

function parseDescriptor(descriptor: string, speciesNames: readonly string[]): {
  species: string
  speciesVariant: string | null
  background: string | null
} {
  const trimmedDescriptor = descriptor.trim()
  const coloredDraconianMatch = trimmedDescriptor.match(/^([A-Za-z]+ Draconian)(?:\s+(.*))?$/)

  if (coloredDraconianMatch) {
    return {
      species: 'Draconian',
      speciesVariant: coloredDraconianMatch[1].trim(),
      background: coloredDraconianMatch[2]?.trim() || null,
    }
  }

  const species = matchSpecies(trimmedDescriptor, speciesNames)
  const background = trimmedDescriptor.slice(species.length).trim()

  return {
    species,
    speciesVariant: null,
    background: background || null,
  }
}

function getCharacterDescriptors(text: string): string[] {
  const descriptors = [
    text.match(/^\s*Began as an? (.+?) on [A-Z][a-z]{2} \d{1,2}, \d{4}\.$/m)?.[1],
    text.match(/^[^\n]*\(([^)]+)\)\s+Turns:/m)?.[1],
    text.match(/You are an? (.+?)\./)?.[1],
  ]

  return [
    ...new Set(
      descriptors
        .map((descriptor) => descriptor?.trim())
        .filter((descriptor): descriptor is string => Boolean(descriptor)),
    ),
  ]
}

function getParsedDescriptor(
  text: string,
  speciesNames: readonly string[],
): {
  species: string
  speciesVariant: string | null
  background: string | null
} {
  let lastError: Error | null = null

  for (const descriptor of getCharacterDescriptors(text)) {
    try {
      return parseDescriptor(descriptor, speciesNames)
    } catch (error) {
      if (error instanceof Error) {
        lastError = error
        continue
      }

      throw error
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error('Could not find species line')
}

function parseSpecies(text: string, speciesNames: readonly string[]): string {
  return getParsedDescriptor(text, speciesNames).species
}

function parseSpeciesVariant(text: string, speciesNames: readonly string[]): string | null {
  return getParsedDescriptor(text, speciesNames).speciesVariant
}

function parseBackground(text: string, speciesNames: readonly string[]): string | null {
  return getParsedDescriptor(text, speciesNames).background
}

function parseGod(text: string): string | null {
  const line = text.match(/^.*\bGod:[ \t]*(.*)$/m)?.[1]

  if (line === undefined) {
    return null
  }

  const god = line
    .replace(/\s+\[[^\]]*\]\s*$/, '')
    .trim()

  return god || null
}

function parsePrimaryStats(text: string) {
  const legacyMatch = text.match(/You have (\d+) Strength, (\d+) Intelligence and (\d+) Dexterity\./)

  if (legacyMatch) {
    return {
      strength: Number(legacyMatch[1]),
      intelligence: Number(legacyMatch[2]),
      dexterity: Number(legacyMatch[3]),
    }
  }

  const strength = text.match(/\bStr:\s+(\d+)/)?.[1]
  const intelligence = text.match(/\bInt:\s+(\d+)/)?.[1]
  const dexterity = text.match(/\bDex:\s+(\d+)/)?.[1]

  if (!strength || !intelligence || !dexterity) {
    throw new Error('Could not parse primary stats')
  }

  return {
    strength: Number(strength),
    intelligence: Number(intelligence),
    dexterity: Number(dexterity),
  }
}

function parseDefensiveStats(text: string) {
  const xl = text.match(/\bXL:\s+(\d+)/)?.[1]
  const ac = text.match(/\bAC:\s+(-?\d+)/)?.[1]
  const ev = text.match(/\bEV:\s+(-?\d+)/)?.[1]
  const sh = text.match(/\bSH:\s+(-?\d+)/)?.[1]

  if (!xl || !ac || !ev || !sh) {
    throw new Error('Could not parse XL/AC/EV/SH')
  }

  return {
    xl: Number(xl),
    ac: Number(ac),
    ev: Number(ev),
    sh: Number(sh),
  }
}

export function extractBaseStats(text: string, options?: ExtractBaseStatsOptions): BaseStatsSnapshot {
  const speciesNames = [...(options?.speciesNames ?? SORTED_SPECIES_NAMES)].sort(
    (left, right) => right.length - left.length,
  )

  return {
    playerName: parsePlayerName(text),
    version: parseVersion(text),
    species: parseSpecies(text, speciesNames),
    speciesVariant: parseSpeciesVariant(text, speciesNames),
    background: parseBackground(text, speciesNames),
    god: parseGod(text),
    ...parseDefensiveStats(text),
    ...parsePrimaryStats(text),
  }
}

import type { MutationEntrySnapshot, MutationSnapshot } from './types'
import { KNOWN_MUTATION_TRAIT_IDS, type KnownMutationTraitId } from './mutationTraitIds'
import { splitSections } from './splitSections'

const STOP_LINE_PATTERNS = [/^}:/, /^[a-z]:/i, /^\d+:/, /^You /, /^[A-Z][^,]*:$/]

const TRAIT_ID_BY_NAME: Readonly<Record<string, KnownMutationTraitId>> = {
  acrobatic: KNOWN_MUTATION_TRAIT_IDS.acrobatic,
  'anti-wizardry': KNOWN_MUTATION_TRAIT_IDS.disruptedMagic,
  'condensation shield': KNOWN_MUTATION_TRAIT_IDS.condensationShield,
  'deformed body': KNOWN_MUTATION_TRAIT_IDS.deformedBody,
  'disrupted magic': KNOWN_MUTATION_TRAIT_IDS.disruptedMagic,
  'distortion field': KNOWN_MUTATION_TRAIT_IDS.repulsionField,
  'ephemeral shield': KNOWN_MUTATION_TRAIT_IDS.ephemeralShield,
  'evasive flight': KNOWN_MUTATION_TRAIT_IDS.evasiveFlight,
  'gelatinous body': KNOWN_MUTATION_TRAIT_IDS.gelatinousBody,
  icemail: KNOWN_MUTATION_TRAIT_IDS.icemail,
  'icy blue scales': KNOWN_MUTATION_TRAIT_IDS.icyBlueScales,
  'iridescent scales': KNOWN_MUTATION_TRAIT_IDS.iridescentScales,
  'iron-fused scales': KNOWN_MUTATION_TRAIT_IDS.ironFusedScales,
  'large bone plates': KNOWN_MUTATION_TRAIT_IDS.largeBonePlates,
  'molten scales': KNOWN_MUTATION_TRAIT_IDS.moltenScales,
  'protean grace': KNOWN_MUTATION_TRAIT_IDS.proteanGrace,
  pseudopods: KNOWN_MUTATION_TRAIT_IDS.deformedBody,
  reckless: KNOWN_MUTATION_TRAIT_IDS.reckless,
  'reduced ac': KNOWN_MUTATION_TRAIT_IDS.reducedAc,
  'reduced ev': KNOWN_MUTATION_TRAIT_IDS.reducedEv,
  'repulsion field': KNOWN_MUTATION_TRAIT_IDS.repulsionField,
  'rugged brown scales': KNOWN_MUTATION_TRAIT_IDS.ruggedBrownScales,
  'sanguine armour': KNOWN_MUTATION_TRAIT_IDS.sanguineArmour,
  'shaggy fur': KNOWN_MUTATION_TRAIT_IDS.shaggyFur,
  'sharp scales': KNOWN_MUTATION_TRAIT_IDS.sharpScales,
  'slimy green scales': KNOWN_MUTATION_TRAIT_IDS.slimyGreenScales,
  'stone body': KNOWN_MUTATION_TRAIT_IDS.stoneBody,
  'sturdy frame': KNOWN_MUTATION_TRAIT_IDS.sturdyFrame,
  'tengu flight': KNOWN_MUTATION_TRAIT_IDS.evasiveFlight,
  'thin metallic scales': KNOWN_MUTATION_TRAIT_IDS.thinMetallicScales,
  'tough skin': KNOWN_MUTATION_TRAIT_IDS.toughSkin,
  trickster: KNOWN_MUTATION_TRAIT_IDS.trickster,
  'yellow scales': KNOWN_MUTATION_TRAIT_IDS.yellowScales,
}

function collectAbilityLine(header: string): string {
  const lines = header.split('\n')
  const startIndex = lines.findIndex((line) => /^A:\s*/.test(line))

  if (startIndex === -1) {
    return ''
  }

  const collected = [lines[startIndex].replace(/^A:\s*/, '').trim()]

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line || STOP_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
      break
    }

    collected.push(line)
  }

  return collected.join(' ').replace(/\s+/g, ' ').trim()
}

function parseMutationEntry(entry: string): MutationEntrySnapshot {
  let normalizedEntry = entry.trim()
  let suppressed = false
  let transient = false

  while (true) {
    const suppressedMatch = normalizedEntry.match(/^\((.*)\)$/)

    if (suppressedMatch) {
      normalizedEntry = suppressedMatch[1].trim()
      suppressed = true
      continue
    }

    const transientMatch = normalizedEntry.match(/^\[(.*)\]$/)

    if (transientMatch) {
      normalizedEntry = transientMatch[1].trim()
      transient = true
      continue
    }

    break
  }

  const leveledMatch = normalizedEntry.match(/^(.*\S)\s+(\d+)$/)

  if (leveledMatch) {
    const name = leveledMatch[1].trim()

    return {
      name,
      level: Number.parseInt(leveledMatch[2], 10),
      traitId: TRAIT_ID_BY_NAME[name.toLowerCase()] ?? null,
      ...(suppressed ? { suppressed: true as const } : {}),
      ...(transient ? { transient: true as const } : {}),
    }
  }

  return {
    name: normalizedEntry,
    level: null,
    traitId: TRAIT_ID_BY_NAME[normalizedEntry.toLowerCase()] ?? null,
    ...(suppressed ? { suppressed: true as const } : {}),
    ...(transient ? { transient: true as const } : {}),
  }
}

export function extractMutations(text: string): MutationSnapshot {
  const abilityLine = collectAbilityLine(splitSections(text).header)

  if (!abilityLine) {
    return { mutations: [] }
  }

  return {
    mutations: abilityLine
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => parseMutationEntry(entry)),
  }
}

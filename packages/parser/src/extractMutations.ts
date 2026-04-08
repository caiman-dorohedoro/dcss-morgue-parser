import type { MutationEntrySnapshot, MutationSnapshot } from './types'
import { splitSections } from './splitSections'

const STOP_LINE_PATTERNS = [/^}:/, /^[a-z]:/i, /^\d+:/, /^You /, /^[A-Z][^,]*:$/]

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
    return {
      name: leveledMatch[1].trim(),
      level: Number.parseInt(leveledMatch[2], 10),
      ...(suppressed ? { suppressed: true as const } : {}),
      ...(transient ? { transient: true as const } : {}),
    }
  }

  return {
    name: normalizedEntry,
    level: null,
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

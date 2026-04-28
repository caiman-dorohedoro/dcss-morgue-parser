import type { StatusEntrySnapshot, StatusSnapshot } from './types'
import { KNOWN_STATUS_IDS, type KnownStatusId } from './statusIds'

const STATUS_ID_BY_DISPLAY: Readonly<Record<string, KnownStatusId>> = {
  'ephemerally shielded': KNOWN_STATUS_IDS.ephemeralShield,
  'ice-armoured': KNOWN_STATUS_IDS.icyArmour,
  'icy armour': KNOWN_STATUS_IDS.icyArmour,
  'icemail depleted': KNOWN_STATUS_IDS.icemailDepleted,
  vertiginous: KNOWN_STATUS_IDS.vertigo,
  vertigo: KNOWN_STATUS_IDS.vertigo,
}

function isStatusContinuation(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }

  if (/^(?:%|@|A|[a-z]|\}|\d):/i.test(trimmed)) {
    return false
  }

  if (/^[A-Z][A-Za-z0-9 %}'-]*:/.test(trimmed)) {
    return false
  }

  return true
}

function splitStatusDisplays(statusText: string): string[] {
  const displays: string[] = []
  let current = ''
  let parenDepth = 0
  let bracketDepth = 0

  for (const char of statusText) {
    if (char === '(') {
      parenDepth += 1
    } else if (char === ')' && parenDepth > 0) {
      parenDepth -= 1
    } else if (char === '[') {
      bracketDepth += 1
    } else if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1
    }

    if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
      const display = current.trim()
      if (display) {
        displays.push(display)
      }
      current = ''
      continue
    }

    current += char
  }

  const display = current.trim()
  if (display) {
    displays.push(display)
  }

  return displays
}

function stripStatusDetails(display: string): string {
  let baseDisplay = display.trim().toLowerCase()

  while (true) {
    const stripped = baseDisplay
      .replace(/\s*\([^()]*\)\s*$/u, '')
      .replace(/\s*\[[^[\]]*\]\s*$/u, '')
      .trim()

    if (stripped === baseDisplay) {
      return baseDisplay
    }

    baseDisplay = stripped
  }
}

function parseStatusEntry(display: string): StatusEntrySnapshot {
  return {
    display,
    id: STATUS_ID_BY_DISPLAY[stripStatusDetails(display)] ?? null,
  }
}

export function collectStatusText(text: string): string | null {
  const lines = text.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim().startsWith('@:')) {
      continue
    }

    const parts = [line.trim().slice(2).trim()]
    let cursor = index + 1

    while (cursor < lines.length && isStatusContinuation(lines[cursor])) {
      parts.push(lines[cursor].trim())
      cursor += 1
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  return null
}

export function extractStatuses(text: string): StatusSnapshot {
  const statusText = collectStatusText(text)

  if (!statusText || statusText === 'no status effects') {
    return {
      statusText,
      statuses: [],
    }
  }

  return {
    statusText,
    statuses: splitStatusDisplays(statusText).map((display) => parseStatusEntry(display)),
  }
}

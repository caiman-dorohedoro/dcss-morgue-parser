import type { FormSnapshot } from './types'

type ExtractFormOptions = {
  equippedTalismanBaseType?: string | null
}

type FormMatcher = {
  pattern: RegExp
  resolve: string | ((match: RegExpMatchArray) => string)
}

const FORM_BY_TALISMAN_BASE_TYPE: Readonly<Record<string, string>> = {
  'blade talisman': 'blade-form',
  'death talisman': 'death-form',
  'dragon-coil talisman': 'dragon-form',
  'eel talisman': 'eel hands',
  'fortress talisman': 'crab-form',
  'granite talisman': 'statue-form',
  'hive talisman': 'hive-form',
  'inkwell talisman': 'scroll-form',
  'lupine talisman': 'werewolf-form',
  'maw talisman': 'maw-form',
  'medusa talisman': 'medusa-form',
  'quill talisman': 'quill-form',
  'riddle talisman': 'sphinx-form',
  'rimehorn talisman': 'yak-form',
  'scarab talisman': 'scarab-form',
  'sanguine talisman': 'vampire-form',
  'serpent talisman': 'amphisbaena-form',
  'spider talisman': 'spider-form',
  'spore talisman': 'spore-form',
  'storm talisman': 'storm-form',
  'wellspring talisman': 'aqua-form',
}

const STATUS_FORM_MATCHERS: readonly FormMatcher[] = [
  {
    pattern: /\b([A-Za-z-]+-form)\b/,
    resolve: (match) => match[1],
  },
  {
    pattern: /\beel hands?\b/i,
    resolve: (match) => match[0].toLowerCase(),
  },
  {
    pattern: /\bvessel of slaughter\b/i,
    resolve: 'vessel of slaughter',
  },
]

const OVERVIEW_FORM_MATCHERS: readonly FormMatcher[] = [
  { pattern: /You (?:are|were) covered in sharp quills\./i, resolve: 'quill-form' },
  { pattern: /You (?:are|were) a walking scroll\./i, resolve: 'scroll-form' },
  { pattern: /You (?:have|had) blades growing out of your body\./i, resolve: 'blade-form' },
  { pattern: /You (?:are|were) a living statue of rough stone\./i, resolve: 'statue-form' },
  { pattern: /You (?:are|were) a stone statue\./i, resolve: 'statue-form' },
  { pattern: /You (?:are|were) an enormous two-headed serpent\./i, resolve: 'amphisbaena-form' },
  { pattern: /You (?:are|were) a fearsome .+dragon!/i, resolve: 'dragon-form' },
  { pattern: /You (?:are|were) an undying horror\./i, resolve: 'death-form' },
  { pattern: /You (?:are|were) a lightning-filled tempest!/i, resolve: 'storm-form' },
  { pattern: /You (?:are|were) overflowing with transmutational energy\./i, resolve: 'flux-form' },
  { pattern: /You (?:are|were) a living vampire\./i, resolve: 'vampire-form' },
  { pattern: /Your body (?:is|was) made of elemental water\./i, resolve: 'aqua-form' },
  { pattern: /You (?:are|were) a cunning sphinx\./i, resolve: 'sphinx-form' },
  { pattern: /You (?:are|were) a ferocious werewolf\./i, resolve: 'werewolf-form' },
  { pattern: /You (?:are|were) a heavily-armoured crab\./i, resolve: 'crab-form' },
  { pattern: /You (?:are|were) a gleaming scarab beetle\./i, resolve: 'scarab-form' },
  { pattern: /You (?:are|were) an ice-encrusted yak\./i, resolve: 'yak-form' },
  { pattern: /You (?:are|were) an agile web-spinner\./i, resolve: 'spider-form' },
  { pattern: /You (?:are|were) a living hive\./i, resolve: 'hive-form' },
  { pattern: /You (?:are|were) a creature with a mouth for a stomach\./i, resolve: 'maw-form' },
  { pattern: /You (?:have|had) a mane of long, stinging tendrils on your head\./i, resolve: 'medusa-form' },
  { pattern: /You (?:have|had) (?:an electric eel|electric eels) for hands?\./i, resolve: 'eel hands' },
  { pattern: /Your .* (?:is|was) a mass of colorful fungus\./i, resolve: 'spore-form' },
  { pattern: /You (?:are|were) a vessel of demonic slaughter\./i, resolve: 'vessel of slaughter' },
]

function isStatusContinuation(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }

  if (/^[A-Z][A-Za-z0-9 %}'-]*:/.test(trimmed) || /^\}:/.test(trimmed) || /^\d+:/.test(trimmed)) {
    return false
  }

  return true
}

function resolveMatchedForm(text: string, matchers: readonly FormMatcher[]): string | null {
  for (const matcher of matchers) {
    const match = text.match(matcher.pattern)
    if (!match) {
      continue
    }

    return typeof matcher.resolve === 'function'
      ? matcher.resolve(match)
      : matcher.resolve
  }

  return null
}

function resolveFormFromTalisman(baseType: string | null | undefined): string | null {
  if (!baseType) {
    return null
  }

  return FORM_BY_TALISMAN_BASE_TYPE[baseType.trim().toLowerCase()] ?? null
}

export function extractForm(text: string, options?: ExtractFormOptions): FormSnapshot {
  const lines = text.split('\n')
  let statusForm: string | null = null

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

    const statusText = parts.join(' ')
    statusForm = resolveMatchedForm(statusText, STATUS_FORM_MATCHERS)
    break
  }

  if (statusForm) {
    return {
      form: statusForm,
    }
  }

  const talismanForm = resolveFormFromTalisman(options?.equippedTalismanBaseType)
  if (talismanForm) {
    return {
      form: talismanForm,
    }
  }

  const overviewText = text.split(/\nInventory:\s*\n/i, 1)[0] ?? text
  const overviewForm = resolveMatchedForm(overviewText, OVERVIEW_FORM_MATCHERS)

  return {
    form: overviewForm,
  }
}

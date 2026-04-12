const DEFAULT_GOD_NAMES = [
  'the Shining One',
  'Kikubaaqudgha',
  'Nemelex Xobeh',
  'Hepliaklqana',
  'Yredelemnul',
  'Cheibriados',
  'Ashenzari',
  'Dithmenos',
  'Vehumet',
  'Okawaru',
  'Makhleb',
  'Sif Muna',
  'Elyvilon',
  'Uskayaw',
  'Fedhas',
  'Qazlal',
  'Beogh',
  'Jiyva',
  'Gozag',
  'Lugonu',
  'Ignis',
  'Trog',
  'Xom',
  'Zin',
  'Ru',
  'Wu Jian',
] as const

const SORTED_GOD_NAMES = [...DEFAULT_GOD_NAMES].sort((left, right) => right.length - left.length)

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function canonicalizeGodName(text: string): string {
  const trimmed = text.trim().replace(/\.$/, '')

  for (const godName of SORTED_GOD_NAMES) {
    const pattern = new RegExp(`(?:^|\\b)${escapeRegExp(godName)}(?:$|\\b)`)

    if (pattern.test(trimmed)) {
      return godName
    }
  }

  return trimmed
}

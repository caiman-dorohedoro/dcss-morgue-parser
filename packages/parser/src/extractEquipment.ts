import type {
  ArtifactKind,
  EquipmentAshenzariCurse,
  EquipmentEquipState,
  EquipmentBooleanPropertyKey,
  EquipmentGizmoEffect,
  EquipmentItemSnapshot,
  EquipmentNamedEffect,
  EquipmentNumericPropertyKey,
  EquipmentObjectClass,
  EquipmentPropertyBag,
  EquipmentSnapshot,
} from './types'
import { splitSections } from './splitSections'

const BODY_ARMOUR_LABELS = [
  'quicksilver dragon scales',
  'golden dragon scales',
  'shadow dragon scales',
  'storm dragon scales',
  'pearl dragon scales',
  'ice dragon scales',
  'fire dragon scales',
  'acid dragon scales',
  'swamp dragon scales',
  'steam dragon scales',
  'crystal plate armour',
  'troll leather armour',
  'animal skin',
  'plate armour',
  'chain mail',
  'scale mail',
  'ring mail',
  'leather armour',
  'robe',
] as const

const SHIELD_LABELS = ['tower shield', 'kite shield', 'buckler'] as const
const HELMET_LABELS = ['helmet', 'hat', 'hood', 'crown', 'mask', 'cap'] as const
const CLOAK_LABELS = ['cloak', 'scarf'] as const

type EquipmentLine = {
  category: string | null
  text: string
}

type EquipmentSlot =
  | 'bodyArmour'
  | 'shield'
  | 'footwear'
  | 'helmet'
  | 'gloves'
  | 'cloak'
  | 'orb'
  | 'amulet'
  | 'ring'
  | 'gizmo'
  | 'talisman'

type KnownUnrand = {
  name: string
  baseType?: string
}

const UNRAND_BODY_ARMOUR_ITEMS = [
  { name: 'faerie dragon scales', baseType: 'faerie dragon scales' },
  { name: 'robe of Augmentation', baseType: 'robe' },
  { name: "Lear's hauberk" },
  { name: 'skin of Zhor', baseType: 'animal skin' },
  { name: 'salamander hide armour', baseType: 'salamander hide armour' },
  { name: 'robe of Folly', baseType: 'robe' },
  { name: "Maxwell's patent armour" },
  { name: 'robe of Night', baseType: 'robe' },
  { name: 'scales of the Dragon King' },
  { name: 'robe of Clouds', baseType: 'robe' },
  { name: 'moon troll leather armour', baseType: 'troll leather armour' },
  { name: 'orange crystal plate armour', baseType: 'crystal plate armour' },
  { name: 'robe of Vines', baseType: 'robe' },
  { name: "Kryia's mail coat" },
  { name: 'armour of Talos' },
  { name: "Cigotuvi's embrace" },
  { name: 'toga "Victory"', baseType: 'robe' },
  { name: "swamp witch's dragon scales", baseType: 'swamp dragon scales' },
  { name: "justicar's regalia" },
] as const satisfies readonly KnownUnrand[]

const UNRAND_SHIELD_ITEMS = [
  { name: 'tower shield of Ignorance', baseType: 'tower shield' },
  { name: 'shield "Bullseye"' },
  { name: 'shield of Resistance', baseType: 'kite shield' },
  { name: 'shield of the Gong' },
  { name: "Storm Queen's Shield" },
  { name: "warlock's mirror" },
] as const satisfies readonly KnownUnrand[]

const UNRAND_FOOTWEAR_ITEMS = [
  { name: "Black Knight's barding", baseType: 'barding' },
  { name: 'lightning scales' },
  { name: 'boots of the spider', baseType: 'boots' },
  { name: 'seven-league boots', baseType: 'boots' },
  { name: 'mountain boots', baseType: 'boots' },
  { name: 'slick slippers', baseType: 'boots' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_HEAD_ITEMS = [
  { name: 'hat of the Bear Spirit', baseType: 'hat' },
  { name: 'hat of the Alchemist', baseType: 'hat' },
  { name: 'hat of Pondering', baseType: 'hat' },
  { name: 'hat of the High Council', baseType: 'hat' },
  { name: 'crown of Dyrovepreva', baseType: 'crown' },
  { name: 'hood of the Assassin', baseType: 'hood' },
  { name: 'helm of the ram' },
  { name: 'Mask of the Dragon', baseType: 'mask' },
  { name: 'Mask of the Thief', baseType: 'mask' },
  { name: 'shining eye crown', baseType: 'crown' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_GLOVE_ITEMS = [
  { name: "Delatra's gloves", baseType: 'gloves' },
  { name: "fencer's gloves", baseType: 'gloves' },
  { name: 'gauntlets of War', baseType: 'gloves' },
  { name: 'gloves of the gadgeteer', baseType: 'gloves' },
  { name: "Mad Mage's Maulers", baseType: 'gloves' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_CLOAK_ITEMS = [
  { name: 'cloak of Starlight', baseType: 'cloak' },
  { name: 'cloak of Flash', baseType: 'cloak' },
  { name: 'cloak of the Thief', baseType: 'cloak' },
  { name: 'dragonskin cloak', baseType: 'cloak' },
  { name: 'ratskin cloak', baseType: 'cloak' },
  { name: 'scarf of invisibility', baseType: 'scarf' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_ORB_ITEMS = [
  { name: 'crystal ball of Wucad Mu', baseType: 'orb' },
  { name: 'orb of Dispater', baseType: 'orb' },
  { name: 'sphere of Battle', baseType: 'orb' },
  { name: "Charlatan's Orb", baseType: 'orb' },
  { name: 'skull of Zonguldrok', baseType: 'orb' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_AMULET_ITEMS = [
  { name: 'amulet of the Air', baseType: 'amulet' },
  { name: 'amulet of Cekugob', baseType: 'amulet' },
  { name: 'amulet of Tranquility', baseType: 'amulet' },
  { name: 'necklace of Bloodlust', baseType: 'amulet' },
  { name: 'brooch of Shielding', baseType: 'amulet' },
  { name: 'amulet of Vitality', baseType: 'amulet' },
  { name: 'macabre finger necklace', baseType: 'amulet' },
  { name: 'amulet of invisibility', baseType: 'amulet' },
  { name: 'dreamshard necklace', baseType: 'amulet' },
  { name: 'amulet of Elemental Vulnerability', baseType: 'amulet' },
  { name: "Hermit's Pendant", baseType: 'amulet' },
  { name: 'dreamdust necklace', baseType: 'amulet' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_RING_ITEMS = [
  { name: 'ring of Shadows', baseType: 'ring' },
  { name: 'ring of the Hare', baseType: 'ring' },
  { name: 'ring of the Tortoise', baseType: 'ring' },
  { name: 'ring of the Mage', baseType: 'ring' },
  { name: 'ring of the Octopus King', baseType: 'ring' },
] as const satisfies readonly KnownUnrand[]

const KNOWN_UNRAND_BY_SLOT: Record<EquipmentSlot, readonly KnownUnrand[]> = {
  bodyArmour: UNRAND_BODY_ARMOUR_ITEMS,
  shield: UNRAND_SHIELD_ITEMS,
  footwear: UNRAND_FOOTWEAR_ITEMS,
  helmet: UNRAND_HEAD_ITEMS,
  gloves: UNRAND_GLOVE_ITEMS,
  cloak: UNRAND_CLOAK_ITEMS,
  orb: UNRAND_ORB_ITEMS,
  amulet: UNRAND_AMULET_ITEMS,
  ring: UNRAND_RING_ITEMS,
  gizmo: [],
  talisman: [],
}

const ARMOUR_EGO_PROPERTIES_BY_NAME: Record<string, string[]> = {
  'fire resistance': ['rF+'],
  'cold resistance': ['rC+'],
  'poison resistance': ['rPois'],
  'see invisible': ['SInv'],
  invisibility: ['+Inv'],
  strength: ['Str+3'],
  dexterity: ['Dex+3'],
  intelligence: ['Int+3'],
  ponderousness: ['Ponderous'],
  flying: ['Fly'],
  willpower: ['Will+'],
  protection: ['AC+3'],
  stealth: ['Stlth+'],
  resistance: ['rC+', 'rF+'],
  'positive energy': ['rN+'],
  'the Archmagi': ['Archmagi'],
  'corrosion resistance': ['rCorr'],
  reflection: ['Reflect'],
  'spirit shield': ['Spirit'],
  hurling: ['Hurl'],
  repulsion: ['Repulsion'],
  harm: ['Harm'],
  shadows: ['Shadows'],
  rampaging: ['Rampage'],
  infusion: ['Infuse'],
  light: ['Light'],
  wrath: ['*Rage'],
  mayhem: ['Mayhem'],
  guile: ['Guile'],
  energy: ['Energy'],
  sniping: ['Snipe'],
  ice: ['Ice'],
  fire: ['Fire'],
  air: ['Air'],
  earth: ['Earth'],
  archery: ['Archery'],
  command: ['Command'],
  death: ['Death'],
  resonance: ['Resonance'],
  parrying: ['Parrying'],
  glass: ['Glass'],
  pyromania: ['Pyromania'],
  stardust: ['Stardust'],
  mesmerism: ['Mesmerism'],
  attunement: ['Attunement'],
}

const ARMOUR_EGO_NAME_BY_NORMALIZED = new Map(
  Object.keys(ARMOUR_EGO_PROPERTIES_BY_NAME).map((ego) => [ego.toLowerCase(), ego]),
)

const ARMOUR_EGO_BY_PROPERTY_SIGNATURE = new Map(
  Object.entries(ARMOUR_EGO_PROPERTIES_BY_NAME).map(([ego, properties]) => [
    properties.join(' '),
    ego,
  ]),
)

const INTRINSIC_PROPERTIES_BY_ARMOUR_BASE_TYPE: Record<string, string[]> = {
  'troll leather armour': ['Regen+'],
  'acid dragon scales': ['rCorr'],
  'quicksilver dragon scales': ['Will+'],
  'swamp dragon scales': ['rPois'],
  'fire dragon scales': ['rF++', 'rC-'],
  'ice dragon scales': ['rC++', 'rF-'],
  'pearl dragon scales': ['rN+'],
  'storm dragon scales': ['rElec'],
  'shadow dragon scales': ['Stlth+'],
  'golden dragon scales': ['rF+', 'rC+', 'rPois'],
}

const FIXED_JEWELLERY_PROPERTIES_BY_EFFECT: Record<string, string[]> = {
  'protection from fire': ['rF+'],
  'poison resistance': ['rPois'],
  'protection from cold': ['rC+'],
  'see invisible': ['SInv'],
  'resist corrosion': ['rCorr'],
  wizardry: ['Wiz'],
  'magical power': ['MP+9'],
  flight: ['Fly'],
  'positive energy': ['rN+'],
  willpower: ['Will+'],
  'magic regeneration': ['RegenMP+'],
  'the acrobat': ['Acrobat'],
  'guardian spirit': ['Spirit'],
  faith: ['Faith'],
  reflection: ['Reflect'],
  regeneration: ['Regen+'],
  wildshape: ['Wildshape'],
  chemistry: ['Chemistry'],
  dissipation: ['Dissipate'],
}

const NUMERIC_PROPERTY_ORDER = [
  'rF',
  'rC',
  'rN',
  'Will',
  'Str',
  'Int',
  'Dex',
  'Slay',
  'AC',
  'EV',
  'SH',
  'HP',
  'MP',
  'Regen',
  'RegenMP',
  'Stlth',
] as const satisfies readonly EquipmentNumericPropertyKey[]

const BOOLEAN_PROPERTY_ORDER = [
  'rPois',
  'rElec',
  'rCorr',
  'rMut',
  'SInv',
  'Fly',
  'Reflect',
  'Clar',
  'RMsl',
  'Faith',
  'Spirit',
  'Wiz',
  'Acrobat',
  'Rampage',
  'Harm',
  'Shadows',
  'Repulsion',
  'Archmagi',
  'Light',
  'Mayhem',
  'Guile',
  'Energy',
  'Air',
  'Fire',
  'Ice',
  'Earth',
  'Wildshape',
  'Chemistry',
  'Dissipate',
  'Attunement',
  'Mesmerism',
  'Stardust',
  'Hurl',
  'Snipe',
  'Bear',
  'Archery',
  'Command',
  'Death',
  'Resonance',
  'Parrying',
  'Glass',
  'Pyromania',
  'Ponderous',
  'Inv',
  '-Cast',
  'Bane',
  '*Rage',
  '^Drain',
  '*Corrode',
  '^Contam',
] as const satisfies readonly EquipmentBooleanPropertyKey[]

const NUMERIC_SEQUENCE_KEYS_BY_PREFIX: Record<string, EquipmentNumericPropertyKey> = {
  rF: 'rF',
  rC: 'rC',
  rN: 'rN',
  Will: 'Will',
  Regen: 'Regen',
  RegenMP: 'RegenMP',
  Stlth: 'Stlth',
}

const NUMERIC_SIGNED_KEYS_BY_PREFIX: Record<string, EquipmentNumericPropertyKey> = {
  Str: 'Str',
  Int: 'Int',
  Dex: 'Dex',
  Slay: 'Slay',
  AC: 'AC',
  EV: 'EV',
  SH: 'SH',
  HP: 'HP',
  MP: 'MP',
}

const BOOLEAN_PROPERTY_KEYS_BY_TOKEN: Record<string, EquipmentBooleanPropertyKey> = {
  rPois: 'rPois',
  rElec: 'rElec',
  rCorr: 'rCorr',
  rMut: 'rMut',
  SInv: 'SInv',
  Fly: 'Fly',
  Reflect: 'Reflect',
  Clar: 'Clar',
  RMsl: 'RMsl',
  Faith: 'Faith',
  Spirit: 'Spirit',
  Wiz: 'Wiz',
  Acrobat: 'Acrobat',
  Rampage: 'Rampage',
  Harm: 'Harm',
  Shadows: 'Shadows',
  Repulsion: 'Repulsion',
  Archmagi: 'Archmagi',
  Light: 'Light',
  Mayhem: 'Mayhem',
  Guile: 'Guile',
  Energy: 'Energy',
  Air: 'Air',
  Fire: 'Fire',
  Ice: 'Ice',
  Earth: 'Earth',
  Wildshape: 'Wildshape',
  Chemistry: 'Chemistry',
  Dissipate: 'Dissipate',
  Attunement: 'Attunement',
  Mesmerism: 'Mesmerism',
  Stardust: 'Stardust',
  Hurl: 'Hurl',
  Snipe: 'Snipe',
  Bear: 'Bear',
  Archery: 'Archery',
  Command: 'Command',
  Death: 'Death',
  Resonance: 'Resonance',
  Parrying: 'Parrying',
  Glass: 'Glass',
  Pyromania: 'Pyromania',
  Ponderous: 'Ponderous',
  '+Inv': 'Inv',
  '-Cast': '-Cast',
  Bane: 'Bane',
  '*Rage': '*Rage',
  '^Drain': '^Drain',
  '*Corrode': '*Corrode',
  '^Contam': '^Contam',
}

const GIZMO_EFFECT_ORDER = [
  'SpellMotor',
  'Gadgeteer',
  'RevGuard',
  'AutoDazzle',
] as const satisfies readonly EquipmentGizmoEffect[]

const GIZMO_EFFECT_TOKENS = new Set<string>(GIZMO_EFFECT_ORDER)

const NAMED_EFFECT_ORDER = [
  ...GIZMO_EFFECT_ORDER,
  'Dragonpray',
  'Riposte',
  'Wandboost',
] as const satisfies readonly EquipmentNamedEffect[]

const NAMED_EFFECT_TOKENS = new Set<string>(NAMED_EFFECT_ORDER)

const ASHENZARI_CURSE_ORDER = [
  'Melee',
  'Range',
  'Elem',
  'Sorc',
  'Comp',
  'Bglg',
  'Self',
  'Fort',
  'Cun',
  'Dev',
] as const satisfies readonly EquipmentAshenzariCurse[]

const ASHENZARI_CURSE_TOKENS = new Set<string>(ASHENZARI_CURSE_ORDER)

const SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT: Record<string, string> = {
  protection: 'AC',
  slaying: 'Slay',
  evasion: 'EV',
  stealth: 'Stlth',
  strength: 'Str',
  dexterity: 'Dex',
  intelligence: 'Int',
}

const BODY_ARMOUR_PATTERNS = BODY_ARMOUR_LABELS.map((label) => ({
  label,
  baseType: label,
}))

const SHIELD_PATTERNS = SHIELD_LABELS.map((label) => ({
  label,
  baseType: label,
}))

const HELMET_PATTERNS = HELMET_LABELS.map((label) => ({
  label,
  baseType: label,
}))

const CLOAK_PATTERNS = CLOAK_LABELS.map((label) => ({
  label,
  baseType: label,
}))

const FOOTWEAR_PATTERNS = [
  { label: 'pair of boots', baseType: 'boots' },
  { label: 'boots', baseType: 'boots' },
  { label: 'barding', baseType: 'barding' },
] as const

const GLOVE_PATTERNS = [
  { label: 'pair of gloves', baseType: 'gloves' },
  { label: 'gloves', baseType: 'gloves' },
  { label: 'pair of gauntlets', baseType: 'gloves' },
  { label: 'gauntlets', baseType: 'gloves' },
] as const

const TALISMAN_PATTERNS = [
  { label: 'talisman', baseType: 'talisman' },
] as const

const BASE_PATTERNS_BY_SLOT = {
  bodyArmour: BODY_ARMOUR_PATTERNS,
  shield: SHIELD_PATTERNS,
  footwear: FOOTWEAR_PATTERNS,
  helmet: HELMET_PATTERNS,
  gloves: GLOVE_PATTERNS,
  cloak: CLOAK_PATTERNS,
  orb: [{ label: 'orb', baseType: 'orb' }],
  amulet: [{ label: 'amulet', baseType: 'amulet' }],
  ring: [{ label: 'ring', baseType: 'ring' }],
  gizmo: [{ label: 'gizmo', baseType: 'gizmo' }],
  talisman: TALISMAN_PATTERNS,
} as const

function isEquipped(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('(worn)')
    || lower.includes('(haunted)')
    || lower.includes('(melded)')
    || lower.includes('(installed)')
  )
}

function isCategoryHeading(line: string): boolean {
  return /^[A-Z][A-Za-z &'-]+$/.test(line)
}

function isItemLine(line: string): boolean {
  return /^[a-zA-Z0-9] - /.test(line)
}

function parseEquipmentLines(section: string): EquipmentLine[] {
  const lines: EquipmentLine[] = []
  let currentCategory: string | null = null

  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (isCategoryHeading(line) && !isItemLine(line)) {
      currentCategory = line
      continue
    }

    if (isItemLine(line)) {
      lines.push({
        category: currentCategory,
        text: line,
      })
    }
  }

  return lines
}

function hasAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(line))
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function exactNamePatterns(items: readonly KnownUnrand[]): RegExp[] {
  return items.map((item) => new RegExp(`\\b${escapeRegex(item.name)}\\b`, 'i'))
}

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanItemName(line: string): string {
  let value = normalizeSpacing(
    line
      .replace(/^[a-z0-9] - /i, '')
      .replace(/\s+\((?:worn|haunted|melded|installed)\).*$/i, '')
      .replace(/\s+\{.*$/, ''),
  )

  let changed = true
  while (changed) {
    const nextValue = normalizeSpacing(
      value
        .replace(/^\s*the\s+/i, '')
        .replace(/^\s*an?\s+/i, '')
        .replace(/^\s*cursed\s+/i, '')
        .replace(/^[+-]\d+\s+/, ''),
    )
    changed = nextValue !== value
    value = nextValue
  }

  return value
}

function extractEnchantment(line: string): number | null {
  const normalized = line.replace(/^[a-z0-9] - /i, '')
  const match = normalized.match(/^(?:the\s+)?(?:cursed\s+)?(?:an?\s+)?([+-]\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function extractEquipState(line: string): EquipmentEquipState {
  if (/\(installed\)/i.test(line)) {
    return 'installed'
  }

  if (/\(melded\)/i.test(line)) {
    return 'melded'
  }

  return /\(haunted\)/i.test(line) ? 'haunted' : 'worn'
}

function extractHeaderEquipState(line: string): EquipmentEquipState | null {
  if (!/^[a-z0-9] - /i.test(line)) {
    return null
  }

  if (/\binstalled\b/i.test(line)) {
    return 'installed'
  }

  if (/\bmelded\b/i.test(line)) {
    return 'melded'
  }

  return /\bhaunted\b/i.test(line) ? 'haunted' : 'worn'
}

function isCursed(line: string): boolean {
  return /\bcursed\b/i.test(line)
}

function extractPropertiesText(line: string): string | null {
  return line.match(/\{([^}]*)\}/)?.[1]?.trim() ?? null
}

function isFunctionalInscriptionToken(token: string): boolean {
  return /^@.+$/.test(token)
    || /^![A-Za-z*]+$/.test(token)
    || /^=[gksfR]+$/.test(token)
    || /^\+f+$/.test(token)
}

function extractProperties(propertiesText: string | null): string[] {
  if (!propertiesText) {
    return []
  }

  return propertiesText
    .split(/\s*,\s*/)
    .flatMap((segment) => normalizeSpacing(segment).split(/\s+/))
    .filter((token) => !isFunctionalInscriptionToken(token))
    .filter(Boolean)
}

function extractFunctionalInscriptions(propertiesText: string | null): string[] {
  if (!propertiesText) {
    return []
  }

  return normalizeUnique(
    propertiesText
      .split(/\s*,\s*/)
      .flatMap((segment) => normalizeSpacing(segment).split(/\s+/))
      .filter((token) => isFunctionalInscriptionToken(token))
    .filter(Boolean)
  )
}

function emptyPropertyBag(): EquipmentPropertyBag {
  return {
    numeric: {},
    booleanProps: {},
    opaqueTokens: [],
  }
}

type ClassifiedPropertyTokens = {
  bag: EquipmentPropertyBag
  gizmoEffects: EquipmentGizmoEffect[]
  namedEffects: EquipmentNamedEffect[]
  ashenzariCurses: EquipmentAshenzariCurse[]
}

function normalizeUnique(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (seen.has(value)) {
      continue
    }

    seen.add(value)
    result.push(value)
  }

  return result
}

function normalizePropertyBag(bag: EquipmentPropertyBag): EquipmentPropertyBag {
  const numeric: EquipmentPropertyBag['numeric'] = {}
  const booleanProps: EquipmentPropertyBag['booleanProps'] = {}

  for (const key of NUMERIC_PROPERTY_ORDER) {
    const value = bag.numeric[key]
    if (value === undefined || value === 0) {
      continue
    }

    numeric[key] = value
  }

  for (const key of BOOLEAN_PROPERTY_ORDER) {
    if (!bag.booleanProps[key]) {
      continue
    }

    booleanProps[key] = true
  }

  return {
    numeric,
    booleanProps,
    opaqueTokens: normalizeUnique(bag.opaqueTokens),
  }
}

function addNumericProperty(
  bag: EquipmentPropertyBag,
  key: EquipmentNumericPropertyKey,
  value: number,
): void {
  if (value === 0) {
    return
  }

  bag.numeric[key] = (bag.numeric[key] ?? 0) + value
}

function addFlagProperty(
  bag: EquipmentPropertyBag,
  key: EquipmentBooleanPropertyKey,
): void {
  bag.booleanProps[key] = true
}

function sequenceValue(value: string): number | null {
  if (!/^[+-]+$/.test(value)) {
    return null
  }

  const direction = value[0] === '+' ? 1 : -1
  return direction * value.length
}

function addPropertyTokenToBag(bag: EquipmentPropertyBag, token: string): void {
  const exactFlagKey = BOOLEAN_PROPERTY_KEYS_BY_TOKEN[token]
  if (exactFlagKey) {
    addFlagProperty(bag, exactFlagKey)
    return
  }

  const numericSequenceMatch = token.match(/^(rF|rC|rN|Will|RegenMP|Regen|Stlth)([+-]+)$/)
  if (numericSequenceMatch) {
    const value = sequenceValue(numericSequenceMatch[2])
    if (value !== null) {
      addNumericProperty(bag, NUMERIC_SEQUENCE_KEYS_BY_PREFIX[numericSequenceMatch[1]], value)
      return
    }
  }

  const numericSignedMatch = token.match(/^(Str|Int|Dex|Slay|AC|EV|SH|HP|MP)([+-]\d+)$/)
  if (numericSignedMatch) {
    addNumericProperty(
      bag,
      NUMERIC_SIGNED_KEYS_BY_PREFIX[numericSignedMatch[1]],
      Number.parseInt(numericSignedMatch[2], 10),
    )
    return
  }

  bag.opaqueTokens.push(token)
}

function classifyPropertyTokens(
  slot: EquipmentSlot,
  tokens: readonly string[],
): ClassifiedPropertyTokens {
  const bag = emptyPropertyBag()
  const gizmoEffects: EquipmentGizmoEffect[] = []
  const namedEffects: EquipmentNamedEffect[] = []
  const ashenzariCurses: EquipmentAshenzariCurse[] = []

  for (const token of tokens) {
    if (slot === 'gizmo' && GIZMO_EFFECT_TOKENS.has(token)) {
      gizmoEffects.push(token as EquipmentGizmoEffect)
      continue
    }

    if (slot !== 'gizmo' && NAMED_EFFECT_TOKENS.has(token)) {
      namedEffects.push(token as EquipmentNamedEffect)
      continue
    }

    if (ASHENZARI_CURSE_TOKENS.has(token)) {
      ashenzariCurses.push(token as EquipmentAshenzariCurse)
      continue
    }

    addPropertyTokenToBag(bag, token)
  }

  return {
    bag: normalizePropertyBag(bag),
    gizmoEffects: normalizeUnique(gizmoEffects) as EquipmentGizmoEffect[],
    namedEffects: normalizeUnique(namedEffects) as EquipmentNamedEffect[],
    ashenzariCurses: normalizeUnique(ashenzariCurses) as EquipmentAshenzariCurse[],
  }
}

function bagFromTokens(tokens: readonly string[]): EquipmentPropertyBag {
  const bag = emptyPropertyBag()

  for (const token of tokens) {
    addPropertyTokenToBag(bag, token)
  }

  return normalizePropertyBag(bag)
}

function mergePropertyBags(...bags: readonly EquipmentPropertyBag[]): EquipmentPropertyBag {
  const merged = emptyPropertyBag()

  for (const bag of bags) {
    for (const key of NUMERIC_PROPERTY_ORDER) {
      const value = bag.numeric[key]
      if (value === undefined || value === 0) {
        continue
      }

      addNumericProperty(merged, key, value)
    }

    for (const key of BOOLEAN_PROPERTY_ORDER) {
      if (bag.booleanProps[key]) {
        addFlagProperty(merged, key)
      }
    }

    merged.opaqueTokens.push(...bag.opaqueTokens)
  }

  return normalizePropertyBag(merged)
}

function hasPropertyBagContent(bag: EquipmentPropertyBag): boolean {
  return (
    Object.keys(bag.numeric).length > 0
    || Object.keys(bag.booleanProps).length > 0
    || bag.opaqueTokens.length > 0
  )
}

function overlayPropertyBag(
  base: EquipmentPropertyBag,
  overlay: EquipmentPropertyBag,
): EquipmentPropertyBag {
  const merged = mergePropertyBags(base)

  for (const key of NUMERIC_PROPERTY_ORDER) {
    const value = overlay.numeric[key]
    if (value === undefined) {
      continue
    }

    merged.numeric[key] = value
  }

  for (const key of BOOLEAN_PROPERTY_ORDER) {
    if (overlay.booleanProps[key]) {
      merged.booleanProps[key] = true
    }
  }

  merged.opaqueTokens = normalizeUnique([...merged.opaqueTokens, ...overlay.opaqueTokens])
  return normalizePropertyBag(merged)
}

function subtractPropertyBags(
  minuend: EquipmentPropertyBag,
  subtrahend: EquipmentPropertyBag,
): EquipmentPropertyBag {
  const difference = emptyPropertyBag()

  for (const key of NUMERIC_PROPERTY_ORDER) {
    const value = (minuend.numeric[key] ?? 0) - (subtrahend.numeric[key] ?? 0)
    if (value !== 0) {
      difference.numeric[key] = value
    }
  }

  for (const key of BOOLEAN_PROPERTY_ORDER) {
    if (minuend.booleanProps[key] && !subtrahend.booleanProps[key]) {
      difference.booleanProps[key] = true
    }
  }

  const baseSpecials = new Set(subtrahend.opaqueTokens)
  difference.opaqueTokens = minuend.opaqueTokens.filter((value) => !baseSpecials.has(value))

  return normalizePropertyBag(difference)
}

function getObjectClass(slot: EquipmentSlot): EquipmentObjectClass {
  if (slot === 'amulet' || slot === 'ring') {
    return 'jewellery'
  }

  if (slot === 'gizmo') {
    return 'gizmo'
  }

  if (slot === 'talisman') {
    return 'talisman'
  }

  return 'armour'
}

function normalizeKnownUnrandName(value: string): string {
  return value.toLowerCase().replace(/^pair of /i, '').trim()
}

function findKnownUnrand(slot: EquipmentSlot, rawName: string): KnownUnrand | undefined {
  const normalizedRawName = normalizeKnownUnrandName(rawName)

  return KNOWN_UNRAND_BY_SLOT[slot].find((item) => normalizeKnownUnrandName(item.name) === normalizedRawName)
}

function detectBaseType(slot: EquipmentSlot, rawName: string, knownUnrand?: KnownUnrand): string | null {
  if (knownUnrand?.baseType) {
    return knownUnrand.baseType
  }

  if (slot === 'gizmo') {
    return 'gizmo'
  }

  if (slot === 'talisman') {
    const normalized = normalizeSpacing(rawName.toLowerCase().replace(/"[^"]*"/g, ''))
    const talismanOfMatch = normalized.match(/^talisman of (.+)$/)
    if (talismanOfMatch) {
      return `${talismanOfMatch[1]} talisman`
    }

    const baseMatch = normalized.match(/^([a-z-]+(?: [a-z-]+)* talisman)(?: of .+)?$/)
    return baseMatch?.[1] ?? null
  }

  const normalized = normalizeSpacing(rawName.toLowerCase().replace(/"[^"]*"/g, ''))

  for (const candidate of BASE_PATTERNS_BY_SLOT[slot]) {
    if (
      normalized === candidate.label
      || normalized.startsWith(`${candidate.label} `)
      || normalized.startsWith(`${candidate.label} of `)
    ) {
      return candidate.baseType
    }
  }

  return null
}

function getDisplayBaseName(slot: EquipmentSlot, baseType: string | null): string | null {
  if (!baseType) {
    return null
  }

  switch (slot) {
    case 'footwear':
      return baseType === 'barding' ? 'barding' : 'pair of boots'
    case 'gloves':
      return 'pair of gloves'
    case 'ring':
      return 'ring'
    case 'amulet':
      return 'amulet'
    case 'talisman':
      return baseType
    default:
      return baseType
  }
}

function extractSuffixAfterBase(rawName: string, slot: EquipmentSlot, baseType: string | null): string | null {
  if (!baseType) {
    return null
  }

  const normalized = normalizeSpacing(rawName.replace(/"[^"]*"/g, ''))
  const candidateLabels =
    slot === 'footwear' && baseType === 'boots'
      ? ['pair of boots', 'boots']
      : slot === 'gloves' && baseType === 'gloves'
        ? ['pair of gloves', 'gloves']
        : [getDisplayBaseName(slot, baseType) ?? baseType]

  for (const label of candidateLabels) {
    const match = normalized.match(new RegExp(`^${escapeRegex(label)} of (.+)$`, 'i'))
    if (match) {
      return normalizeSpacing(match[1])
    }
  }

  return null
}

function canonicalArmourEgo(name: string | null): string | null {
  if (!name) {
    return null
  }

  return ARMOUR_EGO_NAME_BY_NORMALIZED.get(name.toLowerCase()) ?? null
}

function inferArmourEgo(rawName: string, slot: EquipmentSlot, baseType: string | null, properties: string[]): string | null {
  const explicit = canonicalArmourEgo(extractSuffixAfterBase(rawName, slot, baseType))
  if (explicit) {
    return explicit
  }

  return ARMOUR_EGO_BY_PROPERTY_SIGNATURE.get(properties.join(' ')) ?? null
}

function isRandartJewellery(slot: EquipmentSlot, rawName: string, line: string): boolean {
  if (/^[a-z0-9] - the /i.test(line)) {
    return true
  }

  if (/".+?"/.test(rawName)) {
    return true
  }

  switch (slot) {
    case 'amulet':
      return /^amulet of (?:the )?[A-Z]/.test(rawName) || /necklace/i.test(rawName)
    case 'ring':
      return /^ring of (?:the )?[A-Z]/.test(rawName)
    default:
      return false
  }
}

function isRandartTalisman(rawName: string, line: string, baseType: string | null): boolean {
  if (/^[a-z0-9] - the /i.test(line)) {
    return true
  }

  if (/".+?"/.test(rawName)) {
    return true
  }

  const normalized = rawName.toLowerCase()
  if (normalized.startsWith('talisman of ')) {
    return false
  }

  return Boolean(baseType && normalized.startsWith(`${baseType} of `))
}

function isRandartArmour(rawName: string, line: string, slot: EquipmentSlot, baseType: string | null): boolean {
  if (/^[a-z0-9] - the /i.test(line)) {
    return true
  }

  if (/".+?"/.test(rawName)) {
    return true
  }

  const suffix = extractSuffixAfterBase(rawName, slot, baseType)
  return Boolean(suffix && !canonicalArmourEgo(suffix))
}

function getArtifactKind(
  slot: EquipmentSlot,
  rawName: string,
  line: string,
  objectClass: EquipmentObjectClass,
  baseType: string | null,
): ArtifactKind {
  if (findKnownUnrand(slot, rawName)) {
    return 'unrand'
  }

  if (slot === 'gizmo') {
    return 'randart'
  }

  if (objectClass === 'jewellery') {
    return isRandartJewellery(slot, rawName, line) ? 'randart' : 'normal'
  }

  if (objectClass === 'talisman') {
    return isRandartTalisman(rawName, line, baseType) ? 'randart' : 'normal'
  }

  return isRandartArmour(rawName, line, slot, baseType) ? 'randart' : 'normal'
}

function inferSubtypeEffect(slot: EquipmentSlot, rawName: string, artifactKind: ArtifactKind): string | null {
  if (artifactKind !== 'normal') {
    return null
  }

  if (slot === 'ring') {
    return rawName.match(/^ring of (.+)$/i)?.[1]?.toLowerCase() ?? null
  }

  if (slot === 'amulet') {
    return rawName.match(/^amulet of (.+)$/i)?.[1]?.toLowerCase() ?? null
  }

  if (slot === 'talisman' && rawName.match(/^talisman of (.+)$/i)) {
    return rawName.match(/^talisman of (.+)$/i)?.[1]?.toLowerCase() ?? null
  }

  return null
}

function formatScalarProperty(prefix: string, value: number | null): string[] {
  if (value === null || value === 0) {
    return []
  }

  const sign = value > 0 ? `+${value}` : `${value}`
  return [`${prefix}${sign}`]
}

function inferJewelleryIntrinsicProperties(subtypeEffect: string | null, enchant: number | null): string[] {
  if (!subtypeEffect) {
    return []
  }

  if (subtypeEffect in SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT) {
    return formatScalarProperty(SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT[subtypeEffect], enchant)
  }

  return FIXED_JEWELLERY_PROPERTIES_BY_EFFECT[subtypeEffect] ?? []
}

function inferIntrinsicProperties(
  objectClass: EquipmentObjectClass,
  baseType: string | null,
  subtypeEffect: string | null,
  enchant: number | null,
): string[] {
  if (objectClass === 'jewellery') {
    return inferJewelleryIntrinsicProperties(subtypeEffect, enchant)
  }

  if (objectClass === 'gizmo') {
    return []
  }

  if (!baseType) {
    return []
  }

  return INTRINSIC_PROPERTIES_BY_ARMOUR_BASE_TYPE[baseType] ?? []
}

function inferDisplayProperties(
  extractedPropertyBag: EquipmentPropertyBag,
  intrinsicProperties: EquipmentPropertyBag,
  egoProperties: EquipmentPropertyBag,
): EquipmentPropertyBag {
  const baseProperties = mergePropertyBags(intrinsicProperties, egoProperties)

  if (!hasPropertyBagContent(extractedPropertyBag)) {
    return baseProperties
  }

  return overlayPropertyBag(baseProperties, extractedPropertyBag)
}

function getDisplayName(
  slot: EquipmentSlot,
  rawName: string,
  artifactKind: ArtifactKind,
  baseType: string | null,
  ego: string | null,
  subtypeEffect: string | null,
): string {
  const knownUnrand = findKnownUnrand(slot, rawName)
  if (knownUnrand) {
    return knownUnrand.name
  }

  if (slot === 'amulet' && artifactKind === 'randart') {
    return 'randart amulet'
  }

  if (slot === 'ring' && artifactKind === 'randart') {
    return 'randart ring'
  }

  if (slot === 'orb' && artifactKind === 'randart') {
    return 'randart orb'
  }

  if (artifactKind === 'randart') {
    if (slot === 'bodyArmour' || slot === 'shield' || slot === 'orb') {
      return baseType ?? rawName
    }

    return rawName
  }

  if (artifactKind === 'normal' && ego && getObjectClass(slot) === 'armour') {
    const displayBase = getDisplayBaseName(slot, baseType)
    return displayBase ? `${displayBase} of ${ego}` : rawName
  }

  if (artifactKind === 'normal' && subtypeEffect) {
    const displayBase = getDisplayBaseName(slot, baseType)
    if (slot === 'talisman') {
      return `talisman of ${subtypeEffect}`
    }

    return displayBase ? `${displayBase} of ${subtypeEffect}` : rawName
  }

  if (slot === 'bodyArmour' || slot === 'shield' || slot === 'talisman') {
    return baseType ?? rawName
  }

  return rawName
}

function buildEquipmentItem(slot: EquipmentSlot, line: string | undefined): EquipmentItemSnapshot | undefined {
  if (!line) {
    return undefined
  }

  const rawName = cleanItemName(line)
  const propertiesText = extractPropertiesText(line)
  const extractedProperties = extractProperties(propertiesText)
  const extractedPropertyInfo = classifyPropertyTokens(slot, extractedProperties)
  const functionalInscriptions = extractFunctionalInscriptions(propertiesText)
  const objectClass = getObjectClass(slot)
  const equipState = extractEquipState(line)
  const cursed = isCursed(line)
  const knownUnrand = findKnownUnrand(slot, rawName)
  const baseType = detectBaseType(slot, rawName, knownUnrand)
  const enchant = extractEnchantment(line)
  const artifactKind = getArtifactKind(slot, rawName, line, objectClass, baseType)
  const subtypeEffect = inferSubtypeEffect(slot, rawName, artifactKind)
  const ego =
    objectClass === 'armour' && artifactKind === 'normal'
      ? inferArmourEgo(rawName, slot, baseType, extractedProperties)
      : null
  const intrinsicProperties = bagFromTokens(
    inferIntrinsicProperties(objectClass, baseType, subtypeEffect, enchant),
  )
  const egoProperties = bagFromTokens(
    artifactKind === 'normal' && ego ? ARMOUR_EGO_PROPERTIES_BY_NAME[ego] ?? [] : [],
  )
  const properties = inferDisplayProperties(
    extractedPropertyInfo.bag,
    intrinsicProperties,
    egoProperties,
  )
  const artifactProperties =
    artifactKind === 'normal'
      ? emptyPropertyBag()
      : subtractPropertyBags(properties, mergePropertyBags(intrinsicProperties, egoProperties))

  return {
    rawName,
    displayName: getDisplayName(slot, rawName, artifactKind, baseType, ego, subtypeEffect),
    objectClass,
    equipState,
    isCursed: cursed,
    baseType,
    enchant,
    artifactKind,
    ego,
    subtypeEffect,
    ...(extractedPropertyInfo.gizmoEffects.length > 0
      ? { gizmoEffects: extractedPropertyInfo.gizmoEffects }
      : {}),
    ...(extractedPropertyInfo.namedEffects.length > 0
      ? { namedEffects: extractedPropertyInfo.namedEffects }
      : {}),
    ...(extractedPropertyInfo.ashenzariCurses.length > 0
      ? { ashenzariCurses: extractedPropertyInfo.ashenzariCurses }
      : {}),
    propertiesText,
    ...(functionalInscriptions.length > 0 ? { functionalInscriptions } : {}),
    properties,
    intrinsicProperties,
    egoProperties,
    artifactProperties,
  }
}

function cleanHeaderItemName(line: string): string {
  return cleanItemName(line.replace(/^([a-z0-9] - )(?:(?:melded|haunted)\s+)/i, '$1'))
}

function extractHeaderEquipStates(text: string): Map<string, EquipmentEquipState> {
  const header = splitSections(text).header
  const lines = header.split('\n')
  const statsStart = lines.findIndex((line) => /^(?:Health|HP):/.test(line))

  if (statsStart === -1) {
    return new Map()
  }

  const states = new Map<string, EquipmentEquipState>()

  for (let index = statsStart + 3; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      if (states.size > 0) {
        break
      }
      continue
    }

    if (/^(?:%:|@:|A:|a:|0:|}:)/.test(trimmed)) {
      break
    }

    const itemText = line.split(/\s{2,}/).at(-1)?.trim() ?? ''
    const state = extractHeaderEquipState(itemText)

    if (!state) {
      continue
    }

    states.set(cleanHeaderItemName(itemText), state)
  }

  return states
}

function buildEquipmentItemWithHeaderState(
  slot: EquipmentSlot,
  line: string | undefined,
  headerEquipStates: ReadonlyMap<string, EquipmentEquipState>,
): EquipmentItemSnapshot | undefined {
  const item = buildEquipmentItem(slot, line)

  if (!item) {
    return undefined
  }

  const headerState = headerEquipStates.get(item.rawName)

  if (!headerState || headerState === 'worn') {
    return item
  }

  return {
    ...item,
    equipState: headerState,
  }
}

export function extractEquipment(text: string): EquipmentSnapshot {
  const section = splitSections(text).equipment
  const headerEquipStates = extractHeaderEquipStates(text)
  const lines = parseEquipmentLines(section)
  const equippedLines = lines.filter((line) => isEquipped(line.text))
  const armourLines = equippedLines
    .filter((line) => line.category === null || line.category === 'Armour')
    .map((line) => line.text)
  const jewelleryLines = equippedLines
    .filter((line) => line.category === 'Jewellery')
    .map((line) => line.text)
  const talismanLines = equippedLines
    .filter((line) => line.category === 'Talismans')
    .map((line) => line.text)
  const gizmoLines = equippedLines
    .filter((line) => line.category === 'Gizmo')
    .map((line) => line.text)

  const headPatterns = [
    /\bhat\b/i,
    /\bhelmet\b/i,
    /\bcap\b/i,
    /\bhood\b/i,
    ...exactNamePatterns(UNRAND_HEAD_ITEMS),
  ]
  const glovesPatterns = [/\bgloves\b/i, /\bgauntlets\b/i, ...exactNamePatterns(UNRAND_GLOVE_ITEMS)]
  const bootsPatterns = [/\bboots\b/i, /\bbarding\b/i]
  const cloakPatterns = [/\bcloak\b/i, /\bscarf\b/i, ...exactNamePatterns(UNRAND_CLOAK_ITEMS)]
  const shieldPatterns = [
    ...SHIELD_LABELS.map((label) => new RegExp(`\\b${label}\\b`, 'i')),
    ...exactNamePatterns(UNRAND_SHIELD_ITEMS),
  ]
  const orbPatterns = [/\borb\b/i, ...exactNamePatterns(UNRAND_ORB_ITEMS)]
  const amuletPatterns = [/\bamulet\b/i, /\bnecklace\b/i, /\bpendant\b/i, /\bbrooch\b/i]
  const ringPatterns = [/\bring\b/i]
  const nonBodyPatterns = [
    ...headPatterns,
    ...glovesPatterns,
    ...bootsPatterns,
    ...cloakPatterns,
    ...shieldPatterns,
    ...orbPatterns,
  ]

  const shieldLine = armourLines.find((line) => hasAny(line, shieldPatterns))
  const footwearLines = armourLines.filter((line) => hasAny(line, bootsPatterns))
  const helmetLines = armourLines.filter((line) => hasAny(line, headPatterns))
  const glovesLines = armourLines.filter((line) => hasAny(line, glovesPatterns))
  const cloakLines = armourLines.filter((line) => hasAny(line, cloakPatterns))
  const orbLine = armourLines.find((line) => hasAny(line, orbPatterns))
  const bodyArmourLine = armourLines.find((line) => !hasAny(line, nonBodyPatterns))
  const amuletLines = jewelleryLines.filter((line) => hasAny(line, amuletPatterns))
  const ringLines = jewelleryLines.filter((line) => hasAny(line, ringPatterns))
  const gizmoLine = gizmoLines[0]
  const talismanLine = talismanLines[0]

  const bodyArmourDetails = buildEquipmentItemWithHeaderState(
    'bodyArmour',
    bodyArmourLine,
    headerEquipStates,
  )
  const shieldDetails = buildEquipmentItemWithHeaderState('shield', shieldLine, headerEquipStates)
  const footwearDetails = footwearLines
    .map((line) => buildEquipmentItemWithHeaderState('footwear', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const helmetDetails = helmetLines
    .map((line) => buildEquipmentItemWithHeaderState('helmet', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const glovesDetails = glovesLines
    .map((line) => buildEquipmentItemWithHeaderState('gloves', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const cloakDetails = cloakLines
    .map((line) => buildEquipmentItemWithHeaderState('cloak', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const orbDetails = buildEquipmentItemWithHeaderState('orb', orbLine, headerEquipStates)
  const amuletDetailsList = amuletLines
    .map((line) => buildEquipmentItemWithHeaderState('amulet', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const ringDetails = ringLines
    .map((line) => buildEquipmentItemWithHeaderState('ring', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const gizmoDetails = buildEquipmentItemWithHeaderState('gizmo', gizmoLine, headerEquipStates)
  const talismanDetails = buildEquipmentItemWithHeaderState(
    'talisman',
    talismanLine,
    headerEquipStates,
  )

  return {
    bodyArmour: bodyArmourDetails?.rawName ?? 'none',
    shield: shieldDetails?.rawName ?? 'none',
    helmets: helmetDetails.map((item) => item.rawName),
    gloves: glovesDetails.map((item) => item.rawName),
    footwear: footwearDetails.map((item) => item.rawName),
    cloaks: cloakDetails.map((item) => item.rawName),
    orb: orbDetails?.rawName ?? 'none',
    amulets: amuletDetailsList.map((item) => item.rawName),
    rings: ringDetails.map((ring) => ring.rawName),
    gizmo: gizmoDetails?.rawName ?? 'none',
    talisman: talismanDetails?.rawName ?? 'none',
    bodyArmourDetails,
    shieldDetails,
    helmetDetails: helmetDetails.length > 0 ? helmetDetails : undefined,
    glovesDetails: glovesDetails.length > 0 ? glovesDetails : undefined,
    footwearDetails: footwearDetails.length > 0 ? footwearDetails : undefined,
    cloakDetails: cloakDetails.length > 0 ? cloakDetails : undefined,
    orbDetails,
    amuletDetails: amuletDetailsList.length > 0 ? amuletDetailsList : undefined,
    ringDetails: ringDetails.length > 0 ? ringDetails : undefined,
    gizmoDetails,
    talismanDetails,
  }
}

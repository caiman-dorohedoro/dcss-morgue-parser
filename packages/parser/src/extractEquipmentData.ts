import type {
  EquipmentAshenzariCurse,
  EquipmentBooleanPropertyKey,
  EquipmentGizmoEffect,
  EquipmentNamedEffect,
  EquipmentNumericPropertyKey,
} from './types'

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

export const SHIELD_LABELS = ['tower shield', 'kite shield', 'buckler'] as const
const HELMET_LABELS = ['helmet', 'hat', 'hood', 'crown', 'mask', 'cap'] as const
const CLOAK_LABELS = ['cloak', 'scarf'] as const

export type EquipmentSlot =
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

export type KnownUnrand = {
  name: string
  baseType?: string
}

const UNRAND_BODY_ARMOUR_ITEMS = [
  { name: 'faerie dragon scales', baseType: 'acid dragon scales' },
  { name: 'robe of Augmentation', baseType: 'robe' },
  { name: "Lear's hauberk", baseType: 'chain mail' },
  { name: 'skin of Zhor', baseType: 'animal skin' },
  { name: 'salamander hide armour', baseType: 'leather armour' },
  { name: 'robe of Misfortune', baseType: 'robe' },
  { name: 'robe of Folly', baseType: 'robe' },
  { name: "Maxwell's patent armour", baseType: 'plate armour' },
  { name: 'robe of Night', baseType: 'robe' },
  { name: 'scales of the Dragon King', baseType: 'golden dragon scales' },
  { name: 'robe of Clouds', baseType: 'robe' },
  { name: 'moon troll leather armour', baseType: 'troll leather armour' },
  { name: 'orange crystal plate armour', baseType: 'crystal plate armour' },
  { name: 'robe of Vines', baseType: 'robe' },
  { name: "Kryia's mail coat", baseType: 'scale mail' },
  { name: 'armour of Talos', baseType: 'plate armour' },
  { name: "Cigotuvi's embrace", baseType: 'leather armour' },
  { name: 'toga "Victory"', baseType: 'robe' },
  { name: "swamp witch's dragon scales", baseType: 'swamp dragon scales' },
  { name: "justicar's regalia", baseType: 'scale mail' },
] as const satisfies readonly KnownUnrand[]

export const UNRAND_SHIELD_ITEMS = [
  { name: 'tower shield of Ignorance', baseType: 'tower shield' },
  { name: 'shield "Bullseye"', baseType: 'tower shield' },
  { name: 'tower shield "Bullseye"', baseType: 'tower shield' },
  { name: 'shield of Resistance', baseType: 'kite shield' },
  { name: 'shield of the Gong', baseType: 'kite shield' },
  { name: "Storm Queen's Shield", baseType: 'kite shield' },
  { name: "warlock's mirror", baseType: 'buckler' },
] as const satisfies readonly KnownUnrand[]

const UNRAND_FOOTWEAR_ITEMS = [
  { name: "Black Knight's barding", baseType: 'barding' },
  { name: 'lightning scales', baseType: 'barding' },
  { name: 'boots of the spider', baseType: 'boots' },
  { name: 'seven-league boots', baseType: 'boots' },
  { name: 'mountain boots', baseType: 'boots' },
  { name: 'slick slippers', baseType: 'boots' },
] as const satisfies readonly KnownUnrand[]

export const UNRAND_HEAD_ITEMS = [
  { name: 'hat of the Bear Spirit', baseType: 'hat' },
  { name: 'hat of the Alchemist', baseType: 'hat' },
  { name: 'hat of Pondering', baseType: 'hat' },
  { name: 'hat of the High Council', baseType: 'hat' },
  { name: 'crown of Dyrovepreva', baseType: 'hat' },
  { name: 'hood of the Assassin', baseType: 'hat' },
  { name: 'helm of the ram' },
  { name: "Maxwell's etheric cage", baseType: 'helmet' },
  { name: 'crown of Eternal Torment', baseType: 'hat' },
  { name: 'Mask of the Dragon', baseType: 'hat' },
  { name: 'Mask of the Thief', baseType: 'mask' },
  { name: 'shining eye crown', baseType: 'crown' },
  { name: 'crown of vainglory', baseType: 'hat' },
] as const satisfies readonly KnownUnrand[]

export const UNRAND_GLOVE_ITEMS = [
  { name: "Delatra's gloves", baseType: 'gloves' },
  { name: "fencer's gloves", baseType: 'gloves' },
  { name: 'gauntlets of War', baseType: 'gloves' },
  { name: 'gloves of the gadgeteer', baseType: 'gloves' },
  { name: "Mad Mage's Maulers", baseType: 'gloves' },
] as const satisfies readonly KnownUnrand[]

export const UNRAND_CLOAK_ITEMS = [
  { name: 'cloak of Starlight', baseType: 'cloak' },
  { name: 'cloak of Flash', baseType: 'cloak' },
  { name: 'cloak of the Thief', baseType: 'cloak' },
  { name: 'dragonskin cloak', baseType: 'cloak' },
  { name: 'ratskin cloak', baseType: 'cloak' },
  { name: 'fungal fisticloak', baseType: 'cloak' },
  { name: 'scarf of invisibility', baseType: 'scarf' },
] as const satisfies readonly KnownUnrand[]

export const UNRAND_ORB_ITEMS = [
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

export const KNOWN_UNRAND_BY_SLOT: Record<EquipmentSlot, readonly KnownUnrand[]> = {
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

export const ARMOUR_EGO_PROPERTIES_BY_NAME: Record<string, string[]> = {
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

export const ARMOUR_EGO_NAME_BY_NORMALIZED = new Map(
  Object.keys(ARMOUR_EGO_PROPERTIES_BY_NAME).map((ego) => [ego.toLowerCase(), ego]),
)

export const ARMOUR_EGO_BY_PROPERTY_SIGNATURE = new Map(
  Object.entries(ARMOUR_EGO_PROPERTIES_BY_NAME).map(([ego, properties]) => [
    properties.join(' '),
    ego,
  ]),
)

export const INTRINSIC_PROPERTIES_BY_ARMOUR_BASE_TYPE: Record<string, string[]> = {
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

export const FIXED_JEWELLERY_PROPERTIES_BY_EFFECT: Record<string, string[]> = {
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

export const NUMERIC_PROPERTY_ORDER = [
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

export const BOOLEAN_PROPERTY_ORDER = [
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

export const NUMERIC_SEQUENCE_KEYS_BY_PREFIX: Record<string, EquipmentNumericPropertyKey> = {
  rF: 'rF',
  rC: 'rC',
  rN: 'rN',
  Will: 'Will',
  Regen: 'Regen',
  RegenMP: 'RegenMP',
  Stlth: 'Stlth',
}

export const NUMERIC_SIGNED_KEYS_BY_PREFIX: Record<string, EquipmentNumericPropertyKey> = {
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

export const BOOLEAN_PROPERTY_KEYS_BY_TOKEN: Record<string, EquipmentBooleanPropertyKey> = {
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

export const GIZMO_EFFECT_TOKENS = new Set<string>(GIZMO_EFFECT_ORDER)

const NAMED_EFFECT_ORDER = [
  ...GIZMO_EFFECT_ORDER,
  'Dragonpray',
  'Riposte',
  'Wandboost',
] as const satisfies readonly EquipmentNamedEffect[]

export const NAMED_EFFECT_TOKENS = new Set<string>(NAMED_EFFECT_ORDER)

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

export const ASHENZARI_CURSE_TOKENS = new Set<string>(ASHENZARI_CURSE_ORDER)

export const SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT: Record<string, string> = {
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

export const BASE_PATTERNS_BY_SLOT = {
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
} as const satisfies Record<EquipmentSlot, readonly { label: string; baseType: string }[]>

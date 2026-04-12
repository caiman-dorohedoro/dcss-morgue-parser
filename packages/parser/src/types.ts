export type MorgueVersion = string

export type BaseStatsSnapshot = {
  playerName: string | null
  version: MorgueVersion
  species: string
  speciesVariant: string | null
  background: string | null
  god: string | null
  godPietyDisplay: string | null
  godPietyRank: number | null
  godOstracismPips: number
  godStatus: string | null
  godUnderPenance: boolean
  xl: number
  ac: number
  ev: number
  sh: number
  strength: number
  intelligence: number
  dexterity: number
}

export type GodHistoryEvent = {
  type: 'join' | 'abandon' | 'penance' | 'forgiven' | 'gift' | 'piety_rank'
  turn: number
  place: string
  god: string
  pietyRank?: number
}

export type ArtifactKind = 'normal' | 'randart' | 'unrand'
export type EquipmentObjectClass = 'armour' | 'jewellery' | 'talisman' | 'gizmo'
export type EquipmentEquipState = 'worn' | 'haunted' | 'melded' | 'installed'
export type EquipmentGizmoEffect = 'SpellMotor' | 'Gadgeteer' | 'RevGuard' | 'AutoDazzle'
export type EquipmentNamedEffect =
  | EquipmentGizmoEffect
  | 'Dragonpray'
  | 'Riposte'
  | 'Wandboost'
export type EquipmentAshenzariCurse =
  | 'Melee'
  | 'Range'
  | 'Elem'
  | 'Sorc'
  | 'Comp'
  | 'Bglg'
  | 'Self'
  | 'Fort'
  | 'Cun'
  | 'Dev'

export type EquipmentNumericPropertyKey =
  | 'rF'
  | 'rC'
  | 'rN'
  | 'Will'
  | 'Str'
  | 'Int'
  | 'Dex'
  | 'Slay'
  | 'AC'
  | 'EV'
  | 'SH'
  | 'HP'
  | 'MP'
  | 'Regen'
  | 'RegenMP'
  | 'Stlth'

export type EquipmentBooleanPropertyKey =
  | 'rPois'
  | 'rElec'
  | 'rCorr'
  | 'rMut'
  | 'SInv'
  | 'Fly'
  | 'Reflect'
  | 'Clar'
  | 'RMsl'
  | 'Faith'
  | 'Spirit'
  | 'Wiz'
  | 'Acrobat'
  | 'Rampage'
  | 'Harm'
  | 'Shadows'
  | 'Repulsion'
  | 'Archmagi'
  | 'Light'
  | 'Mayhem'
  | 'Guile'
  | 'Energy'
  | 'Air'
  | 'Fire'
  | 'Ice'
  | 'Earth'
  | 'Wildshape'
  | 'Chemistry'
  | 'Dissipate'
  | 'Attunement'
  | 'Mesmerism'
  | 'Stardust'
  | 'Hurl'
  | 'Snipe'
  | 'Bear'
  | 'Archery'
  | 'Command'
  | 'Death'
  | 'Resonance'
  | 'Parrying'
  | 'Glass'
  | 'Pyromania'
  | 'Ponderous'
  | 'Inv'
  | '-Cast'
  | 'Bane'
  | '*Rage'
  | '^Drain'
  | '*Corrode'
  | '^Contam'

export type EquipmentPropertyBag = {
  numeric: Partial<Record<EquipmentNumericPropertyKey, number>>
  booleanProps: Partial<Record<EquipmentBooleanPropertyKey, true>>
  opaqueTokens: string[]
}

export type EquipmentItemSnapshot = {
  rawName: string
  displayName: string
  objectClass: EquipmentObjectClass
  equipState: EquipmentEquipState
  isCursed: boolean
  baseType: string | null
  enchant: number | null
  artifactKind: ArtifactKind
  ego: string | null
  subtypeEffect: string | null
  gizmoEffects?: EquipmentGizmoEffect[]
  namedEffects?: EquipmentNamedEffect[]
  ashenzariCurses?: EquipmentAshenzariCurse[]
  propertiesText: string | null
  functionalInscriptions?: string[]
  properties: EquipmentPropertyBag
  intrinsicProperties: EquipmentPropertyBag
  egoProperties: EquipmentPropertyBag
  artifactProperties: EquipmentPropertyBag
}

export type EquipmentSnapshot = {
  bodyArmour: string | undefined
  shield: string | undefined
  helmets: string[]
  gloves: string[]
  footwear: string[]
  cloaks: string[]
  orb: string | undefined
  amulets: string[]
  rings: string[]
  gizmo?: string
  talisman: string | undefined
  bodyArmourDetails?: EquipmentItemSnapshot
  shieldDetails?: EquipmentItemSnapshot
  helmetDetails?: EquipmentItemSnapshot[]
  glovesDetails?: EquipmentItemSnapshot[]
  footwearDetails?: EquipmentItemSnapshot[]
  cloakDetails?: EquipmentItemSnapshot[]
  orbDetails?: EquipmentItemSnapshot
  amuletDetails?: EquipmentItemSnapshot[]
  ringDetails?: EquipmentItemSnapshot[]
  gizmoDetails?: EquipmentItemSnapshot
  talismanDetails?: EquipmentItemSnapshot
}

export type SkillLevelsSnapshot = {
  fighting: number
  macesFlails: number
  axes: number
  polearms: number
  staves: number
  unarmedCombat: number
  throwing: number
  shortBlades: number
  longBlades: number
  rangedWeapons: number
  armour: number
  dodging: number
  shields: number
  stealth: number
  spellcasting: number
  conjurations: number
  hexes: number
  summonings: number
  necromancy: number
  forgecraft: number
  translocations: number
  transmutations: number
  alchemy: number
  fireMagic: number
  iceMagic: number
  airMagic: number
  earthMagic: number
  poisonMagic: number
  invocations: number
  evocations: number
  shapeshifting: number
}

export type SkillsSnapshot = {
  skills: SkillLevelsSnapshot
  effectiveSkills: SkillLevelsSnapshot
}

export type SpellSnapshot = {
  name: string
  failurePercent: number | null
  castable: boolean
  memorized: boolean
}

export type MutationEntrySnapshot = {
  name: string
  level: number | null
  suppressed?: true
  transient?: true
}

export type MutationSnapshot = {
  mutations: MutationEntrySnapshot[]
}

export type FormSnapshot = {
  form: string | null
}

export type ParsedMorgueTextRecord = BaseStatsSnapshot & {
  bodyArmour: string
  shield: string
  helmets: string[]
  gloves: string[]
  footwear: string[]
  cloaks: string[]
  orb: string
  amulets: string[]
  rings: string[]
  gizmo?: string
  talisman: string
  form: string | null
  bodyArmourDetails?: EquipmentItemSnapshot
  shieldDetails?: EquipmentItemSnapshot
  helmetDetails?: EquipmentItemSnapshot[]
  glovesDetails?: EquipmentItemSnapshot[]
  footwearDetails?: EquipmentItemSnapshot[]
  cloakDetails?: EquipmentItemSnapshot[]
  orbDetails?: EquipmentItemSnapshot
  amuletDetails?: EquipmentItemSnapshot[]
  ringDetails?: EquipmentItemSnapshot[]
  gizmoDetails?: EquipmentItemSnapshot
  talismanDetails?: EquipmentItemSnapshot
  skills: SkillLevelsSnapshot
  effectiveSkills: SkillLevelsSnapshot
  spells: SpellSnapshot[]
  mutations: MutationEntrySnapshot[]
  godHistory: GodHistoryEvent[]
}

export type ParseFailureRecord = {
  reason: string
  detail: string | null
}

export type ParseMorgueTextOptions = {
  speciesNames?: readonly string[]
  canonicalSpellNames?: readonly string[]
}

export type ParseMorgueTextResult =
  | {
      ok: true
      record: ParsedMorgueTextRecord
    }
  | {
      ok: false
      failure: ParseFailureRecord
    }

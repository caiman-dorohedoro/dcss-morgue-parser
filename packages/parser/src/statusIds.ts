export const KNOWN_STATUS_IDS = {
  acrobatic: 'acrobatic',
  corrosion: 'corrosion',
  ephemeralShield: 'ephemeral_shield',
  fieryArmour: 'fiery_armour',
  icyArmour: 'icy_armour',
  icemailDepleted: 'icemail_depleted',
  parrying: 'parrying',
  protectedFromPhysicalDamage: 'protected_from_physical_damage',
  sanguineArmoured: 'sanguine_armoured',
  trickster: 'trickster',
  vertigo: 'vertigo',
} as const

export type KnownStatusId = (typeof KNOWN_STATUS_IDS)[keyof typeof KNOWN_STATUS_IDS]

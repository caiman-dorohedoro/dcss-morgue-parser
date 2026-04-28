export const KNOWN_STATUS_IDS = {
  ephemeralShield: 'ephemeral_shield',
  icyArmour: 'icy_armour',
  icemailDepleted: 'icemail_depleted',
  vertigo: 'vertigo',
} as const

export type KnownStatusId = (typeof KNOWN_STATUS_IDS)[keyof typeof KNOWN_STATUS_IDS]

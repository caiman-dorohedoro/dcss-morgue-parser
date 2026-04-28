export const KNOWN_MUTATION_TRAIT_IDS = {
  condensationShield: 'condensation_shield',
  deformedBody: 'deformed_body',
  disruptedMagic: 'disrupted_magic',
  ephemeralShield: 'ephemeral_shield',
  evasiveFlight: 'evasive_flight',
  icemail: 'icemail',
  reckless: 'reckless',
  repulsionField: 'repulsion_field',
} as const

export type KnownMutationTraitId =
  (typeof KNOWN_MUTATION_TRAIT_IDS)[keyof typeof KNOWN_MUTATION_TRAIT_IDS]

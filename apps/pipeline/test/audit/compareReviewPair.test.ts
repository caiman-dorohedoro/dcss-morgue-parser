import { describe, expect, it } from 'vitest'
import {
  compareReviewPair,
  extractInventoryEquippedNames,
} from '../../src/audit/compareReviewPair'
import type { ParsedMorgueTextRecord } from '../../../../packages/parser/src/types'

function buildRecord(
  input: Partial<
    Pick<
      ParsedMorgueTextRecord,
      | 'species'
      | 'speciesVariant'
      | 'background'
      | 'bodyArmour'
      | 'shield'
      | 'helmets'
      | 'gloves'
      | 'footwear'
      | 'cloaks'
      | 'orb'
      | 'amulet'
      | 'rings'
      | 'talisman'
    >
  >,
): ParsedMorgueTextRecord {
  return {
    playerName: 'test-player',
    version: '0.34.1',
    species: input.species ?? 'Minotaur',
    speciesVariant: input.speciesVariant ?? null,
    background: input.background ?? 'Fighter',
    god: null,
    xl: 1,
    ac: 0,
    ev: 0,
    sh: 0,
    strength: 10,
    intelligence: 10,
    dexterity: 10,
    bodyArmour: input.bodyArmour ?? 'none',
    shield: input.shield ?? 'none',
    helmets: input.helmets ?? [],
    gloves: input.gloves ?? [],
    footwear: input.footwear ?? [],
    cloaks: input.cloaks ?? [],
    orb: input.orb ?? 'none',
    amulet: input.amulet ?? 'none',
    rings: input.rings ?? [],
    talisman: input.talisman ?? 'none',
    form: null,
    skills: {
      fighting: 0,
      macesFlails: 0,
      axes: 0,
      polearms: 0,
      staves: 0,
      unarmedCombat: 0,
      throwing: 0,
      shortBlades: 0,
      longBlades: 0,
      rangedWeapons: 0,
      armour: 0,
      dodging: 0,
      shields: 0,
      stealth: 0,
      spellcasting: 0,
      conjurations: 0,
      hexes: 0,
      summonings: 0,
      necromancy: 0,
      forgecraft: 0,
      translocations: 0,
      transmutations: 0,
      alchemy: 0,
      fireMagic: 0,
      iceMagic: 0,
      airMagic: 0,
      earthMagic: 0,
      poisonMagic: 0,
      invocations: 0,
      evocations: 0,
      shapeshifting: 0,
    },
    effectiveSkills: {
      fighting: 0,
      macesFlails: 0,
      axes: 0,
      polearms: 0,
      staves: 0,
      unarmedCombat: 0,
      throwing: 0,
      shortBlades: 0,
      longBlades: 0,
      rangedWeapons: 0,
      armour: 0,
      dodging: 0,
      shields: 0,
      stealth: 0,
      spellcasting: 0,
      conjurations: 0,
      hexes: 0,
      summonings: 0,
      necromancy: 0,
      forgecraft: 0,
      translocations: 0,
      transmutations: 0,
      alchemy: 0,
      fireMagic: 0,
      iceMagic: 0,
      airMagic: 0,
      earthMagic: 0,
      poisonMagic: 0,
      invocations: 0,
      evocations: 0,
      shapeshifting: 0,
    },
    spells: [],
    mutations: [],
  }
}

describe('compareReviewPair', () => {
  it('ignores compact role abbreviations while still checking equipped items', () => {
    const rawText = `Hungry0364 the Slayer (MiFi)     Turns: 33606, Time: 01:00:00

Inventory:

Jewellery: V - the amulet of Harheavo (worn) {Reflect Harm rPois SH+5}
`

    const result = compareReviewPair(
      rawText,
      buildRecord({
        species: 'Minotaur',
        background: 'Fighter',
        amulet: 'amulet of Harheavo',
      }),
    )

    expect(result.mismatches).toEqual([])
  })

  it('extracts equipped items from alias-prefixed inventory lines', () => {
    const rawText = `Inventory:

Jewellery: v - the ring of Aclaor (worn) {rF+ rC+ Dex+3}
I - a ring of flight: L - the ring of Wuunnoje (worn) {rF+ rN+ Int+3 Dex+2}
J - a granite talisman: K - the serpent talisman of the Land of Plenty (worn) {rF+ rN+ Int-4 Dex+6}
`

    expect(extractInventoryEquippedNames(rawText)).toEqual([
      'ring of Aclaor',
      'ring of Wuunnoje',
      'serpent talisman of the Land of Plenty',
    ])
  })

  it('flags true expanded-role mismatches', () => {
    const rawText = `RichardAlsept the Sneak (Octopode Shapeshifter)     Turns: 1219, Time: 00:02:08

Inventory:

Talismans
 a - a quill talisman (worn)
`

    const result = compareReviewPair(
      rawText,
      buildRecord({
        species: 'Barachi',
        background: 'Fighter',
        talisman: 'quill talisman',
      }),
    )

    expect(result.mismatches).toContain('role mismatch: raw=Octopode Shapeshifter parsed=Barachi Fighter')
  })
})

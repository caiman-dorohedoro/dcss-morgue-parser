import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { KNOWN_MUTATION_TRAIT_IDS, extractMutations } from 'dcss-morgue-parser'

function loadFixture(name: string) {
  return readFileSync(
    path.resolve(process.cwd(), `../../fixtures/morgue/focused/${name}`),
    'utf8',
  )
}

function loadFullFixture(name: string) {
  return readFileSync(
    path.resolve(process.cwd(), `../../fixtures/morgue/full/${name}`),
    'utf8',
  )
}

describe('extractMutations', () => {
  it('normalizes selected displayed A: traits to canonical trait ids', () => {
    expect(
      extractMutations(
        [
          'A: anti-wizardry 1, disrupted magic 2, distortion field 1, repulsion field 2,',
          'tengu flight, evasive flight, deformed body, pseudopods, ephemeral shield',
        ].join('\n'),
      ),
    ).toEqual({
      mutations: [
        { name: 'anti-wizardry', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.disruptedMagic },
        { name: 'disrupted magic', level: 2, traitId: KNOWN_MUTATION_TRAIT_IDS.disruptedMagic },
        { name: 'distortion field', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.repulsionField },
        { name: 'repulsion field', level: 2, traitId: KNOWN_MUTATION_TRAIT_IDS.repulsionField },
        { name: 'tengu flight', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.evasiveFlight },
        { name: 'evasive flight', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.evasiveFlight },
        { name: 'deformed body', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.deformedBody },
        { name: 'pseudopods', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.deformedBody },
        { name: 'ephemeral shield', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.ephemeralShield },
      ],
    })
  })

  it('normalizes stat-affecting displayed A: traits to canonical trait ids', () => {
    expect(
      extractMutations(
        [
          'A: sanguine armour 3, reduced AC 2, reduced EV 3, protean grace,',
          'gelatinous body 1, tough skin 1, shaggy fur 3, stone body,',
          'large bone plates 2, sturdy frame 1, trickster, acrobatic,',
          'icy blue scales 3, iridescent scales 2, molten scales 1,',
          'rugged brown scales 1, slimy green scales 2, thin metallic scales 3,',
          'yellow scales 1, sharp scales 3, iron-fused scales',
        ].join('\n'),
      ),
    ).toEqual({
      mutations: [
        { name: 'sanguine armour', level: 3, traitId: KNOWN_MUTATION_TRAIT_IDS.sanguineArmour },
        { name: 'reduced AC', level: 2, traitId: KNOWN_MUTATION_TRAIT_IDS.reducedAc },
        { name: 'reduced EV', level: 3, traitId: KNOWN_MUTATION_TRAIT_IDS.reducedEv },
        { name: 'protean grace', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.proteanGrace },
        { name: 'gelatinous body', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.gelatinousBody },
        { name: 'tough skin', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.toughSkin },
        { name: 'shaggy fur', level: 3, traitId: KNOWN_MUTATION_TRAIT_IDS.shaggyFur },
        { name: 'stone body', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.stoneBody },
        { name: 'large bone plates', level: 2, traitId: KNOWN_MUTATION_TRAIT_IDS.largeBonePlates },
        { name: 'sturdy frame', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.sturdyFrame },
        { name: 'trickster', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.trickster },
        { name: 'acrobatic', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.acrobatic },
        { name: 'icy blue scales', level: 3, traitId: KNOWN_MUTATION_TRAIT_IDS.icyBlueScales },
        { name: 'iridescent scales', level: 2, traitId: KNOWN_MUTATION_TRAIT_IDS.iridescentScales },
        { name: 'molten scales', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.moltenScales },
        { name: 'rugged brown scales', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.ruggedBrownScales },
        { name: 'slimy green scales', level: 2, traitId: KNOWN_MUTATION_TRAIT_IDS.slimyGreenScales },
        { name: 'thin metallic scales', level: 3, traitId: KNOWN_MUTATION_TRAIT_IDS.thinMetallicScales },
        { name: 'yellow scales', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.yellowScales },
        { name: 'sharp scales', level: 3, traitId: KNOWN_MUTATION_TRAIT_IDS.sharpScales },
        { name: 'iron-fused scales', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.ironFusedScales },
      ],
    })
  })

  it('extracts terse innate traits from the wrapped A: line', () => {
    expect(extractMutations(loadFixture('mutations-wrapped-a-line.txt'))).toEqual({
      mutations: [
        { name: 'horns', level: 3, traitId: null },
        { name: 'retaliatory headbutt', level: null, traitId: null },
        { name: 'claws', level: 3, traitId: null },
        { name: 'talons', level: 2, traitId: null },
        { name: 'clever', level: 1, traitId: null },
        { name: 'regeneration', level: 1, traitId: null },
        { name: 'eyeballs', level: 1, traitId: null },
        { name: 'jelly sensing items', level: null, traitId: null },
        { name: 'MP-powered wands', level: null, traitId: null },
        { name: 'efficient magic', level: 1, traitId: null },
        { name: 'slime shroud', level: null, traitId: null },
        { name: 'feed off suffering', level: 1, traitId: null },
      ],
    })
  })

  it('stops mutation parsing before orb and rune summary lines', () => {
    expect(extractMutations(loadFullFixture('morgue-knorpule3000-20260405-001540.txt'))).toEqual({
      mutations: [
        { name: 'sickness immunity', level: null, traitId: null },
        { name: 'big wings', level: null, traitId: null },
        { name: 'negative energy resistance', level: 1, traitId: null },
        { name: 'electricity resistance', level: null, traitId: null },
        { name: 'torment resistance', level: 1, traitId: null },
        { name: 'stone body', level: null, traitId: KNOWN_MUTATION_TRAIT_IDS.stoneBody },
        { name: 'devolution', level: 1, traitId: null },
      ],
    })
  })

  it('preserves suppressed state from parenthesized mutation entries', () => {
    expect(extractMutations(loadFullFixture('morgue-exant-20260406-220016.txt'))).toEqual({
      mutations: [
        { name: 'almost no armour', level: null, traitId: null },
        { name: 'amphibious', level: null, traitId: null },
        { name: '8 rings', level: null, traitId: null },
        { name: 'camouflage', level: 1, traitId: null },
        { name: 'gelatinous body', level: 1, traitId: KNOWN_MUTATION_TRAIT_IDS.gelatinousBody },
        { name: 'nimble swimmer', level: 1, traitId: null, suppressed: true },
        { name: 'tentacles', level: null, traitId: null },
      ],
    })
  })

  it('preserves transient state from bracketed mutation entries', () => {
    expect(extractMutations(loadFixture('mutations-transient-brackets.txt'))).toEqual({
      mutations: [
        { name: 'nimble swimmer', level: 2, traitId: null, suppressed: true },
        { name: 'mertail', level: null, traitId: null },
        { name: 'subdued magic', level: 2, traitId: null, transient: true },
        { name: 'booming voice', level: null, traitId: null, transient: true },
      ],
    })
  })
})

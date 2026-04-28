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
        { name: 'stone body', level: null, traitId: null },
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
        { name: 'gelatinous body', level: 1, traitId: null },
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

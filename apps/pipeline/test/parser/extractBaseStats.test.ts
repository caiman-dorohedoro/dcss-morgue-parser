import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractBaseStats } from 'dcss-morgue-parser'

function loadFixture(name: string) {
  return readFileSync(
    path.resolve(process.cwd(), `../../fixtures/morgue/focused/${name}`),
    'utf8',
  )
}

describe('extractBaseStats', () => {
  it('extracts version/species/str/int/dex from a reordered morgue', () => {
    const parsed = extractBaseStats(loadFixture('reordered-sections.txt'))

    expect(parsed).toMatchObject({
      version: '0.34.1',
      species: 'Djinni',
      speciesVariant: null,
      background: 'Fire Elementalist',
      god: null,
      xl: 7,
      ac: 4,
      ev: 11,
      sh: 0,
      strength: 8,
      intelligence: 19,
      dexterity: 14,
    })
  })

  it('extracts base stats from a 0.34 webtiles quit morgue', () => {
    const parsed = extractBaseStats(loadFixture('cao-0.34-webtiles-quit.txt'))

    expect(parsed).toMatchObject({
      version: '0.34.0',
      species: 'Barachi',
      speciesVariant: null,
      background: 'Hunter',
      god: null,
      xl: 1,
      ac: 3,
      ev: 11,
      sh: 0,
      strength: 12,
      intelligence: 9,
      dexterity: 15,
    })
  })

  it('extracts base stats from a trunk webtiles death morgue', () => {
    const parsed = extractBaseStats(loadFixture('cao-trunk-webtiles-death.txt'))

    expect(parsed).toMatchObject({
      version: '0.35-a0-181-g84ebf06',
      species: 'Minotaur',
      speciesVariant: null,
      background: 'Berserker',
      god: 'Trog',
      godPietyDisplay: '****..',
      godPietyRank: 4,
      godOstracismPips: 0,
      godStatus: 'Trog was greatly pleased with you.',
      godUnderPenance: false,
      xl: 9,
      ac: 14,
      ev: 6,
      sh: 0,
      strength: 25,
      intelligence: 4,
      dexterity: 11,
    })
  })

  it('prefers the full began-as line when the title line uses species/background abbreviations', () => {
    const parsed = extractBaseStats(loadFixture('demonspawn-abbrev-title.txt'))

    expect(parsed).toMatchObject({
      version: '0.34.0',
      species: 'Demonspawn',
      speciesVariant: null,
      background: 'Necromancer',
      god: null,
      xl: 3,
      ac: 4,
      ev: 11,
      sh: 0,
      strength: 8,
      intelligence: 17,
      dexterity: 13,
    })
  })

  it('normalizes colored draconian descriptors while preserving the variant', () => {
    const parsed = extractBaseStats(loadFixture('colored-draconian.txt'))

    expect(parsed).toMatchObject({
      version: '0.35-a0-257-gf9e06672e4',
      species: 'Draconian',
      speciesVariant: 'White Draconian',
      background: 'Summoner',
      god: 'Ru',
      xl: 12,
      ac: 11,
      ev: 11,
      sh: 0,
      strength: 16,
      intelligence: 25,
      dexterity: 19,
    })
  })

  it('prefers the title descriptor over current-form prose when the form line is not species data', () => {
    const parsed = extractBaseStats(loadFixture('title-descriptor-overrides-form-line.txt'))

    expect(parsed).toMatchObject({
      version: '0.35-a0-264-ge5931b7edd',
      species: 'Oni',
      speciesVariant: null,
      background: 'Monk',
      god: 'Cheibriados',
      xl: 25,
      ac: 41,
      ev: 14,
      sh: 0,
      strength: 52,
      intelligence: 26,
      dexterity: 26,
    })
  })

  it('extracts current god status details from header stars, Gozag prose, and penance prose', () => {
    const beogh = extractBaseStats(loadFixture('eel-hands-current-form.txt'))
    const gozag = extractBaseStats(loadFixture('knorpule3000-gozag-full.txt'))

    expect(beogh).toMatchObject({
      god: 'Beogh',
      godPietyDisplay: '*****.',
      godPietyRank: 5,
      godOstracismPips: 0,
      godStatus: 'Beogh was demanding penance.',
      godUnderPenance: true,
    })

    expect(gozag).toMatchObject({
      god: 'Gozag',
      godPietyDisplay: null,
      godPietyRank: null,
      godOstracismPips: 0,
      godStatus: 'Gozag was greatly pleased with you.',
      godUnderPenance: false,
    })
  })
})

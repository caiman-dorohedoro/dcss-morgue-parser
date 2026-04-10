import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  canonicalizeSpellNames,
  extractSpells,
} from '../../../../packages/parser/src/index'

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

describe('extractSpells', () => {
  it('extracts all listed spells and failure percentages, including unmemorized entries', () => {
    const spells = extractSpells(loadFixture('spell-list-full.txt'))

    expect(spells).toContainEqual({
      name: 'Fireball',
      failurePercent: 12,
      castable: true,
      memorized: false,
    })
  })

  it('extracts memorized and spell-library entries from the modern spell table layout', () => {
    const spells = extractSpells(loadFixture('spell-library-table-full.txt'))

    expect(spells).toContainEqual({
      name: 'Flame Wave',
      failurePercent: 3,
      castable: true,
      memorized: true,
    })

    expect(spells).toContainEqual({
      name: 'Fireball',
      failurePercent: 12,
      castable: true,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: 'Blink',
      failurePercent: 22,
      castable: true,
      memorized: false,
    })
  })

  it('extracts failure percentages from a realistic spell library table', () => {
    const spells = extractSpells(loadFixture('spell-library-table-realistic.txt'))

    expect(spells).toContainEqual({
      name: 'Sandblast',
      failurePercent: 0,
      castable: true,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: 'Fireball',
      failurePercent: 13,
      castable: true,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: 'Freezing Cloud',
      failurePercent: 32,
      castable: true,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: "Iskenderun's Mystic Blast",
      failurePercent: 17,
      castable: true,
      memorized: false,
    })
  })

  it('keeps unusable spell-library entries with an explicit unusable state', () => {
    const spells = extractSpells(loadFixture('spell-library-table-unusable-full.txt'))

    expect(spells).toContainEqual({
      name: 'Foxfire',
      failurePercent: 0,
      castable: true,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: 'Kinetic Grapnel',
      failurePercent: null,
      castable: false,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: 'Soul Splinter',
      failurePercent: null,
      castable: false,
      memorized: false,
    })

    expect(spells).toContainEqual({
      name: 'Forge Lightning Spire',
      failurePercent: null,
      castable: false,
      memorized: false,
    })
  })

  it('restores canonical names when the morgue table truncates long spell names', () => {
    const parsed = extractSpells(loadFixture('spell-library-table-realistic.txt'), {
      canonicalSpellNames: [
        "Iskenderun's Mystic Blast",
        'Construct Spike Launcher',
        "Eringya's Surprising Crocodile",
        "Borgnjor's Revivification",
      ],
    })

    expect(parsed).toContainEqual({
      name: "Iskenderun's Mystic Blast",
      failurePercent: 17,
      castable: true,
      memorized: false,
    })
  })

  it('leaves ambiguous prefixes unchanged', () => {
    const spells = canonicalizeSpellNames(
      [
        {
          name: 'Blink',
          failurePercent: 10,
          castable: true,
          memorized: false,
        },
      ],
      ['Blink', 'Blink Range', 'Blink Away'],
    )

    expect(spells).toEqual([
      {
        name: 'Blink',
        failurePercent: 10,
        castable: true,
        memorized: false,
      },
    ])
  })

  it('strips uppercase memorized hotkeys from modern spell tables', () => {
    const spells = extractSpells(loadFullFixture('morgue-jkt-20260404-065348.txt'))

    expect(spells).toContainEqual({
      name: "Dragon's Call",
      failurePercent: 4,
      castable: true,
      memorized: true,
    })
  })

  it('extracts memorized spells when modern morgues use present-tense spell headings', () => {
    const spells = extractSpells(`
You know the following spells:

 Your Spells              Type           Power      Damage    Failure   Level
a - Foxfire               Conj/Fire      100%       2x1d9     0%          1
b - Jinxbite              Hex            100%       2d4       0%          2
c - Bombard               Conj/Erth      49%        9d8       1%          6

Your spell library is empty.
`)

    expect(spells).toContainEqual({
      name: 'Foxfire',
      failurePercent: 0,
      castable: true,
      memorized: true,
    })

    expect(spells).toContainEqual({
      name: 'Bombard',
      failurePercent: 1,
      castable: true,
      memorized: true,
    })
  })
})

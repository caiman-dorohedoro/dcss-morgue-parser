import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMorgue, type ParseMorgueMeta } from '../../src/parser/parseMorgue'

function loadFixture(directory: 'focused', name: string) {
  return readFileSync(
    path.resolve(process.cwd(), `../../fixtures/morgue/${directory}/${name}`),
    'utf8',
  )
}

function fixtureMeta(playerName = 'EnsignRicky'): ParseMorgueMeta {
  return {
    candidateId: 'candidate-1',
    serverId: 'CAO',
    playerName,
    sourceVersionLabel: '0.34',
    endedAt: '2026-04-05T01:02:03.000Z',
    morgueUrl: `http://crawl.akrasiac.org/rawdata/${playerName}/morgue-${playerName}-20260405-010203.txt`,
  }
}

describe('parseMorgue', () => {
  it('parses a 0.34 webtiles quit morgue', () => {
    const result = parseMorgue(loadFixture('focused', 'cao-0.34-webtiles-quit.txt'), fixtureMeta())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.version).toBe('0.34.0')
      expect(result.record.species).toBe('Barachi')
      expect(result.record.god).toBeNull()
      expect(result.record.xl).toBe(1)
      expect(result.record.ac).toBe(3)
      expect(result.record.ev).toBe(11)
      expect(result.record.sh).toBe(0)
      expect(result.record.bodyArmour).toBe('leather armour')
      expect(result.record.helmets).toEqual([])
      expect(result.record.gloves).toEqual([])
      expect(result.record.footwear).toEqual([])
      expect(result.record.cloaks).toEqual([])
      expect(result.record.mutations).toEqual([
        { name: 'amphibious', level: null, traitId: null },
        { name: 'frog-like legs', level: 1, traitId: null },
        { name: '+LOS', level: null, traitId: null },
      ])
      expect(result.record.skills.dodging).toBe(2.1)
      expect(result.record.effectiveSkills.dodging).toBe(2.1)
      expect(result.record.spells).toEqual([])
    }
  })

  it('parses a trunk webtiles death morgue', () => {
    const result = parseMorgue(loadFixture('focused', 'cao-trunk-webtiles-death.txt'), {
      ...fixtureMeta('dolemite99'),
      sourceVersionLabel: '0.35-a0',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.version).toBe('0.35-a0-181-g84ebf06')
      expect(result.record.species).toBe('Minotaur')
      expect(result.record.god).toBe('Trog')
      expect(result.record.xl).toBe(9)
      expect(result.record.ac).toBe(14)
      expect(result.record.ev).toBe(6)
      expect(result.record.sh).toBe(0)
      expect(result.record.bodyArmour).toBe('plate armour')
      expect(result.record.footwear).toEqual(['pair of boots'])
      expect(result.record.cloaks).toEqual(['cloak'])
      expect(result.record.mutations).toEqual([
        { name: 'horns', level: 2, traitId: null },
        { name: 'retaliatory headbutt', level: null, traitId: null },
      ])
      expect(result.record.skills.armour).toBe(2.4)
      expect(result.record.effectiveSkills.armour).toBe(2.4)
      expect(result.record.spells).toEqual([])
    }
  })

  it('parses the modern spell library table and keeps school skills', () => {
    const result = parseMorgue(
      loadFixture('focused', 'spell-library-table-full.txt'),
      fixtureMeta('Sorcerer'),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.skills.conjurations).toBe(11.2)
      expect(result.record.skills.fireMagic).toBe(9.7)
      expect(result.record.effectiveSkills.conjurations).toBe(11.2)
      expect(result.record.effectiveSkills.fireMagic).toBe(9.7)
      expect(result.record.ac).toBe(4)
      expect(result.record.ev).toBe(11)
      expect(result.record.sh).toBe(0)
      expect(result.record.spells).toContainEqual({
        name: 'Flame Wave',
        failurePercent: 3,
        castable: true,
        memorized: true,
      })
      expect(result.record.spells).toContainEqual({
        name: 'Fireball',
        failurePercent: 12,
        castable: true,
        memorized: false,
      })
    }
  })

  it('normalizes a missing spell section to an empty list', () => {
    const result = parseMorgue(loadFixture('focused', 'no-spell-section.txt'), fixtureMeta())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.spells).toEqual([])
    }
  })

  it('parses colored draconians as canonical Draconian', () => {
    const result = parseMorgue(loadFixture('focused', 'colored-draconian.txt'), {
      ...fixtureMeta('WSnake'),
      sourceVersionLabel: '0.35-a0',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.version).toBe('0.35-a0-257-gf9e06672e4')
      expect(result.record.species).toBe('Draconian')
      expect(result.record.speciesVariant).toBe('White Draconian')
      expect(result.record.god).toBe('Ru')
      expect(result.record.ac).toBe(11)
      expect(result.record.ev).toBe(11)
      expect(result.record.sh).toBe(0)
      expect(result.record.spells).toEqual([])
    }
  })

  it('fails when the parsed morgue player name disagrees with candidate metadata', () => {
    const result = parseMorgue(
      loadFixture('focused', 'cao-0.34-webtiles-quit.txt'),
      fixtureMeta('alice'),
    )

    expect(result).toEqual({
      ok: false,
      failure: {
        reason: 'morgue_player_name_mismatch',
        detail: 'parsed=EnsignRicky, candidate=alice',
      },
    })
  })
})

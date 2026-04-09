import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractSpells, parseMorgueText } from '../../../../packages/parser/src/index'

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

describe('parseMorgueText shared parser', () => {
  it('parses browser-safe structured data directly from morgue text', () => {
    const result = parseMorgueText(loadFixture('cao-0.34-webtiles-quit.txt'))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.playerName).toBe('EnsignRicky')
      expect(result.record.species).toBe('Barachi')
      expect(result.record.god).toBeNull()
      expect(result.record.xl).toBe(1)
      expect(result.record.ac).toBe(3)
      expect(result.record.ev).toBe(11)
      expect(result.record.sh).toBe(0)
      expect(result.record.mutations).toEqual([
        { name: 'amphibious', level: null },
        { name: 'frog-like legs', level: 1 },
        { name: '+LOS', level: null },
      ])
      expect(result.record.spells).toEqual([])
    }
  })

  it('restores canonical spell names when callers provide a browser-safe spell vocabulary', () => {
    const spells = extractSpells(loadFixture('spell-library-table-realistic.txt'), {
      canonicalSpellNames: [
        "Iskenderun's Mystic Blast",
        'Construct Spike Launcher',
        "Eringya's Surprising Crocodile",
        "Borgnjor's Revivification",
      ],
    })

    expect(spells).toContainEqual({
      name: "Iskenderun's Mystic Blast",
      failurePercent: 17,
      castable: true,
      memorized: false,
    })
  })

  it('restores truncated spell names through parseMorgueText defaults', () => {
    const result = parseMorgueText(loadFullFixture('morgue-knorpule3000-20260405-001540.txt'))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.spells).toContainEqual({
        name: "Lehudib's Crystal Spear",
        failurePercent: 7,
        castable: true,
        memorized: true,
      })
      expect(result.record.spells).toContainEqual({
        name: "Nazja's Percussive Tempering",
        failurePercent: 1,
        castable: true,
        memorized: true,
      })
      expect(result.record.spells).toContainEqual({
        name: "Lee's Rapid Deconstruction",
        failurePercent: 1,
        castable: true,
        memorized: true,
      })
      expect(result.record.spells).toContainEqual({
        name: "Brom's Barrelling Boulder",
        failurePercent: 0,
        castable: true,
        memorized: false,
      })
      expect(result.record.spells).toContainEqual({
        name: "Iskenderun's Battlesphere",
        failurePercent: 1,
        castable: true,
        memorized: false,
      })
      expect(result.record.spells).toContainEqual({
        name: "Iskenderun's Mystic Blast",
        failurePercent: 1,
        castable: true,
        memorized: false,
      })
    }
  })

  it('normalizes uppercase spell hotkeys and preserves suppressed parenthesized mutations from full morgues', () => {
    const spellResult = parseMorgueText(loadFullFixture('morgue-jkt-20260404-065348.txt'))
    const mutationResult = parseMorgueText(loadFullFixture('morgue-exant-20260406-220016.txt'))

    expect(spellResult.ok).toBe(true)
    if (spellResult.ok) {
      expect(spellResult.record.god).toBe('Ashenzari')
      expect(spellResult.record.spells).toContainEqual({
        name: "Dragon's Call",
        failurePercent: 4,
        castable: true,
        memorized: true,
      })
    }

    expect(mutationResult.ok).toBe(true)
    if (mutationResult.ok) {
      expect(mutationResult.record.god).toBe('Dithmenos')
      expect(mutationResult.record.mutations).toContainEqual({
        name: 'nimble swimmer',
        level: 1,
        suppressed: true,
      })
    }
  })

  it('extracts current form state and equipped talismans from full morgues', () => {
    const deathFormResult = parseMorgueText(loadFullFixture('morgue-Moober-20260402-231943.txt'))
    const treeFormResult = parseMorgueText(loadFullFixture('morgue-blister-20260331-020234.txt'))

    expect(deathFormResult.ok).toBe(true)
    if (deathFormResult.ok) {
      expect(deathFormResult.record.form).toBe('death-form')
      expect(deathFormResult.record.talisman).toBe('death talisman of Lan Byow')
      expect(deathFormResult.record.talismanDetails).toMatchObject({
        objectClass: 'talisman',
        baseType: 'death talisman',
        artifactKind: 'randart',
        equipState: 'worn',
      })
    }

    expect(treeFormResult.ok).toBe(true)
    if (treeFormResult.ok) {
      expect(treeFormResult.record.form).toBe('statue-form')
      expect(treeFormResult.record.talisman).toBe('granite talisman "Iffich"')
      expect(treeFormResult.record.talismanDetails).toMatchObject({
        objectClass: 'talisman',
        baseType: 'granite talisman',
        artifactKind: 'randart',
      })
    }
  })

  it('preserves installed Coglin gizmos only when the morgue actually has one', () => {
    const gizmoResult = parseMorgueText(loadFixture('coglin-gizmo-installed-jingleheimer.txt'))
    const noGizmoResult = parseMorgueText(loadFixture('coglin-no-gizmo-disgorge.txt'))

    expect(gizmoResult.ok).toBe(true)
    if (gizmoResult.ok) {
      expect(gizmoResult.record.species).toBe('Coglin')
      expect(gizmoResult.record.gizmo).toBe('cataphasic hydrosorter')
      expect(gizmoResult.record.gizmoDetails).toMatchObject({
        objectClass: 'gizmo',
        equipState: 'installed',
        artifactKind: 'randart',
        properties: {
          numeric: { MP: 4 },
          booleanProps: { rElec: true, Wiz: true, Clar: true, RMsl: true },
          opaqueTokens: [],
        },
      })
      expect(gizmoResult.record.gizmoDetails?.gizmoEffects).toBeUndefined()
      expect(gizmoResult.record.gizmoDetails?.namedEffects).toBeUndefined()
    }

    expect(noGizmoResult.ok).toBe(true)
    if (noGizmoResult.ok) {
      expect(noGizmoResult.record.species).toBe('Coglin')
      expect(noGizmoResult.record).not.toHaveProperty('gizmo')
      expect(noGizmoResult.record.gizmoDetails).toBeUndefined()
      expect(noGizmoResult.record.amulet).toBe('none')
      expect(noGizmoResult.record.rings).toEqual([])
    }
  })
})

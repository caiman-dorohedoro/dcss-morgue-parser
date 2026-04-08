import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildFixtureMetadataReport,
  collectTestReferencedFixtures,
  summarizeFixtureMetadataReport,
} from '../../src/audit/buildFixtureMetadata'

describe('buildFixtureMetadata', () => {
  it('collects focused and full fixtures referenced by tests', () => {
    const refs = collectTestReferencedFixtures()

    expect(refs).toContainEqual(
      expect.objectContaining({
        directory: 'focused',
        name: 'spell-library-table-full.txt',
      }),
    )
    expect(refs).toContainEqual(
      expect.objectContaining({
        directory: 'full',
        name: 'morgue-Moober-20260402-231943.txt',
      }),
    )
  })

  it('includes every full morgue fixture because golden tests enumerate the full directory', () => {
    const report = buildFixtureMetadataReport({
      generatedAt: '2026-04-08T00:00:00.000Z',
    })
    const fullFixtureCount = readdirSync(path.resolve(process.cwd(), '../../fixtures/morgue/full')).filter(
      (name) => name.endsWith('.txt'),
    ).length

    expect(report.fixtures.filter((fixture) => fixture.directory === 'full')).toHaveLength(fullFixtureCount)
  })

  it('preserves useful partial metadata for focused snippets and full metadata for real morgues', () => {
    const report = buildFixtureMetadataReport({
      generatedAt: '2026-04-08T00:00:00.000Z',
    })
    const focusedSpells = report.fixtures.find(
      (fixture) => fixture.directory === 'focused' && fixture.name === 'spell-library-table-realistic.txt',
    )
    const fullMorgue = report.fixtures.find(
      (fixture) => fixture.directory === 'full' && fixture.name === 'morgue-Moober-20260402-231943.txt',
    )

    expect(focusedSpells).toBeDefined()
    expect(focusedSpells?.parseStatus).toBe('failure')
    expect(focusedSpells?.stats.spellCount).toBeGreaterThan(0)

    expect(fullMorgue).toBeDefined()
    expect(fullMorgue?.parseStatus).toBe('success')
    expect(fullMorgue?.stats.species).toBe('Demonspawn')
    expect(fullMorgue?.stats.form).toBe('death-form')
  })

  it('reduces the generated output to compact summary statistics', () => {
    const report = buildFixtureMetadataReport({
      generatedAt: '2026-04-08T00:00:00.000Z',
    })
    const summary = summarizeFixtureMetadataReport(report)

    expect(summary).not.toHaveProperty('fixtures')
    expect(summary.summary.versionCounts).toEqual({
      '0.34': expect.any(Number),
      '0.35-trunk': expect.any(Number),
      unknown: expect.any(Number),
    })
    expect(
      summary.summary.versionCounts['0.34']
      + summary.summary.versionCounts['0.35-trunk']
      + summary.summary.versionCounts.unknown,
    ).toBe(summary.summary.fixtureCount)
  })
})

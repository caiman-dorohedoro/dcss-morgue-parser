import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTestReferencedFixtures } from '../../src/audit/buildFixtureMetadata'
import { exportFullFixtureReview } from '../../src/audit/exportFixtureReview'

describe('exportFullFixtureReview', () => {
  it('exports committed full fixtures into review pairs and bundle summaries', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'dcss-fixture-review-'))

    try {
      const expectedCaseCount = collectTestReferencedFixtures()
        .filter((ref) => ref.directory === 'full')
        .filter((ref) => {
          const expectedPath = path.resolve(
            process.cwd(),
            `../../fixtures/morgue/expected/full-${ref.name.replace(/\.txt$/i, '.json')}`,
          )

          return existsSync(expectedPath)
        }).length

      const result = exportFullFixtureReview({ outputDir })

      expect(result.caseCount).toBe(expectedCaseCount)

      const bundleChecklist = await readFile(path.resolve(outputDir, 'CHECKLIST.txt'), 'utf8')
      const index = await readFile(path.resolve(outputDir, 'index.tsv'), 'utf8')
      const report = await readFile(path.resolve(outputDir, 'comparison-report.md'), 'utf8')
      const mismatches = await readFile(path.resolve(outputDir, 'auto-mismatches.txt'), 'utf8')

      expect(bundleChecklist).toContain('Parsed JSON in this bundle is copied from committed fixtures/expected JSON')
      expect(index.split('\n').filter(Boolean)).toHaveLength(result.caseCount + 1)
      expect(report).toContain('committed full-fixture raw morgues beside committed expected JSON')
      expect(
        mismatches === 'No auto mismatches.\n' || mismatches.startsWith('Cases with auto mismatches:\n'),
      ).toBe(true)

      const mooberCase = result.cases.find(
        (reviewCase) => reviewCase.fixtureName === 'morgue-Moober-20260402-231943.txt',
      )

      expect(mooberCase).toBeDefined()

      const expectedJson = await readFile(
        path.resolve(process.cwd(), '../../fixtures/morgue/expected/full-morgue-Moober-20260402-231943.json'),
        'utf8',
      )
      const exportedJson = await readFile(mooberCase!.parsedPath, 'utf8')
      const comparison = await readFile(mooberCase!.comparisonPath, 'utf8')

      expect(exportedJson).toBe(expectedJson)
      expect(comparison).toContain('Parsed role: Demonspawn Hunter')
    } finally {
      await rm(outputDir, { recursive: true, force: true })
    }
  })
})

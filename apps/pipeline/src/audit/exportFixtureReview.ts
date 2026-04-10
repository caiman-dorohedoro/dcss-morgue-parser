import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import {
  compareReviewPair,
  formatReviewPairComparison,
} from './compareReviewPair'
import { collectTestReferencedFixtures } from './buildFixtureMetadata'
import type { ParsedMorgueTextRecord } from '../../../../packages/parser/src/types'

export type FixtureReviewCase = {
  fixtureName: string
  expectedName: string
  playerName: string
  version: string
  species: string
  background: string
  god: string
  sourceFixturePath: string
  sourceExpectedPath: string
  rawPath: string
  parsedPath: string
  comparisonPath: string
  mismatchCount: number
  mismatches: string[]
}

export type FixtureReviewExportResult = {
  outputDir: string
  reviewDir: string
  caseCount: number
  autoMismatchCaseCount: number
  cases: FixtureReviewCase[]
}

type ExportFixtureReviewOptions = {
  workspaceDir?: string
  outputDir: string
}

function buildChecklistText(): string {
  return [
    'Review each case for:',
    '- header role and base stats',
    '- equipped item names and slots',
    '- form and talisman state',
    '- mutation A: line vs parsed mutations',
    '- memorized and library spell rows',
    '- anything that looks like inscription/property confusion',
    '',
    'Parsed JSON in this bundle is copied from committed fixtures/expected JSON, not regenerated during export.',
  ].join('\n')
}

function buildPathsText(input: {
  outputDir: string
  reviewDir: string
  fullFixtureDir: string
  expectedDir: string
}): string {
  return [
    `Bundle root: ${input.outputDir}`,
    `Review cases: ${input.reviewDir}`,
    `Source full fixtures: ${input.fullFixtureDir}`,
    `Source expected JSON: ${input.expectedDir}`,
    'Mode: committed full-fixture raw.txt + expected parsed.json export',
  ].join('\n')
}

function buildIndexTsv(cases: FixtureReviewCase[]): string {
  const header = [
    'fixture_name',
    'expected_name',
    'player_name',
    'version',
    'species',
    'background',
    'god',
    'source_fixture_path',
    'source_expected_path',
    'raw_path',
    'parsed_path',
    'comparison_path',
    'auto_mismatch_count',
  ].join('\t')

  const rows = cases.map((reviewCase) => [
    reviewCase.fixtureName,
    reviewCase.expectedName,
    reviewCase.playerName,
    reviewCase.version,
    reviewCase.species,
    reviewCase.background,
    reviewCase.god,
    reviewCase.sourceFixturePath,
    reviewCase.sourceExpectedPath,
    reviewCase.rawPath,
    reviewCase.parsedPath,
    reviewCase.comparisonPath,
    String(reviewCase.mismatchCount),
  ].join('\t'))

  return `${[header, ...rows].join('\n')}\n`
}

function buildAutoMismatchesText(cases: FixtureReviewCase[]): string {
  const mismatchedCases = cases.filter((reviewCase) => reviewCase.mismatchCount > 0)

  if (mismatchedCases.length === 0) {
    return 'No auto mismatches.\n'
  }

  const lines = ['Cases with auto mismatches:']

  for (const reviewCase of mismatchedCases) {
    lines.push(`- ${reviewCase.fixtureName}`)
    for (const mismatch of reviewCase.mismatches) {
      lines.push(`  - ${mismatch}`)
    }
  }

  return `${lines.join('\n')}\n`
}

function buildComparisonReport(cases: FixtureReviewCase[]): string {
  const lines = [
    '# Fixture Review Report',
    '',
    'This bundle exports committed full-fixture raw morgues beside committed expected JSON.',
    'It is meant for human review, not parser-output regeneration.',
  ]

  for (const reviewCase of cases) {
    const formattedComparison = readFileSync(reviewCase.comparisonPath, 'utf8').trimEnd()
    lines.push('')
    lines.push(`## ${reviewCase.fixtureName}`)
    lines.push('')
    lines.push(`- Player: ${reviewCase.playerName}`)
    lines.push(`- Role: ${reviewCase.species} ${reviewCase.background}`)
    lines.push(`- God: ${reviewCase.god}`)
    lines.push(`- Version: ${reviewCase.version}`)
    lines.push(`- Raw: ${reviewCase.rawPath}`)
    lines.push(`- Parsed: ${reviewCase.parsedPath}`)
    lines.push(`- Auto mismatches: ${reviewCase.mismatchCount}`)
    lines.push('')
    lines.push('```text')
    lines.push(formattedComparison)
    lines.push('```')
  }

  return `${lines.join('\n')}\n`
}

function fixtureStem(name: string): string {
  return name.replace(/\.txt$/i, '')
}

export function exportFullFixtureReview(
  options: ExportFixtureReviewOptions,
): FixtureReviewExportResult {
  const workspaceDir = options.workspaceDir ?? process.cwd()
  const repoRoot = path.resolve(workspaceDir, '../..')
  const fullFixtureDir = path.resolve(repoRoot, 'fixtures/morgue/full')
  const expectedDir = path.resolve(repoRoot, 'fixtures/morgue/expected')
  const outputDir = path.resolve(options.outputDir)
  const reviewDir = path.resolve(outputDir, 'review')
  const refs = collectTestReferencedFixtures({ workspaceDir })
    .filter((ref) => ref.directory === 'full')
    .filter((ref) => existsSync(path.resolve(expectedDir, `full-${ref.name.replace(/\.txt$/i, '.json')}`)))

  rmSync(outputDir, { recursive: true, force: true })
  mkdirSync(reviewDir, { recursive: true })

  const cases: FixtureReviewCase[] = refs.map((ref) => {
    const expectedName = `full-${ref.name.replace(/\.txt$/i, '.json')}`
    const sourceFixturePath = path.resolve(fullFixtureDir, ref.name)
    const sourceExpectedPath = path.resolve(expectedDir, expectedName)
    const caseDir = path.resolve(reviewDir, fixtureStem(ref.name))
    const rawPath = path.resolve(caseDir, 'raw.txt')
    const parsedPath = path.resolve(caseDir, 'parsed.json')
    const comparisonPath = path.resolve(caseDir, 'auto-check.txt')
    const rawText = readFileSync(sourceFixturePath, 'utf8')
    const expectedJsonText = readFileSync(sourceExpectedPath, 'utf8')
    const parsed = JSON.parse(expectedJsonText) as ParsedMorgueTextRecord
    const comparison = compareReviewPair(rawText, parsed)

    mkdirSync(caseDir, { recursive: true })
    writeFileSync(rawPath, rawText, 'utf8')
    writeFileSync(parsedPath, expectedJsonText, 'utf8')
    writeFileSync(comparisonPath, `${formatReviewPairComparison(comparison)}\n`, 'utf8')

    return {
      fixtureName: ref.name,
      expectedName,
      playerName: parsed.playerName,
      version: parsed.version,
      species: parsed.species,
      background: parsed.background,
      god: parsed.god ?? 'none',
      sourceFixturePath,
      sourceExpectedPath,
      rawPath,
      parsedPath,
      comparisonPath,
      mismatchCount: comparison.mismatches.length,
      mismatches: comparison.mismatches,
    }
  })

  writeFileSync(path.resolve(outputDir, 'CHECKLIST.txt'), `${buildChecklistText()}\n`, 'utf8')
  writeFileSync(
    path.resolve(outputDir, 'PATHS.txt'),
    `${buildPathsText({ outputDir, reviewDir, fullFixtureDir, expectedDir })}\n`,
    'utf8',
  )
  writeFileSync(path.resolve(outputDir, 'index.tsv'), buildIndexTsv(cases), 'utf8')
  writeFileSync(path.resolve(outputDir, 'auto-mismatches.txt'), buildAutoMismatchesText(cases), 'utf8')
  writeFileSync(path.resolve(outputDir, 'comparison-report.md'), buildComparisonReport(cases), 'utf8')

  return {
    outputDir,
    reviewDir,
    caseCount: cases.length,
    autoMismatchCaseCount: cases.filter((reviewCase) => reviewCase.mismatchCount > 0).length,
    cases,
  }
}

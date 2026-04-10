import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  extractBaseStats,
  extractEquipment,
  extractForm,
  extractMutations,
  extractSkills,
  extractSpells,
  parseMorgueText,
} from 'dcss-morgue-parser'
import type {
  EquipmentItemSnapshot,
  EquipmentSnapshot,
  MutationEntrySnapshot,
  SkillLevelsSnapshot,
  SpellSnapshot,
} from 'dcss-morgue-parser'

export type FixtureDirectory = 'focused' | 'full'

export type FixtureReference = {
  directory: FixtureDirectory
  name: string
  testFiles: string[]
}

export type FixtureMetadataRecord = {
  directory: FixtureDirectory
  name: string
  relativePath: string
  expectedJson: string | null
  testFiles: string[]
  parseStatus: 'success' | 'failure'
  parseFailureReason: string | null
  tags: string[]
  stats: {
    playerName: string | null
    version: string | null
    species: string | null
    speciesVariant: string | null
    background: string | null
    god: string | null
    xl: number | null
    form: string | null
    talisman: string | null
    spellCount: number
    memorizedSpellCount: number
    librarySpellCount: number
    unusableSpellCount: number
    mutationCount: number
    suppressedMutationCount: number
    transientMutationCount: number
    nonZeroSkillCount: number
    topEffectiveSkills: Array<{
      name: string
      level: number
    }>
    ringCount: number
    helmetCount: number
    gloveCount: number
    footwearCount: number
    cloakCount: number
    hauntedEquipmentCount: number
    meldedEquipmentCount: number
  }
}

export type FixtureMetadataReport = {
  generatedAt: string
  source: 'test-referenced-fixtures'
  summary: {
    fixtureCount: number
    focusedCount: number
    fullCount: number
    goldenFixtureCount: number
    parseSuccessCount: number
    parseFailureCount: number
    featureCounts: Record<string, number>
    speciesCounts: Record<string, number>
    backgroundCounts: Record<string, number>
    godCounts: Record<string, number>
  }
  crawlSourceCoverage?: import('./crawlSourceCoverage').CrawlSourceCoverageSummary
  fixtures: FixtureMetadataRecord[]
}

export type FixtureMetadataSummaryReport = {
  generatedAt: string
  source: 'test-referenced-fixtures'
  summary: {
    fixtureCount: number
    focusedCount: number
    fullCount: number
    goldenFixtureCount: number
    parseSuccessCount: number
    parseFailureCount: number
    featureCounts: Record<string, number>
    versionCounts: Record<'0.34' | '0.35-trunk' | 'unknown', number>
  }
  crawlSourceCoverage?: import('./crawlSourceCoverage').CrawlSourceCoverageSummary
}

type WorkspaceOptions = {
  workspaceDir?: string
  generatedAt?: string
}

const FIXTURE_REFERENCE_DIRECTORIES = ['focused', 'full'] as const

function listFilesRecursive(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.resolve(dir, entry.name)
    if (entry.isDirectory()) {
      return listFilesRecursive(fullPath)
    }

    return [fullPath]
  })
}

function toPosixRelative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/')
}

function addFixtureRef(
  refs: Map<string, FixtureReference>,
  workspaceDir: string,
  testFilePath: string,
  directory: FixtureDirectory,
  name: string,
) {
  const key = `${directory}/${name}`
  const existing = refs.get(key)
  const relativeTestFile = toPosixRelative(workspaceDir, testFilePath)

  if (existing) {
    if (!existing.testFiles.includes(relativeTestFile)) {
      existing.testFiles.push(relativeTestFile)
      existing.testFiles.sort()
    }
    return
  }

  refs.set(key, {
    directory,
    name,
    testFiles: [relativeTestFile],
  })
}

function collectHelperDirectoryMap(content: string): Map<string, FixtureDirectory | 'dynamic'> {
  const helpers = new Map<string, FixtureDirectory | 'dynamic'>()

  const fixedRegex =
    /function\s+(\w+)\([^)]*\)\s*\{\s*return\s+readFileSync\(\s*path\.resolve\(process\.cwd\(\),\s*`[^`]*fixtures\/morgue\/(focused|full)\/\$\{name\}`/g

  for (const match of content.matchAll(fixedRegex)) {
    helpers.set(match[1], match[2] as FixtureDirectory)
  }

  const dynamicRegex =
    /function\s+(\w+)\([^)]*\)\s*\{\s*return\s+readFileSync\(\s*path\.resolve\(process\.cwd\(\),\s*`[^`]*fixtures\/morgue\/\$\{directory\}\/\$\{name\}`/g

  for (const match of content.matchAll(dynamicRegex)) {
    helpers.set(match[1], 'dynamic')
  }

  return helpers
}

function collectReferencedFixturesFromTestFile(
  workspaceDir: string,
  testFilePath: string,
  refs: Map<string, FixtureReference>,
) {
  const content = readFileSync(testFilePath, 'utf8')
  const helperMap = collectHelperDirectoryMap(content)

  for (const [helperName, directory] of helperMap.entries()) {
    if (directory === 'dynamic') {
      const callRegex = new RegExp(
        String.raw`${helperName}\(\s*['"](focused|full)['"]\s*,\s*['"]([^'"]+\.txt)['"]\s*\)`,
        'g',
      )

      for (const match of content.matchAll(callRegex)) {
        addFixtureRef(refs, workspaceDir, testFilePath, match[1] as FixtureDirectory, match[2])
      }
      continue
    }

    const callRegex = new RegExp(
      String.raw`${helperName}\(\s*['"]([^'"]+\.txt)['"]\s*\)`,
      'g',
    )

    for (const match of content.matchAll(callRegex)) {
      addFixtureRef(refs, workspaceDir, testFilePath, directory, match[1])
    }
  }

  const directPathRegex = /fixtures\/morgue\/(focused|full)\/([^'"`]+\.txt)/g
  for (const match of content.matchAll(directPathRegex)) {
    addFixtureRef(refs, workspaceDir, testFilePath, match[1] as FixtureDirectory, match[2])
  }

  if (content.includes("readdirSync(path.resolve(process.cwd(), '../../fixtures/morgue/full'))")) {
    const fullFixtureDir = path.resolve(workspaceDir, '../../fixtures/morgue/full')
    for (const name of readdirSync(fullFixtureDir).filter((entry) => entry.endsWith('.txt')).sort()) {
      addFixtureRef(refs, workspaceDir, testFilePath, 'full', name)
    }
  }
}

export function collectTestReferencedFixtures(
  options: Pick<WorkspaceOptions, 'workspaceDir'> = {},
): FixtureReference[] {
  const workspaceDir = options.workspaceDir ?? process.cwd()
  const testDir = path.resolve(workspaceDir, 'test')
  const refs = new Map<string, FixtureReference>()

  for (const filePath of listFilesRecursive(testDir).filter((entry) => entry.endsWith('.test.ts')).sort()) {
    collectReferencedFixturesFromTestFile(workspaceDir, filePath, refs)
  }

  return [...refs.values()].sort((left, right) => {
    if (left.directory !== right.directory) {
      return left.directory.localeCompare(right.directory)
    }

    return left.name.localeCompare(right.name)
  })
}

function safeExtract<T>(extractor: () => T): T | null {
  try {
    return extractor()
  } catch {
    return null
  }
}

function collectEquipmentDetails(equipment: EquipmentSnapshot | null): EquipmentItemSnapshot[] {
  if (!equipment) {
    return []
  }

  return [
    ...(equipment.bodyArmourDetails ? [equipment.bodyArmourDetails] : []),
    ...(equipment.shieldDetails ? [equipment.shieldDetails] : []),
    ...(equipment.helmetDetails ?? []),
    ...(equipment.glovesDetails ?? []),
    ...(equipment.footwearDetails ?? []),
    ...(equipment.cloakDetails ?? []),
    ...(equipment.orbDetails ? [equipment.orbDetails] : []),
    ...(equipment.amuletDetails ?? []),
    ...(equipment.ringDetails ?? []),
    ...(equipment.gizmoDetails ? [equipment.gizmoDetails] : []),
    ...(equipment.talismanDetails ? [equipment.talismanDetails] : []),
  ]
}

function summarizeSkills(levels: SkillLevelsSnapshot | null): {
  nonZeroSkillCount: number
  topEffectiveSkills: Array<{
    name: string
    level: number
  }>
} {
  if (!levels) {
    return {
      nonZeroSkillCount: 0,
      topEffectiveSkills: [],
    }
  }

  const entries = Object.entries(levels)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      return left[0].localeCompare(right[0])
    })

  return {
    nonZeroSkillCount: entries.length,
    topEffectiveSkills: entries.slice(0, 3).map(([name, level]) => ({ name, level })),
  }
}

function countMutations(
  mutations: MutationEntrySnapshot[] | null,
): Pick<
  FixtureMetadataRecord['stats'],
  'mutationCount' | 'suppressedMutationCount' | 'transientMutationCount'
> {
  return {
    mutationCount: mutations?.length ?? 0,
    suppressedMutationCount: mutations?.filter((entry) => entry.suppressed).length ?? 0,
    transientMutationCount: mutations?.filter((entry) => entry.transient).length ?? 0,
  }
}

function countSpells(
  spells: SpellSnapshot[] | null,
): Pick<
  FixtureMetadataRecord['stats'],
  'spellCount' | 'memorizedSpellCount' | 'librarySpellCount' | 'unusableSpellCount'
> {
  return {
    spellCount: spells?.length ?? 0,
    memorizedSpellCount: spells?.filter((spell) => spell.memorized).length ?? 0,
    librarySpellCount: spells?.filter((spell) => !spell.memorized).length ?? 0,
    unusableSpellCount: spells?.filter((spell) => !spell.castable).length ?? 0,
  }
}

function featureTags(input: {
  expectedJson: string | null
  parseStatus: 'success' | 'failure'
  spellCount: number
  mutationCount: number
  form: string | null
  talisman: string | null
  hauntedEquipmentCount: number
  meldedEquipmentCount: number
  ringCount: number
}): string[] {
  const tags: string[] = []

  if (input.expectedJson) {
    tags.push('golden')
  }
  if (input.parseStatus === 'failure') {
    tags.push('partial-only')
  }
  if (input.spellCount > 0) {
    tags.push('spells')
  }
  if (input.mutationCount > 0) {
    tags.push('mutations')
  }
  if (input.form) {
    tags.push('form')
  }
  if (input.talisman && input.talisman !== 'none') {
    tags.push('talisman')
  }
  if (input.hauntedEquipmentCount > 0) {
    tags.push('haunted-equipment')
  }
  if (input.meldedEquipmentCount > 0) {
    tags.push('melded-equipment')
  }
  if (input.ringCount > 2) {
    tags.push('octopode-ring-layout')
  }

  return tags
}

function buildFixtureMetadataRecord(
  workspaceDir: string,
  ref: FixtureReference,
): FixtureMetadataRecord {
  const fixturePath = path.resolve(workspaceDir, `../../fixtures/morgue/${ref.directory}/${ref.name}`)
  const expectedJsonPath = path.resolve(
    workspaceDir,
    `../../fixtures/morgue/expected/${ref.directory}-${ref.name.replace(/\.txt$/i, '.json')}`,
  )
  const expectedJson = existsSync(expectedJsonPath)
    ? toPosixRelative(path.resolve(workspaceDir, '../..'), expectedJsonPath)
    : null
  const text = readFileSync(fixturePath, 'utf8')
  const parsed = parseMorgueText(text)
  const baseStats = safeExtract(() => extractBaseStats(text))
  const equipment = safeExtract(() => extractEquipment(text))
  const form = safeExtract(() => extractForm(text))
  const mutations = safeExtract(() => extractMutations(text))
  const spells = safeExtract(() => extractSpells(text))
  const skills = safeExtract(() => extractSkills(text))

  const fullRecord = parsed.ok ? parsed.record : null
  const effectiveSkills = fullRecord?.effectiveSkills ?? skills?.effectiveSkills ?? null
  const skillSummary = summarizeSkills(effectiveSkills)
  const equipmentDetails = collectEquipmentDetails(equipment ?? null)
  const hauntedEquipmentCount = equipmentDetails.filter((item) => item.equipState === 'haunted').length
  const meldedEquipmentCount = equipmentDetails.filter((item) => item.equipState === 'melded').length
  const spellCounts = countSpells(fullRecord?.spells ?? spells)
  const mutationCounts = countMutations(fullRecord?.mutations ?? mutations?.mutations ?? null)
  const talisman = fullRecord?.talisman ?? equipment?.talisman ?? null
  const formName = fullRecord?.form ?? form?.form ?? null
  const ringCount = fullRecord?.rings.length ?? equipment?.rings.length ?? 0

  const stats: FixtureMetadataRecord['stats'] = {
    playerName: fullRecord?.playerName ?? baseStats?.playerName ?? null,
    version: fullRecord?.version ?? baseStats?.version ?? null,
    species: fullRecord?.species ?? baseStats?.species ?? null,
    speciesVariant: fullRecord?.speciesVariant ?? baseStats?.speciesVariant ?? null,
    background: fullRecord?.background ?? baseStats?.background ?? null,
    god: fullRecord?.god ?? baseStats?.god ?? null,
    xl: fullRecord?.xl ?? baseStats?.xl ?? null,
    form: formName,
    talisman,
    spellCount: spellCounts.spellCount,
    memorizedSpellCount: spellCounts.memorizedSpellCount,
    librarySpellCount: spellCounts.librarySpellCount,
    unusableSpellCount: spellCounts.unusableSpellCount,
    mutationCount: mutationCounts.mutationCount,
    suppressedMutationCount: mutationCounts.suppressedMutationCount,
    transientMutationCount: mutationCounts.transientMutationCount,
    nonZeroSkillCount: skillSummary.nonZeroSkillCount,
    topEffectiveSkills: skillSummary.topEffectiveSkills,
    ringCount,
    helmetCount: fullRecord?.helmets.length ?? equipment?.helmets.length ?? 0,
    gloveCount: fullRecord?.gloves.length ?? equipment?.gloves.length ?? 0,
    footwearCount: fullRecord?.footwear.length ?? equipment?.footwear.length ?? 0,
    cloakCount: fullRecord?.cloaks.length ?? equipment?.cloaks.length ?? 0,
    hauntedEquipmentCount,
    meldedEquipmentCount,
  }

  return {
    directory: ref.directory,
    name: ref.name,
    relativePath: `fixtures/morgue/${ref.directory}/${ref.name}`,
    expectedJson,
    testFiles: [...ref.testFiles].sort(),
    parseStatus: parsed.ok ? 'success' : 'failure',
    parseFailureReason: parsed.ok ? null : parsed.failure.reason,
    tags: featureTags({
      expectedJson,
      parseStatus: parsed.ok ? 'success' : 'failure',
      spellCount: stats.spellCount,
      mutationCount: stats.mutationCount,
      form: stats.form,
      talisman: stats.talisman,
      hauntedEquipmentCount: stats.hauntedEquipmentCount,
      meldedEquipmentCount: stats.meldedEquipmentCount,
      ringCount: stats.ringCount,
    }),
    stats,
  }
}

function incrementCount(map: Map<string, number>, key: string | null) {
  if (!key) {
    return
  }

  map.set(key, (map.get(key) ?? 0) + 1)
}

function sortCountRecord(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((left, right) => left[0].localeCompare(right[0])))
}

function classifyVersionBucket(version: string | null): '0.34' | '0.35-trunk' | 'unknown' {
  if (!version) {
    return 'unknown'
  }
  if (version.startsWith('0.34.')) {
    return '0.34'
  }
  if (version.startsWith('0.35')) {
    return '0.35-trunk'
  }
  return 'unknown'
}

export function buildFixtureMetadataReport(options: WorkspaceOptions = {}): FixtureMetadataReport {
  const workspaceDir = options.workspaceDir ?? process.cwd()
  const refs = collectTestReferencedFixtures({ workspaceDir })
  const fixtures = refs.map((ref) => buildFixtureMetadataRecord(workspaceDir, ref))

  const featureCounts = new Map<string, number>()
  const speciesCounts = new Map<string, number>()
  const backgroundCounts = new Map<string, number>()
  const godCounts = new Map<string, number>()

  for (const fixture of fixtures) {
    for (const tag of fixture.tags) {
      featureCounts.set(tag, (featureCounts.get(tag) ?? 0) + 1)
    }
    incrementCount(speciesCounts, fixture.stats.species)
    incrementCount(backgroundCounts, fixture.stats.background)
    incrementCount(godCounts, fixture.stats.god)
  }

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: 'test-referenced-fixtures',
    summary: {
      fixtureCount: fixtures.length,
      focusedCount: fixtures.filter((fixture) => fixture.directory === 'focused').length,
      fullCount: fixtures.filter((fixture) => fixture.directory === 'full').length,
      goldenFixtureCount: fixtures.filter((fixture) => fixture.expectedJson).length,
      parseSuccessCount: fixtures.filter((fixture) => fixture.parseStatus === 'success').length,
      parseFailureCount: fixtures.filter((fixture) => fixture.parseStatus === 'failure').length,
      featureCounts: sortCountRecord(featureCounts),
      speciesCounts: sortCountRecord(speciesCounts),
      backgroundCounts: sortCountRecord(backgroundCounts),
      godCounts: sortCountRecord(godCounts),
    },
    fixtures,
  }
}

export function summarizeFixtureMetadataReport(
  report: FixtureMetadataReport,
): FixtureMetadataSummaryReport {
  const versionCounts: FixtureMetadataSummaryReport['summary']['versionCounts'] = {
    '0.34': 0,
    '0.35-trunk': 0,
    unknown: 0,
  }

  for (const fixture of report.fixtures) {
    versionCounts[classifyVersionBucket(fixture.stats.version)] += 1
  }

  return {
    generatedAt: report.generatedAt,
    source: report.source,
    summary: {
      fixtureCount: report.summary.fixtureCount,
      focusedCount: report.summary.focusedCount,
      fullCount: report.summary.fullCount,
      goldenFixtureCount: report.summary.goldenFixtureCount,
      parseSuccessCount: report.summary.parseSuccessCount,
      parseFailureCount: report.summary.parseFailureCount,
      featureCounts: report.summary.featureCounts,
      versionCounts,
    },
    ...(report.crawlSourceCoverage ? { crawlSourceCoverage: report.crawlSourceCoverage } : {}),
  }
}

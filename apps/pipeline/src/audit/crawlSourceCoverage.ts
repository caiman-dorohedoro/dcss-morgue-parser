import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { FixtureMetadataRecord } from './buildFixtureMetadata'

export type CoverageBucket = '0.34' | '0.35-trunk'

export type CoverageDomainSummary = {
  availableCount: number
  coveredCount: number
  zeroCount: number
  counts: Record<string, number>
}

export type CoverageBucketSummary = {
  crawlSource: {
    label: string
    targetMajorVersion: number
  }
  fixtureCount: number
  species: CoverageDomainSummary
  backgrounds: CoverageDomainSummary
  gods: CoverageDomainSummary
}

export type CrawlSourceCoverageSummary = {
  versions: Record<CoverageBucket, CoverageBucketSummary>
}

type GitHubContentEntry = {
  name: string
  type: string
  download_url: string | null
}

type PlayableYamlEntry = {
  name: string
  targetMajorVersion: number | null
  isPlayable: boolean
}

const GITHUB_API_BASE = 'https://api.github.com/repos/crawl/crawl/contents'
const GITHUB_HEADERS = {
  'User-Agent': 'dcss-morgue-parser',
  Accept: 'application/vnd.github+json',
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function extractTopLevelString(raw: string, key: string): string | null {
  const match = raw.match(new RegExp(`^${key}:\\s*(?:"([^"]+)"|([^\\n#]+))`, 'm'))
  return match ? (match[1] ?? match[2]).trim() : null
}

function extractTopLevelBoolean(raw: string, key: string): boolean | null {
  const value = extractTopLevelString(raw, key)
  if (value === null) {
    return null
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return null
}

function extractTopLevelInteger(raw: string, key: string): number | null {
  const value = extractTopLevelString(raw, key)
  if (value === null || !/^-?\d+$/.test(value)) {
    return null
  }
  return Number.parseInt(value, 10)
}

function extractTopLevelList(raw: string, key: string): string[] {
  const lines = raw.split('\n')
  const results: string[] = []
  let inSection = false

  for (const line of lines) {
    if (!inSection) {
      if (line.startsWith(`${key}:`)) {
        inSection = true
      }
      continue
    }

    if (!line.trim()) {
      continue
    }
    if (!line.startsWith('  ')) {
      break
    }

    const trimmed = line.trim()
    if (!trimmed.startsWith('- ')) {
      continue
    }

    results.push(trimmed.slice(2).trim().replace(/^"(.*)"$/, '$1'))
  }

  return results
}

export function parsePlayableJobYaml(raw: string, targetMajorVersion: number): PlayableYamlEntry | null {
  const sourceMajor = extractTopLevelInteger(raw, 'TAG_MAJOR_VERSION')
  if (sourceMajor !== null && sourceMajor !== targetMajorVersion) {
    return null
  }

  const name = extractTopLevelString(raw, 'name')
  if (!name) {
    return null
  }

  const difficulty = extractTopLevelBoolean(raw, 'difficulty')
  const recommendedSpecies = extractTopLevelList(raw, 'recommended_species')

  return {
    name,
    targetMajorVersion: sourceMajor,
    isPlayable: difficulty !== false && recommendedSpecies.length > 0,
  }
}

export function parsePlayableSpeciesYaml(
  raw: string,
  targetMajorVersion: number,
): PlayableYamlEntry | null {
  const sourceMajor = extractTopLevelInteger(raw, 'TAG_MAJOR_VERSION')
  if (sourceMajor !== null && sourceMajor !== targetMajorVersion) {
    return null
  }

  const name = extractTopLevelString(raw, 'name')
  if (!name) {
    return null
  }

  const difficulty = extractTopLevelBoolean(raw, 'difficulty')
  const recommendedJobs = extractTopLevelList(raw, 'recommended_jobs')

  return {
    name,
    targetMajorVersion: sourceMajor,
    isPlayable: difficulty !== false && recommendedJobs.length > 0,
  }
}

export function preprocessByTagMajor(raw: string, targetMajorVersion: number): string {
  const lines = raw.split('\n')
  const output: string[] = []
  const stack: boolean[] = []

  for (const line of lines) {
    const ifMatch = line.match(/^#if\s+TAG_MAJOR_VERSION\s*==\s*(\d+)\s*$/)
    if (ifMatch) {
      stack.push(Number.parseInt(ifMatch[1], 10) === targetMajorVersion)
      continue
    }

    if (/^#else\b/.test(line)) {
      const current = stack.pop()
      stack.push(current === undefined ? false : !current)
      continue
    }

    if (/^#endif\b/.test(line)) {
      stack.pop()
      continue
    }

    if (stack.every(Boolean)) {
      output.push(line)
    }
  }

  return output.join('\n')
}

export function extractGodNames(
  godTypeRaw: string,
  religionRaw: string,
  targetMajorVersion: number,
): string[] {
  const filteredGodType = preprocessByTagMajor(godTypeRaw, targetMajorVersion)
  const filteredReligion = preprocessByTagMajor(religionRaw, targetMajorVersion)

  const enumNames = new Set<string>()
  const nameMap = new Map<string, string>()

  const enumMatch = filteredGodType.match(/enum god_type\s*\{([\s\S]*?)NUM_GODS,/)
  if (enumMatch) {
    for (const match of enumMatch[1].matchAll(/\b(GOD_[A-Z_]+)\b/g)) {
      const godId = match[1]
      if (
        godId === 'GOD_NO_GOD'
        || godId === 'GOD_RANDOM'
        || godId === 'GOD_NAMELESS'
        || godId === 'GOD_ECUMENICAL'
      ) {
        continue
      }
      enumNames.add(godId)
    }
  }

  const godNameSwitchBody =
    filteredReligion.match(/string god_name\(god_type which_god, bool long_name\)[\s\S]*?switch\s*\(which_god\)\s*\{([\s\S]*?)case NUM_GODS:/)?.[1]
    ?? filteredReligion.match(/switch\s*\(which_god\)\s*\{([\s\S]*)\}\s*$/)?.[1]
    ?? ''

  for (const match of godNameSwitchBody.matchAll(/case\s+(GOD_[A-Z_]+):\s+return\s+"([^"]+)";/g)) {
    const godId = match[1]
    const godName = match[2]

    if (
      godId === 'GOD_NO_GOD'
      || godId === 'GOD_RANDOM'
      || godId === 'GOD_NAMELESS'
      || godId === 'GOD_ECUMENICAL'
      || godId === 'GOD_JIYVA'
      || godName === 'an unknown god'
      || godName === 'Buggy'
    ) {
      continue
    }

    nameMap.set(godId, godName)
  }

  if (enumNames.has('GOD_JIYVA')) {
    nameMap.set('GOD_JIYVA', 'Jiyva')
  }

  return uniqueSorted(
    [...enumNames]
      .map((godId) => nameMap.get(godId))
      .filter((name): name is string => Boolean(name)),
  )
}

function normalizeBucketFromVersion(version: string | null): CoverageBucket | null {
  if (!version) {
    return null
  }
  if (version.startsWith('0.34.')) {
    return '0.34'
  }
  if (version.startsWith('0.35')) {
    return '0.35-trunk'
  }
  return null
}

function summarizeCounts(availableNames: string[], seenValues: Array<string | null>): CoverageDomainSummary {
  const counts = Object.fromEntries(availableNames.map((name) => [name, 0])) as Record<string, number>

  for (const value of seenValues) {
    if (!value) {
      continue
    }
    if (!(value in counts)) {
      continue
    }
    counts[value] += 1
  }

  const coveredCount = Object.values(counts).filter((count) => count > 0).length

  return {
    availableCount: availableNames.length,
    coveredCount,
    zeroCount: availableNames.length - coveredCount,
    counts,
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: GITHUB_HEADERS })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return (await response.json()) as T
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: GITHUB_HEADERS })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return await response.text()
}

async function loadRemoteYamlNames(
  dirPath: string,
  ref: string,
  parser: (raw: string, targetMajorVersion: number) => PlayableYamlEntry | null,
  targetMajorVersion: number,
): Promise<string[]> {
  const entries = await fetchJson<GitHubContentEntry[]>(`${GITHUB_API_BASE}/${dirPath}?ref=${ref}`)
  const yamlEntries = entries.filter((entry) => entry.type === 'file' && entry.name.endsWith('.yaml'))
  const texts = await Promise.all(
    yamlEntries.map(async (entry) => ({
      name: entry.name,
      text: entry.download_url ? await fetchText(entry.download_url) : '',
    })),
  )

  return uniqueSorted(
    texts
      .map((entry) => parser(entry.text, targetMajorVersion))
      .filter((entry): entry is PlayableYamlEntry => entry !== null && entry.isPlayable)
      .map((entry) => entry.name),
  )
}

function loadLocalYamlNames(
  dirPath: string,
  parser: (raw: string, targetMajorVersion: number) => PlayableYamlEntry | null,
  targetMajorVersion: number,
): string[] {
  const filePaths = readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.yaml'))
    .map((entry) => path.resolve(dirPath, entry))

  return uniqueSorted(
    filePaths
      .map((filePath) => parser(readFileSync(filePath, 'utf8'), targetMajorVersion))
      .filter((entry): entry is PlayableYamlEntry => entry !== null && entry.isPlayable)
      .map((entry) => entry.name),
  )
}

async function loadRemoteGodNames(ref: string, targetMajorVersion: number): Promise<string[]> {
  const [godTypeRaw, religionRaw] = await Promise.all([
    fetchText(`https://raw.githubusercontent.com/crawl/crawl/${ref}/crawl-ref/source/god-type.h`),
    fetchText(`https://raw.githubusercontent.com/crawl/crawl/${ref}/crawl-ref/source/religion.cc`),
  ])

  return extractGodNames(godTypeRaw, religionRaw, targetMajorVersion)
}

function loadLocalGodNames(sourceDir: string, targetMajorVersion: number): string[] {
  return extractGodNames(
    readFileSync(path.resolve(sourceDir, 'god-type.h'), 'utf8'),
    readFileSync(path.resolve(sourceDir, 'religion.cc'), 'utf8'),
    targetMajorVersion,
  )
}

export async function buildCrawlSourceCoverageSummary(
  fixtures: FixtureMetadataRecord[],
  options: {
    crawlSourceDir?: string
  } = {},
): Promise<CrawlSourceCoverageSummary> {
  const crawlSourceDir =
    options.crawlSourceDir ?? path.resolve(process.cwd(), '../../crawl/crawl-ref/source')

  const localJobsDir = path.resolve(crawlSourceDir, 'dat/jobs')
  const localSpeciesDir = path.resolve(crawlSourceDir, 'dat/species')

  const [jobs034, species034, gods034] = await Promise.all([
    loadRemoteYamlNames('crawl-ref/source/dat/jobs', '0.34.1', parsePlayableJobYaml, 34),
    loadRemoteYamlNames('crawl-ref/source/dat/species', '0.34.1', parsePlayableSpeciesYaml, 34),
    loadRemoteGodNames('0.34.1', 34),
  ])

  const jobs035 = loadLocalYamlNames(localJobsDir, parsePlayableJobYaml, 35)
  const species035 = loadLocalYamlNames(localSpeciesDir, parsePlayableSpeciesYaml, 35)
  const gods035 = loadLocalGodNames(crawlSourceDir, 35)

  const bucketedFixtures = new Map<CoverageBucket, FixtureMetadataRecord[]>([
    ['0.34', []],
    ['0.35-trunk', []],
  ])

  for (const fixture of fixtures) {
    const bucket = normalizeBucketFromVersion(fixture.stats.version)
    if (bucket) {
      bucketedFixtures.get(bucket)?.push(fixture)
    }
  }

  const fixtures034 = bucketedFixtures.get('0.34') ?? []
  const fixtures035 = bucketedFixtures.get('0.35-trunk') ?? []

  return {
    versions: {
      '0.34': {
        crawlSource: {
          label: 'crawl tag 0.34.1',
          targetMajorVersion: 34,
        },
        fixtureCount: fixtures034.length,
        species: summarizeCounts(species034, fixtures034.map((fixture) => fixture.stats.species)),
        backgrounds: summarizeCounts(jobs034, fixtures034.map((fixture) => fixture.stats.background)),
        gods: summarizeCounts(gods034, fixtures034.map((fixture) => fixture.stats.god)),
      },
      '0.35-trunk': {
        crawlSource: {
          label: 'local crawl master (TAG_MAJOR_VERSION=35 rules)',
          targetMajorVersion: 35,
        },
        fixtureCount: fixtures035.length,
        species: summarizeCounts(species035, fixtures035.map((fixture) => fixture.stats.species)),
        backgrounds: summarizeCounts(jobs035, fixtures035.map((fixture) => fixture.stats.background)),
        gods: summarizeCounts(gods035, fixtures035.map((fixture) => fixture.stats.god)),
      },
    },
  }
}

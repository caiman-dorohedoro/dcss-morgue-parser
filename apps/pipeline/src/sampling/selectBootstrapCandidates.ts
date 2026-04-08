import { createHash } from 'node:crypto'
import { isExcludedModeCandidate } from '../discovery/parseXlogLine'
import type { CandidateFilterOptions, CandidateGame, SamplingMode } from '../types'

export type CandidateSamplingOptions = {
  perBucket: number
  filters?: CandidateFilterOptions
  skipFirst?: number
  sampleMode?: SamplingMode
  sampleSeed?: string
}

function normalizeFilterValue(value: string): string {
  return value.trim().toLowerCase()
}

function matchesChoice(candidateValue: string | null, requested: readonly string[] | undefined): boolean {
  if (!requested || requested.length === 0) {
    return true
  }

  const normalizedCandidate = candidateValue ? normalizeFilterValue(candidateValue) : null

  return requested.some((value) => {
    const normalizedValue = normalizeFilterValue(value)

    if (normalizedValue === 'none') {
      return normalizedCandidate === null
    }

    return normalizedCandidate === normalizedValue
  })
}

export function matchesCandidateFilters(
  candidate: CandidateGame,
  filters: CandidateFilterOptions | undefined,
): boolean {
  if (isExcludedModeCandidate(candidate)) {
    return false
  }

  if (filters?.minXl !== undefined && (candidate.xl === null || candidate.xl < filters.minXl)) {
    return false
  }

  if (!matchesChoice(candidate.species, filters?.species)) {
    return false
  }

  if (!matchesChoice(candidate.background, filters?.backgrounds)) {
    return false
  }

  if (!matchesChoice(candidate.god, filters?.gods)) {
    return false
  }

  return true
}

function getCandidateOrderKey(
  candidate: CandidateGame,
  sampleMode: SamplingMode,
  sampleSeed: string | undefined,
): string {
  if (sampleMode === 'deterministic') {
    return candidate.candidateId
  }

  if (!sampleSeed) {
    throw new Error('Random sampling requires a sample seed')
  }

  return createHash('sha1').update(`${sampleSeed}:${candidate.candidateId}`).digest('hex')
}

function compareCandidates(
  left: CandidateGame,
  right: CandidateGame,
  sampleMode: SamplingMode,
  sampleSeed: string | undefined,
): number {
  const leftKey = getCandidateOrderKey(left, sampleMode, sampleSeed)
  const rightKey = getCandidateOrderKey(right, sampleMode, sampleSeed)

  return leftKey.localeCompare(rightKey) || left.candidateId.localeCompare(right.candidateId)
}

function validateSamplingOptions(options: CandidateSamplingOptions, sampleMode: SamplingMode) {
  if (sampleMode === 'random' && (options.skipFirst ?? 0) > 0) {
    throw new Error('--skip-first is only supported with deterministic sampling')
  }
}

export function selectBootstrapCandidates(
  candidates: CandidateGame[],
  options: CandidateSamplingOptions,
): CandidateGame[] {
  const sampleMode = options.sampleMode ?? 'deterministic'
  validateSamplingOptions(options, sampleMode)

  const buckets = new Map<string, CandidateGame[]>()

  for (const candidate of candidates.filter((item) => matchesCandidateFilters(item, options.filters))) {
    const bucketKey = `${candidate.serverId}:${candidate.version}`
    const bucket = buckets.get(bucketKey) ?? []
    bucket.push(candidate)
    buckets.set(bucketKey, bucket)
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, bucket]) =>
      bucket
        .sort((left, right) => compareCandidates(left, right, sampleMode, options.sampleSeed))
        .slice(options.skipFirst ?? 0, (options.skipFirst ?? 0) + options.perBucket),
    )
}

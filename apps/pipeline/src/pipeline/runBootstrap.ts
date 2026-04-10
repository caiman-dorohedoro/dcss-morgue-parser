import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ACTIVE_SERVER_IDS, getServerManifest } from '../config/manifest'
import { candidateRepo, migrate, offsetRepo, parseResultRepo } from '../db/repos'
import type { Database } from '../db/openDb'
import { discoverCandidates as defaultDiscoverCandidates } from '../discovery/discoverCandidates'
import { backfillLogfile, type ReadBackfillSlice, type ReadLogfileSlice } from '../discovery/syncLogfile'
import { fetchMorgue as defaultFetchMorgue } from '../fetch/fetchMorgue'
import { parseMorgue as defaultParseMorgue } from '../parser/parseMorgue'
import {
  matchesCandidateFilters,
  selectBootstrapCandidates,
} from '../sampling/selectBootstrapCandidates'
import type {
  CandidateFilterOptions,
  CandidateGame,
  ParseFailureRecord,
  ParseResultRow,
  SamplingMode,
  ServerId,
  TargetVersion,
} from '../types'

export type PipelineSummary = {
  selectedCandidates: number
  parsedSuccesses: number
  parsedFailures: number
}

type ExecuteSelectedCandidatesDetailedResult = PipelineSummary & {
  successfulCandidateIds: string[]
  failedCandidateIds: string[]
}

export type PipelineOptions = {
  perBucket: number
  since?: string
  minXl?: number
  species?: readonly string[]
  backgrounds?: readonly string[]
  gods?: readonly string[]
  skipFirst?: number
  sampleMode?: SamplingMode
  sampleSeed?: string
  serverIds?: readonly ServerId[]
  dryRun?: boolean
}

export type PipelineContext = {
  db: Database
  options: PipelineOptions
  paths?: {
    morguesDir?: string
    auditDir?: string
  }
  now?: () => string
  readLogfileSlice?: ReadLogfileSlice
  readBackfillSlice?: ReadBackfillSlice
  discoverCandidates?: () => Promise<unknown>
  fetchMorgue?: typeof defaultFetchMorgue
  parseMorgue?: typeof defaultParseMorgue
  readMorgueText?: (localPath: string) => Promise<string>
  log?: (message: string) => void
}

function getNow(ctx: PipelineContext): string {
  return ctx.now?.() ?? new Date().toISOString()
}

function formatUnexpectedError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function filterCandidatesByServerIds(
  candidates: CandidateGame[],
  serverIds: readonly ServerId[] | undefined,
): CandidateGame[] {
  if (!serverIds || serverIds.length === 0) {
    return candidates
  }

  const allowed = new Set(serverIds)
  return candidates.filter((candidate) => allowed.has(candidate.serverId))
}

function getBucketKey(candidate: Pick<CandidateGame, 'serverId' | 'version'>): string {
  return `${candidate.serverId}:${candidate.version}`
}

export function getCandidateFilters(
  options: Pick<PipelineOptions, 'minXl' | 'species' | 'backgrounds' | 'gods'>,
): CandidateFilterOptions {
  return {
    minXl: options.minXl,
    species: options.species,
    backgrounds: options.backgrounds,
    gods: options.gods,
  }
}

function getBootstrapEligibleCounts(
  db: Database,
  serverIds: readonly ServerId[] | undefined,
  filters: CandidateFilterOptions,
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const candidate of filterCandidatesByServerIds(candidateRepo.listBootstrapEligible(db), serverIds)) {
    if (!matchesCandidateFilters(candidate, filters)) {
      continue
    }

    const bucketKey = getBucketKey(candidate)
    counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1)
  }

  return counts
}

function getBootstrapTargetEligibleCount(
  options: Pick<PipelineOptions, 'perBucket' | 'skipFirst' | 'sampleMode'>,
): number {
  if ((options.sampleMode ?? 'deterministic') === 'random') {
    return options.perBucket
  }

  return options.perBucket + (options.skipFirst ?? 0)
}

async function runBootstrapBackfillPhase(ctx: PipelineContext) {
  if (!ctx.readBackfillSlice) {
    return
  }

  const targetServerIds = ctx.options.serverIds ?? ACTIVE_SERVER_IDS
  const bucketStates = new Map<
    string,
    {
      serverId: ServerId
      version: TargetVersion
      logfileUrl: string
      cursorBeforeByteExclusive: number
    }
  >()

  for (const serverId of targetServerIds) {
    const manifest = getServerManifest(serverId)

    for (const version of manifest.buckets) {
      const offset = offsetRepo.get(ctx.db, serverId, version, manifest.logfiles[version].url)?.byteOffset ?? 0
      bucketStates.set(`${serverId}:${version}`, {
        serverId,
        version,
        logfileUrl: manifest.logfiles[version].url,
        cursorBeforeByteExclusive: offset,
      })
    }
  }

  while (true) {
    const eligibleCounts = getBootstrapEligibleCounts(
      ctx.db,
      ctx.options.serverIds,
      getCandidateFilters(ctx.options),
    )
    const targetEligibleCount = getBootstrapTargetEligibleCount(ctx.options)
    const underfilled = [...bucketStates.values()].filter(
      (bucket) =>
        (eligibleCounts.get(`${bucket.serverId}:${bucket.version}`) ?? 0) < targetEligibleCount &&
        bucket.cursorBeforeByteExclusive > 0,
    )

    if (underfilled.length === 0) {
      return
    }

    let madeProgress = false

    for (const bucket of underfilled) {
      const bucketKey = `${bucket.serverId}:${bucket.version}`
      const before = bucket.cursorBeforeByteExclusive
      ctx.log?.(
        `[backfill] ${bucket.serverId}/${bucket.version} eligible=${eligibleCounts.get(bucketKey) ?? 0} target=${targetEligibleCount}; reading older logfile chunk before byte ${before}`,
      )

      const result = await backfillLogfile(ctx.db, {
        serverId: bucket.serverId,
        version: bucket.version,
        logfileUrl: bucket.logfileUrl,
        beforeByteExclusive: before,
        readBackfillSlice: ctx.readBackfillSlice,
        now: ctx.now,
      })

      if (!result) {
        bucket.cursorBeforeByteExclusive = 0
        continue
      }

      bucket.cursorBeforeByteExclusive = result.nextBeforeByteExclusive
      ctx.log?.(
        `[backfill] ${bucket.serverId}/${bucket.version} cursor ${result.previousBeforeByteExclusive} -> ${result.nextBeforeByteExclusive}; lines=${result.processedLines}, inserted=${result.insertedCandidates}, rejected=${result.rejectedLines}`,
      )

      if (
        result.nextBeforeByteExclusive < result.previousBeforeByteExclusive ||
        result.insertedCandidates > 0
      ) {
        madeProgress = true
      }
    }

    if (!madeProgress) {
      return
    }
  }
}

export async function runDiscoveryPhase(ctx: PipelineContext) {
  if (ctx.discoverCandidates) {
    await ctx.discoverCandidates()
    return
  }

  if (!ctx.readLogfileSlice) {
    return
  }

  await defaultDiscoverCandidates({
    db: ctx.db,
    readLogfileSlice: ctx.readLogfileSlice,
    now: ctx.now,
    serverIds: ctx.options.serverIds,
    log: ctx.log,
  })
}

export async function executeSelectedCandidates(
  ctx: PipelineContext,
  selectedCandidateIds: string[],
): Promise<PipelineSummary> {
  const { successfulCandidateIds: _successfulCandidateIds, failedCandidateIds: _failedCandidateIds, ...summary } =
    await executeSelectedCandidatesDetailed(ctx, selectedCandidateIds)

  return summary
}

export async function executeSelectedCandidatesDetailed(
  ctx: PipelineContext,
  selectedCandidateIds: string[],
): Promise<ExecuteSelectedCandidatesDetailedResult> {
  const fetchMorgue = ctx.fetchMorgue ?? defaultFetchMorgue
  const parseMorgue = ctx.parseMorgue ?? defaultParseMorgue
  const readMorgueText =
    ctx.readMorgueText ?? ((localPath: string) => readFile(localPath, 'utf8'))
  const candidates = candidateRepo
    .listAll(ctx.db)
    .filter((candidate) => selectedCandidateIds.includes(candidate.candidateId))
  const candidateIndex = new Map(
    selectedCandidateIds.map((candidateId, index) => [candidateId, index] as const),
  )
  const orderedCandidates = [...candidates].sort(
    (left, right) =>
      (candidateIndex.get(left.candidateId) ?? Number.MAX_SAFE_INTEGER) -
      (candidateIndex.get(right.candidateId) ?? Number.MAX_SAFE_INTEGER),
  )

  const candidatesByHost = new Map<string, CandidateGame[]>()
  for (const candidate of orderedCandidates) {
    const host = getServerManifest(candidate.serverId).host
    const hostCandidates = candidatesByHost.get(host) ?? []
    hostCandidates.push(candidate)
    candidatesByHost.set(host, hostCandidates)
  }

  async function processCandidate(
    candidate: CandidateGame,
    index: number,
  ): Promise<{ candidateId: string; success: boolean }> {
    ctx.log?.(
      `[candidate ${index + 1}/${orderedCandidates.length}] ${candidate.serverId}/${candidate.version} ${candidate.playerName} ended ${candidate.endedAt}`,
    )
    const fetchRow = await fetchMorgue(ctx.db, {
      candidate,
      rootDir: ctx.paths?.morguesDir ?? path.resolve(process.cwd(), 'data/morgues'),
      now: ctx.now,
    })

    if (fetchRow.fetchStatus !== 'success' || !fetchRow.localPath) {
      ctx.log?.(
        `[fetch] failed ${candidate.playerName}: ${fetchRow.lastError ?? fetchRow.fetchStatus} (${fetchRow.morgueUrl})`,
      )
      parseResultRepo.upsertFailure(ctx.db, {
        candidateId: candidate.candidateId,
        failureCode: 'morgue_fetch_failed',
        failureDetail: fetchRow.lastError ?? fetchRow.fetchStatus,
        parsedAt: getNow(ctx),
      })
      return {
        candidateId: candidate.candidateId,
        success: false,
      }
    }

    ctx.log?.(`[fetch] success ${candidate.playerName}: ${fetchRow.morgueUrl}`)

    let text: string

    try {
      text = await readMorgueText(fetchRow.localPath)
    } catch (error) {
      const detail = formatUnexpectedError(error)
      ctx.log?.(`[read] failed ${candidate.playerName}: ${detail} (${fetchRow.localPath})`)
      parseResultRepo.upsertFailure(ctx.db, {
        candidateId: candidate.candidateId,
        failureCode: 'morgue_read_failed',
        failureDetail: detail,
        parsedAt: getNow(ctx),
      })
      return {
        candidateId: candidate.candidateId,
        success: false,
      }
    }

    const result = parseMorgue(text, {
      candidateId: candidate.candidateId,
      serverId: candidate.serverId,
      playerName: candidate.playerName,
      sourceVersionLabel: candidate.sourceVersionLabel,
      endedAt: candidate.endedAt,
      morgueUrl: fetchRow.morgueUrl,
    })

    if (result.ok) {
      ctx.log?.(
        `[parse] success ${candidate.playerName}: species=${result.record.species}, ac=${result.record.ac}, ev=${result.record.ev}, sh=${result.record.sh}, spells=${result.record.spells.length}`,
      )
      parseResultRepo.upsertSuccess(ctx.db, {
        candidateId: candidate.candidateId,
        parsedJson: result.record,
        parsedAt: getNow(ctx),
      })
      return {
        candidateId: candidate.candidateId,
        success: true,
      }
    }

    ctx.log?.(
      `[parse] failure ${candidate.playerName}: ${result.failure.reason}${result.failure.detail ? ` (${result.failure.detail})` : ''}`,
    )
    parseResultRepo.upsertFailure(ctx.db, {
      candidateId: candidate.candidateId,
      failureCode: result.failure.reason,
      failureDetail: result.failure.detail,
      parsedAt: getNow(ctx),
    })
    return {
      candidateId: candidate.candidateId,
      success: false,
    }
  }

  const workerResults = await Promise.all(
    [...candidatesByHost.values()].map(async (hostCandidates) => {
      let successes = 0
      let failures = 0
      const processed: Array<{ candidateId: string; success: boolean }> = []

      for (const candidate of hostCandidates) {
        const result = await processCandidate(
          candidate,
          candidateIndex.get(candidate.candidateId) ?? 0,
        )
        processed.push(result)
        if (result.success) {
          successes += 1
        } else {
          failures += 1
        }
      }

      return { successes, failures, processed }
    }),
  )

  const parsedSuccesses = workerResults.reduce((sum, result) => sum + result.successes, 0)
  const parsedFailures = workerResults.reduce((sum, result) => sum + result.failures, 0)
  const successfulCandidateIds = workerResults.flatMap((result) =>
    result.processed.filter((processed) => processed.success).map((processed) => processed.candidateId),
  )
  const failedCandidateIds = workerResults.flatMap((result) =>
    result.processed.filter((processed) => !processed.success).map((processed) => processed.candidateId),
  )

  return {
    selectedCandidates: orderedCandidates.length,
    parsedSuccesses,
    parsedFailures,
    successfulCandidateIds,
    failedCandidateIds,
  }
}

export function splitParseResults(results: ParseResultRow[]): {
  successes: ParseResultRow[]
  failures: ParseResultRow[]
} {
  return {
    successes: results.filter((result) => result.parseStatus === 'success'),
    failures: results.filter((result) => result.parseStatus === 'failure'),
  }
}

export function toFailureRecord(failure: ParseFailureRecord): ParseFailureRecord {
  return failure
}

export async function runBootstrap(ctx: PipelineContext): Promise<PipelineSummary> {
  migrate(ctx.db)
  await runDiscoveryPhase(ctx)
  await runBootstrapBackfillPhase(ctx)

  const sampleMode = ctx.options.sampleMode ?? 'deterministic'
  const sampleSeed = sampleMode === 'random' ? (ctx.options.sampleSeed ?? randomUUID()) : undefined

  if (sampleMode === 'random') {
    ctx.log?.(`[bootstrap] random sampling seed ${sampleSeed}`)
  }

  const selected = selectBootstrapCandidates(
    filterCandidatesByServerIds(candidateRepo.listBootstrapEligible(ctx.db), ctx.options.serverIds),
    {
      perBucket: ctx.options.perBucket,
      filters: getCandidateFilters(ctx.options),
      skipFirst: ctx.options.skipFirst,
      sampleMode,
      sampleSeed,
    },
  )
  ctx.log?.(`[bootstrap] selected ${selected.length} candidates`)
  if (ctx.options.dryRun) {
    return {
      selectedCandidates: selected.length,
      parsedSuccesses: 0,
      parsedFailures: 0,
    }
  }

  const execution = await executeSelectedCandidatesDetailed(
    ctx,
    selected.map((candidate) => candidate.candidateId),
  )

  if (execution.successfulCandidateIds.length > 0) {
    candidateRepo.markBootstrapSampled(
      ctx.db,
      execution.successfulCandidateIds,
      getNow(ctx),
    )
  }

  return {
    selectedCandidates: execution.selectedCandidates,
    parsedSuccesses: execution.parsedSuccesses,
    parsedFailures: execution.parsedFailures,
  }
}

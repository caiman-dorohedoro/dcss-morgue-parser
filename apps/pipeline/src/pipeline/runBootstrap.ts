import { randomUUID } from 'node:crypto'
import { ACTIVE_SERVER_IDS, getServerManifest } from '../config/manifest'
import { candidateRepo, offsetRepo } from '../db/repos'
import type { Database } from '../db/openDb'
import { backfillLogfile } from '../discovery/syncLogfile'
import {
  matchesCandidateFilters,
  selectBootstrapCandidates,
} from '../sampling/selectBootstrapCandidates'
import type {
  CandidateFilterOptions,
  CandidateGame,
  ServerId,
  TargetVersion,
} from '../types'
import {
  executeSelectedCandidatesDetailed,
  filterCandidatesByServerIds,
  getCandidateFilters,
  getNow,
  preparePipelineRun,
  runDiscoveryPhase,
  type PipelineContext,
  type PipelineOptions,
  type PipelineSummary,
} from './shared'

function getBucketKey(candidate: Pick<CandidateGame, 'serverId' | 'version'>): string {
  return `${candidate.serverId}:${candidate.version}`
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

export { executeSelectedCandidates } from './shared'

export async function runBootstrap(ctx: PipelineContext): Promise<PipelineSummary> {
  preparePipelineRun(ctx)
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

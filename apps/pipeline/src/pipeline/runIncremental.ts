import { randomUUID } from 'node:crypto'
import { candidateRepo, migrate } from '../db/repos'
import { selectIncrementalCandidates } from '../sampling/selectIncrementalCandidates'
import {
  executeSelectedCandidates,
  filterCandidatesByServerIds,
  getCandidateFilters,
  runDiscoveryPhase,
  type PipelineContext,
  type PipelineSummary,
} from './runBootstrap'

export async function runIncremental(ctx: PipelineContext): Promise<PipelineSummary> {
  migrate(ctx.db)
  await runDiscoveryPhase(ctx)

  const since = ctx.options.since ?? new Date(0).toISOString()
  const sampleMode = ctx.options.sampleMode ?? 'deterministic'
  const sampleSeed = sampleMode === 'random' ? (ctx.options.sampleSeed ?? randomUUID()) : undefined

  if (sampleMode === 'random') {
    ctx.log?.(`[incremental] random sampling seed ${sampleSeed}`)
  }

  const selected = selectIncrementalCandidates(
    filterCandidatesByServerIds(candidateRepo.listIncrementalEligible(ctx.db, since), ctx.options.serverIds),
    {
      since,
      perBucket: ctx.options.perBucket,
      filters: getCandidateFilters(ctx.options),
      sampleMode,
      sampleSeed,
    },
  )
  ctx.log?.(`[incremental] selected ${selected.length} candidates since ${since}`)
  if (ctx.options.dryRun) {
    return {
      selectedCandidates: selected.length,
      parsedSuccesses: 0,
      parsedFailures: 0,
    }
  }

  const sampledAt = ctx.now?.() ?? new Date().toISOString()

  candidateRepo.markIncrementalSampled(
    ctx.db,
    selected.map((candidate) => candidate.candidateId),
    sampledAt,
  )

  return executeSelectedCandidates(
    ctx,
    selected.map((candidate) => candidate.candidateId),
  )
}

import { randomUUID } from 'node:crypto'
import { candidateRepo } from '../db/repos'
import { selectIncrementalCandidates } from '../sampling/selectIncrementalCandidates'
import {
  executeSelectedCandidatesDetailed,
  filterCandidatesByServerIds,
  getCandidateFilters,
  preparePipelineRun,
  runDiscoveryPhase,
  type PipelineContext,
  type PipelineSummary,
} from './shared'

export async function runIncremental(ctx: PipelineContext): Promise<PipelineSummary> {
  preparePipelineRun(ctx)
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

  const execution = await executeSelectedCandidatesDetailed(
    ctx,
    selected.map((candidate) => candidate.candidateId),
  )

  if (execution.successfulCandidateIds.length > 0) {
    candidateRepo.markIncrementalSampled(
      ctx.db,
      execution.successfulCandidateIds,
      ctx.now?.() ?? new Date().toISOString(),
    )
  }

  return {
    selectedCandidates: execution.selectedCandidates,
    parsedSuccesses: execution.parsedSuccesses,
    parsedFailures: execution.parsedFailures,
  }
}

import type { CandidateFilterOptions, CandidateGame, SamplingMode } from '../types'
import { selectBootstrapCandidates } from './selectBootstrapCandidates'

export function selectIncrementalCandidates(
  candidates: CandidateGame[],
  options: {
    since: string
    perBucket: number
    filters?: CandidateFilterOptions
    sampleMode?: SamplingMode
    sampleSeed?: string
  },
): CandidateGame[] {
  return selectBootstrapCandidates(
    candidates.filter((candidate) => candidate.discoveredAt >= options.since),
    {
      perBucket: options.perBucket,
      filters: options.filters,
      sampleMode: options.sampleMode,
      sampleSeed: options.sampleSeed,
    },
  )
}

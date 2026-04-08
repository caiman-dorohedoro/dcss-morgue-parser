import { describe, expect, it } from 'vitest'
import type { CandidateGame } from '../../src/types'
import { selectBootstrapCandidates } from '../../src/sampling/selectBootstrapCandidates'

function seedCandidate(
  candidateId: string,
  serverId: CandidateGame['serverId'],
  version: CandidateGame['version'],
  xl: CandidateGame['xl'] = 12,
  overrides: Partial<Pick<CandidateGame, 'species' | 'background' | 'god'>> = {},
): CandidateGame {
  return {
    candidateId,
    serverId,
    version,
    sourceVersionLabel: version === 'trunk' ? 'git' : version,
    playerName: candidateId,
    xl,
    species: overrides.species ?? null,
    background: overrides.background ?? null,
    god: overrides.god ?? null,
    endMessage: 'ok',
    startedAt: '2026-04-05T00:00:00.000Z',
    endedAt: '2026-04-05T01:00:00.000Z',
    logfileUrl: `https://example.test/${serverId}/${version}`,
    rawXlogLine: candidateId,
    discoveredAt: '2026-04-05T02:00:00.000Z',
    sampledBootstrapAt: null,
    sampledIncrementalAt: null,
  }
}

describe('selectBootstrapCandidates', () => {
  it('selects an even bootstrap sample across server/version buckets', () => {
    const candidates = [
      seedCandidate('cao34-1', 'CAO', '0.34'),
      seedCandidate('cao34-2', 'CAO', '0.34'),
      seedCandidate('cao34-3', 'CAO', '0.34'),
      seedCandidate('caogit-1', 'CAO', 'trunk'),
      seedCandidate('caogit-2', 'CAO', 'trunk'),
      seedCandidate('caogit-3', 'CAO', 'trunk'),
      seedCandidate('cbrg34-1', 'CBRG', '0.34'),
      seedCandidate('cbrg34-2', 'CBRG', '0.34'),
      seedCandidate('cbrg34-3', 'CBRG', '0.34'),
      seedCandidate('cbrggit-1', 'CBRG', 'trunk'),
      seedCandidate('cbrggit-2', 'CBRG', 'trunk'),
      seedCandidate('cbrggit-3', 'CBRG', 'trunk'),
    ]

    const selected = selectBootstrapCandidates(candidates, { perBucket: 2 })
    const counts = selected.reduce<Record<string, number>>((acc, candidate) => {
      const key = `${candidate.serverId}:${candidate.version}`
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    expect(counts).toEqual({
      'CAO:0.34': 2,
      'CAO:trunk': 2,
      'CBRG:0.34': 2,
      'CBRG:trunk': 2,
    })
  })

  it('filters excluded-mode candidates before applying per-bucket caps', () => {
    const selected = selectBootstrapCandidates(
      [
        {
          ...seedCandidate('cao34-wiz', 'CAO', '0.34'),
          rawXlogLine:
            'name=wizard:start=20260305000102S:v=0.34:end=20260305010203S:tmsg=ok:wizmode=1',
        },
        {
          ...seedCandidate('cao34-explore', 'CAO', '0.34'),
          rawXlogLine:
            'name=explorer:start=20260305000102S:v=0.34:end=20260305010203S:tmsg=entered explore mode:ktyp=exploremode',
        },
        seedCandidate('cao34-real', 'CAO', '0.34'),
        seedCandidate('cao34-real-2', 'CAO', '0.34'),
      ],
      { perBucket: 2 },
    )

    expect(selected.map((candidate) => candidate.candidateId)).toEqual([
      'cao34-real',
      'cao34-real-2',
    ])
  })

  it('filters candidates below a requested minimum xl', () => {
    const selected = selectBootstrapCandidates(
      [
        seedCandidate('cao34-low', 'CAO', '0.34', 9),
        seedCandidate('cao34-high', 'CAO', '0.34', 10),
        seedCandidate('caogit-high', 'CAO', 'trunk', 15),
        seedCandidate('caogit-missing', 'CAO', 'trunk', null),
      ],
      { perBucket: 2, filters: { minXl: 10 } },
    )

    expect(selected.map((candidate) => candidate.candidateId)).toEqual([
      'cao34-high',
      'caogit-high',
    ])
  })

  it('skips the first sorted candidates in each bucket before taking the sample', () => {
    const selected = selectBootstrapCandidates(
      [
        seedCandidate('cao34-1', 'CAO', '0.34'),
        seedCandidate('cao34-2', 'CAO', '0.34'),
        seedCandidate('cao34-3', 'CAO', '0.34'),
        seedCandidate('cao34-4', 'CAO', '0.34'),
        seedCandidate('caogit-1', 'CAO', 'trunk'),
        seedCandidate('caogit-2', 'CAO', 'trunk'),
        seedCandidate('caogit-3', 'CAO', 'trunk'),
        seedCandidate('caogit-4', 'CAO', 'trunk'),
      ],
      { perBucket: 2, skipFirst: 1 },
    )

    expect(selected.map((candidate) => candidate.candidateId)).toEqual([
      'cao34-2',
      'cao34-3',
      'caogit-2',
      'caogit-3',
    ])
  })

  it('filters by species, background, and god from xlog metadata', () => {
    const selected = selectBootstrapCandidates(
      [
        seedCandidate('cao34-defe', 'CAO', '0.34', 12, {
          species: 'Deep Elf',
          background: 'Fire Elementalist',
          god: 'Vehumet',
        }),
        seedCandidate('cao34-demk', 'CAO', '0.34', 12, {
          species: 'Deep Elf',
          background: 'Monk',
          god: 'Vehumet',
        }),
        seedCandidate('caogit-opsh', 'CAO', 'trunk', 12, {
          species: 'Octopode',
          background: 'Shapeshifter',
          god: null,
        }),
        seedCandidate('caogit-opfe', 'CAO', 'trunk', 12, {
          species: 'Octopode',
          background: 'Fire Elementalist',
          god: 'Ashenzari',
        }),
      ],
      {
        perBucket: 2,
        filters: {
          species: ['octopode'],
          backgrounds: ['Shapeshifter'],
          gods: ['none'],
        },
      },
    )

    expect(selected.map((candidate) => candidate.candidateId)).toEqual(['caogit-opsh'])
  })

  it('uses the provided seed to produce stable random samples', () => {
    const candidates = [
      seedCandidate('cao34-1', 'CAO', '0.34'),
      seedCandidate('cao34-2', 'CAO', '0.34'),
      seedCandidate('cao34-3', 'CAO', '0.34'),
      seedCandidate('cao34-4', 'CAO', '0.34'),
    ]

    const selectedA = selectBootstrapCandidates(candidates, {
      perBucket: 2,
      sampleMode: 'random',
      sampleSeed: 'seed-a',
    })
    const selectedARepeat = selectBootstrapCandidates(candidates, {
      perBucket: 2,
      sampleMode: 'random',
      sampleSeed: 'seed-a',
    })
    const selectedB = selectBootstrapCandidates(candidates, {
      perBucket: 2,
      sampleMode: 'random',
      sampleSeed: 'seed-b',
    })

    expect(selectedA.map((candidate) => candidate.candidateId)).toEqual(
      selectedARepeat.map((candidate) => candidate.candidateId),
    )
    expect(selectedA.map((candidate) => candidate.candidateId)).not.toEqual(
      selectedB.map((candidate) => candidate.candidateId),
    )
  })

  it('rejects skip-first when random sampling is requested', () => {
    expect(() =>
      selectBootstrapCandidates([seedCandidate('cao34-1', 'CAO', '0.34')], {
        perBucket: 1,
        sampleMode: 'random',
        sampleSeed: 'seed-a',
        skipFirst: 1,
      }),
    ).toThrow('--skip-first is only supported with deterministic sampling')
  })
})

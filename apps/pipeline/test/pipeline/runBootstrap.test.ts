import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { candidateRepo, createInMemoryDb, migrate, offsetRepo, parseResultRepo } from '../../src/db/repos'
import { writeAuditBundle } from '../../src/audit/writeAuditBundle'
import { executeSelectedCandidates, runBootstrap } from '../../src/pipeline/runBootstrap'
import type { CandidateGame, MorgueFetchRow } from '../../src/types'

function mockSkills() {
  return {
    fighting: 0,
    macesFlails: 0,
    axes: 0,
    polearms: 0,
    staves: 0,
    unarmedCombat: 0,
    throwing: 0,
    shortBlades: 0,
    longBlades: 0,
    rangedWeapons: 0,
    armour: 2.3,
    dodging: 8.1,
    shields: 0,
    stealth: 0,
    spellcasting: 12.4,
    conjurations: 0,
    hexes: 0,
    summonings: 0,
    necromancy: 0,
    forgecraft: 0,
    translocations: 0,
    transmutations: 0,
    alchemy: 0,
    fireMagic: 0,
    iceMagic: 0,
    airMagic: 0,
    earthMagic: 0,
    poisonMagic: 0,
    invocations: 0,
    evocations: 0,
    shapeshifting: 0,
  }
}

function seedCandidate(
  candidateId: string,
  serverId: CandidateGame['serverId'],
  version: CandidateGame['version'],
): CandidateGame {
  return {
    candidateId,
    serverId,
    version,
    sourceVersionLabel: version === 'trunk' ? 'git' : version,
    playerName: candidateId,
    xl: 12,
    species: null,
    background: null,
    god: null,
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

describe('runBootstrap', () => {
  it('runs bootstrap discovery -> sampling -> fetch -> parse -> store', async () => {
    const db = createInMemoryDb()
    const auditDir = await mkdtemp(path.join(os.tmpdir(), 'dcss-audit-'))

    const summary = await runBootstrap({
      db,
      options: { perBucket: 2 },
      paths: {
        auditDir,
        morguesDir: auditDir,
      },
      now: () => '2026-04-05T08:00:00.000Z',
      discoverCandidates: async () => {
        candidateRepo.insertMany(db, [
          seedCandidate('cao34-a', 'CAO', '0.34'),
          seedCandidate('cao34-b', 'CAO', '0.34'),
          seedCandidate('caogit-a', 'CAO', 'trunk'),
          seedCandidate('caogit-b', 'CAO', 'trunk'),
          seedCandidate('cbrg34-a', 'CBRG', '0.34'),
          seedCandidate('cbrg34-b', 'CBRG', '0.34'),
          seedCandidate('cbrggit-a', 'CBRG', 'trunk'),
          seedCandidate('cbrggit-b', 'CBRG', 'trunk'),
        ])
      },
      fetchMorgue: async (_db, input): Promise<MorgueFetchRow> => ({
        candidateId: input.candidate.candidateId,
        morgueUrl: `https://example.test/${input.candidate.candidateId}.txt`,
        fetchStatus: 'success',
        httpStatus: 200,
        localPath: '/virtual/morgue.txt',
        lastError: null,
        fetchedAt: '2026-04-05T08:00:00.000Z',
      }),
      readMorgueText: async () => 'fixture',
      parseMorgue: (_text, meta) => {
        const ok = meta.candidateId.endsWith('-a')
        if (ok) {
          return {
            ok: true as const,
            record: {
              candidateId: meta.candidateId,
              serverId: meta.serverId,
              playerName: meta.playerName,
              sourceVersionLabel: meta.sourceVersionLabel,
              endedAt: meta.endedAt,
              morgueUrl: meta.morgueUrl,
              version: '0.34' as const,
              species: 'Djinni',
              speciesVariant: null,
              background: null,
              xl: 7,
              ac: 4,
              ev: 11,
              sh: 0,
              strength: 8,
              intelligence: 19,
              dexterity: 14,
              bodyArmour: 'robe',
              shield: 'none',
              helmets: [],
              gloves: [],
              footwear: [],
              cloaks: [],
              orb: 'none',
              amulet: 'none',
              rings: [],
              talisman: 'none',
              form: null,
              skills: mockSkills(),
              effectiveSkills: mockSkills(),
              spells: [],
              mutations: [],
            },
          }
        }

        return {
          ok: false as const,
          failure: {
            reason: 'synthetic_parse_failed',
            detail: 'synthetic failure',
          },
        }
      },
    })

    expect(summary.selectedCandidates).toBe(8)
    expect(summary.parsedSuccesses + summary.parsedFailures).toBe(8)
    expect(parseResultRepo.listAll(db)).toHaveLength(8)

    const auditPath = await writeAuditBundle(
      {
        db,
        options: { perBucket: 2 },
        paths: { auditDir },
        now: () => '2026-04-05T08:00:00.000Z',
      },
      { sampleSize: 4 },
    )

    expect(path.basename(auditPath)).toMatch(/^audit-.*\.json$/)
  })

  it('processes different hosts in parallel while keeping host-local sequencing', async () => {
    const db = createInMemoryDb()
    migrate(db)
    candidateRepo.insertMany(db, [
      seedCandidate('cao34-a', 'CAO', '0.34'),
      seedCandidate('cbrg34-a', 'CBRG', '0.34'),
    ])

    let release!: () => void
    const releasePromise = new Promise<void>((resolve) => {
      release = resolve
    })
    const started: string[] = []

    const fetchMorgue = vi.fn(async (_db, input): Promise<MorgueFetchRow> => {
      started.push(input.candidate.serverId)
      await releasePromise

      return {
        candidateId: input.candidate.candidateId,
        morgueUrl: `https://example.test/${input.candidate.candidateId}.txt`,
        fetchStatus: 'success',
        httpStatus: 200,
        localPath: '/virtual/morgue.txt',
        lastError: null,
        fetchedAt: '2026-04-05T08:00:00.000Z',
      }
    })

    const runPromise = executeSelectedCandidates(
      {
        db,
        options: { perBucket: 1 },
        fetchMorgue,
        readMorgueText: async () => 'fixture',
        parseMorgue: (_text, meta) => ({
          ok: true as const,
          record: {
            candidateId: meta.candidateId,
            serverId: meta.serverId,
            playerName: meta.playerName,
            sourceVersionLabel: meta.sourceVersionLabel,
            endedAt: meta.endedAt,
            morgueUrl: meta.morgueUrl,
            version: '0.34' as const,
            species: 'Djinni',
            speciesVariant: null,
            background: null,
            xl: 7,
            ac: 4,
            ev: 11,
            sh: 0,
            strength: 8,
            intelligence: 19,
            dexterity: 14,
            bodyArmour: 'robe',
            shield: 'none',
            helmets: [],
            gloves: [],
            footwear: [],
            cloaks: [],
            orb: 'none',
            amulet: 'none',
            rings: [],
            talisman: 'none',
            form: null,
            skills: mockSkills(),
            effectiveSkills: mockSkills(),
            spells: [],
            mutations: [],
          },
        }),
      },
      ['cao34-a', 'cbrg34-a'],
    )

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(started.sort()).toEqual(['CAO', 'CBRG'])

    release()

    await expect(runPromise).resolves.toEqual({
      selectedCandidates: 2,
      parsedSuccesses: 2,
      parsedFailures: 0,
    })
  })

  it('backfills older logfile chunks when a bucket has too few discovered candidates', async () => {
    const db = createInMemoryDb()

    const summary = await runBootstrap({
      db,
      options: { perBucket: 2, serverIds: ['CAO'] },
      discoverCandidates: async () => {
        migrate(db)
        candidateRepo.insertMany(db, [seedCandidate('cao34-a', 'CAO', '0.34')])
        offsetRepo.upsert(db, {
          serverId: 'CAO',
          version: '0.34',
          logfileUrl: 'http://crawl.akrasiac.org/logfile34',
          byteOffset: 100,
        })
      },
      readBackfillSlice: async ({ beforeByteExclusive }) => {
        if (beforeByteExclusive !== 100) {
          return null
        }

        return {
          byteOffset: 50,
          text: 'name=cao34-b:start=20260305030405S:v=0.34:end=20260305040506S:tmsg=ok\n',
        }
      },
      fetchMorgue: async (_db, input): Promise<MorgueFetchRow> => ({
        candidateId: input.candidate.candidateId,
        morgueUrl: `https://example.test/${input.candidate.candidateId}.txt`,
        fetchStatus: 'success',
        httpStatus: 200,
        localPath: '/virtual/morgue.txt',
        lastError: null,
        fetchedAt: '2026-04-05T08:00:00.000Z',
      }),
      readMorgueText: async () => 'fixture',
      parseMorgue: (_text, meta) => ({
        ok: true as const,
        record: {
          candidateId: meta.candidateId,
          serverId: meta.serverId,
          playerName: meta.playerName,
          sourceVersionLabel: meta.sourceVersionLabel,
          endedAt: meta.endedAt,
          morgueUrl: meta.morgueUrl,
          version: '0.34' as const,
          species: 'Djinni',
          speciesVariant: null,
          background: null,
          xl: 7,
          ac: 4,
          ev: 11,
          sh: 0,
          strength: 8,
          intelligence: 19,
          dexterity: 14,
          bodyArmour: 'robe',
          shield: 'none',
          helmets: [],
          gloves: [],
          footwear: [],
          cloaks: [],
          orb: 'none',
          amulet: 'none',
          rings: [],
          talisman: 'none',
          form: null,
          skills: mockSkills(),
          effectiveSkills: mockSkills(),
          spells: [],
          mutations: [],
        },
      }),
    })

    expect(summary).toEqual({
      selectedCandidates: 2,
      parsedSuccesses: 2,
      parsedFailures: 0,
    })
  })

  it('treats skip-first as part of the bootstrap backfill target', async () => {
    const db = createInMemoryDb()
    const readBackfillSlice = vi.fn(async ({ beforeByteExclusive }: { beforeByteExclusive: number }) => {
      if (beforeByteExclusive === 100) {
        return {
          byteOffset: 50,
          text: 'name=cao34-b:start=20260305030405S:v=0.34:end=20260305040506S:tmsg=ok\n',
        }
      }

      if (beforeByteExclusive === 50) {
        return {
          byteOffset: 0,
          text: 'name=cao34-c:start=20260305050607S:v=0.34:end=20260305060708S:tmsg=ok\n',
        }
      }

      return null
    })

    const summary = await runBootstrap({
      db,
      options: { perBucket: 2, skipFirst: 1, serverIds: ['CAO'] },
      discoverCandidates: async () => {
        migrate(db)
        candidateRepo.insertMany(db, [seedCandidate('cao34-a', 'CAO', '0.34')])
        offsetRepo.upsert(db, {
          serverId: 'CAO',
          version: '0.34',
          logfileUrl: 'http://crawl.akrasiac.org/logfile34',
          byteOffset: 100,
        })
      },
      readBackfillSlice,
      fetchMorgue: async (_db, input): Promise<MorgueFetchRow> => ({
        candidateId: input.candidate.candidateId,
        morgueUrl: `https://example.test/${input.candidate.candidateId}.txt`,
        fetchStatus: 'success',
        httpStatus: 200,
        localPath: '/virtual/morgue.txt',
        lastError: null,
        fetchedAt: '2026-04-05T08:00:00.000Z',
      }),
      readMorgueText: async () => 'fixture',
      parseMorgue: (_text, meta) => ({
        ok: true as const,
        record: {
          candidateId: meta.candidateId,
          serverId: meta.serverId,
          playerName: meta.playerName,
          sourceVersionLabel: meta.sourceVersionLabel,
          endedAt: meta.endedAt,
          morgueUrl: meta.morgueUrl,
          version: '0.34' as const,
          species: 'Djinni',
          speciesVariant: null,
          background: null,
          xl: 7,
          ac: 4,
          ev: 11,
          sh: 0,
          strength: 8,
          intelligence: 19,
          dexterity: 14,
          bodyArmour: 'robe',
          shield: 'none',
          helmets: [],
          gloves: [],
          footwear: [],
          cloaks: [],
          orb: 'none',
          amulet: 'none',
          rings: [],
          talisman: 'none',
          form: null,
          skills: mockSkills(),
          effectiveSkills: mockSkills(),
          spells: [],
          mutations: [],
        },
      }),
    })

    expect(summary).toEqual({
      selectedCandidates: 2,
      parsedSuccesses: 2,
      parsedFailures: 0,
    })
    expect(readBackfillSlice).toHaveBeenCalledTimes(2)
    expect(readBackfillSlice.mock.calls.map(([input]) => input.beforeByteExclusive)).toEqual([100, 50])
    expect(parseResultRepo.listAll(db)).toHaveLength(2)
  })

  it('applies metadata filters when deciding whether bootstrap backfill is still needed', async () => {
    const db = createInMemoryDb()
    const readBackfillSlice = vi.fn(async ({ beforeByteExclusive }: { beforeByteExclusive: number }) => {
      if (beforeByteExclusive !== 100) {
        return null
      }

      return {
        byteOffset: 0,
        text: 'name=cao34-ok:race=Octopode:cls=Shapeshifter:start=20260305030405S:v=0.34:end=20260305040506S:tmsg=ok\n',
      }
    })

    const summary = await runBootstrap({
      db,
      options: {
        perBucket: 1,
        species: ['Octopode'],
        backgrounds: ['Shapeshifter'],
        serverIds: ['CAO'],
      },
      discoverCandidates: async () => {
        migrate(db)
        candidateRepo.insertMany(db, [
          {
            ...seedCandidate('cao34-miss', 'CAO', '0.34'),
            species: 'Deep Elf',
            background: 'Hedge Wizard',
          },
        ])
        offsetRepo.upsert(db, {
          serverId: 'CAO',
          version: '0.34',
          logfileUrl: 'http://crawl.akrasiac.org/logfile34',
          byteOffset: 100,
        })
      },
      readBackfillSlice,
      fetchMorgue: async (_db, input): Promise<MorgueFetchRow> => ({
        candidateId: input.candidate.candidateId,
        morgueUrl: `https://example.test/${input.candidate.candidateId}.txt`,
        fetchStatus: 'success',
        httpStatus: 200,
        localPath: '/virtual/morgue.txt',
        lastError: null,
        fetchedAt: '2026-04-05T08:00:00.000Z',
      }),
      readMorgueText: async () => 'fixture',
      parseMorgue: (_text, meta) => ({
        ok: true as const,
        record: {
          candidateId: meta.candidateId,
          serverId: meta.serverId,
          playerName: meta.playerName,
          sourceVersionLabel: meta.sourceVersionLabel,
          endedAt: meta.endedAt,
          morgueUrl: meta.morgueUrl,
          version: '0.34' as const,
          species: 'Djinni',
          speciesVariant: null,
          background: null,
          xl: 7,
          ac: 4,
          ev: 11,
          sh: 0,
          strength: 8,
          intelligence: 19,
          dexterity: 14,
          bodyArmour: 'robe',
          shield: 'none',
          helmets: [],
          gloves: [],
          footwear: [],
          cloaks: [],
          orb: 'none',
          amulet: 'none',
          rings: [],
          talisman: 'none',
          form: null,
          skills: mockSkills(),
          effectiveSkills: mockSkills(),
          spells: [],
          mutations: [],
        },
      }),
    })

    expect(summary).toEqual({
      selectedCandidates: 1,
      parsedSuccesses: 1,
      parsedFailures: 0,
    })
    expect(readBackfillSlice).toHaveBeenCalledTimes(1)
    const parsedCandidateIds = parseResultRepo.listAll(db).map((row) => row.candidateId)
    expect(parsedCandidateIds).toHaveLength(1)
    expect(parsedCandidateIds).not.toContain('cao34-miss')
    expect(
      candidateRepo.listAll(db).some(
        (candidate) =>
          candidate.playerName === 'cao34-ok' &&
          candidate.species === 'Octopode' &&
          candidate.background === 'Shapeshifter',
      ),
    ).toBe(true)
  })
})

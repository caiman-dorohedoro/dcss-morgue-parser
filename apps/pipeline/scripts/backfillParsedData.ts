import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseMorgueText } from 'dcss-morgue-parser'
import { migrate, openDb, parseResultRepo } from '../src/db/repos'
import { parseMorgue } from '../src/parser/parseMorgue'
import type { ServerId } from '../src/types'

type BackfillDbRow = {
  candidate_id: string
  server_id: string
  player_name: string
  source_version_label: string
  ended_at: string
  morgue_url: string
  local_path: string
}

type FileBackfillSummary = {
  scanned: number
  updated: number
}

type DbBackfillSummary = {
  scannedDbs: number
  updatedRows: number
  parseFailures: number
  missingLocalPaths: number
}

function resolveDataDir(inputPath: string | undefined): string {
  const requested = inputPath ?? 'data'
  const candidatePaths = [
    path.resolve(requested),
    path.resolve(process.cwd(), 'apps/pipeline', requested),
    path.resolve(process.cwd(), '../..', requested),
  ]

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return candidatePath
    }
  }

  throw new Error(`Could not resolve data directory from ${requested}`)
}

function collectFiles(rootDir: string, targetBaseName: string, results: string[] = []): string[] {
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.resolve(rootDir, entry.name)

    if (entry.isDirectory()) {
      collectFiles(entryPath, targetBaseName, results)
      continue
    }

    if (entry.isFile() && entry.name === targetBaseName) {
      results.push(entryPath)
    }
  }

  return results
}

function rewriteParsedJsonFiles(dataDir: string): FileBackfillSummary {
  const parsedJsonPaths = collectFiles(dataDir, 'parsed.json')

  for (const parsedPath of parsedJsonPaths) {
    const rawPath = path.resolve(path.dirname(parsedPath), 'raw.txt')
    const parsed = parseMorgueText(readFileSync(rawPath, 'utf8'))

    if (!parsed.ok) {
      throw new Error(
        `Current parser failed for ${rawPath}: ${parsed.failure.reason}${parsed.failure.detail ? ` (${parsed.failure.detail})` : ''}`,
      )
    }

    writeFileSync(parsedPath, `${JSON.stringify(parsed.record, null, 2)}\n`, 'utf8')
  }

  return {
    scanned: parsedJsonPaths.length,
    updated: parsedJsonPaths.length,
  }
}

function rewriteParseResults(dbPath: string): Omit<DbBackfillSummary, 'scannedDbs'> {
  const db = openDb(dbPath)
  migrate(db)

  try {
    const rows = db.prepare(
      `
        select
          candidate_games.candidate_id,
          candidate_games.server_id,
          candidate_games.player_name,
          candidate_games.source_version_label,
          candidate_games.ended_at,
          morgue_fetches.morgue_url,
          morgue_fetches.local_path
        from candidate_games
        join morgue_fetches using (candidate_id)
        where morgue_fetches.local_path is not null
        order by candidate_games.ended_at asc, candidate_games.candidate_id asc
      `,
    ).all() as BackfillDbRow[]

    let updatedRows = 0
    let parseFailures = 0
    let missingLocalPaths = 0

    for (const row of rows) {
      if (!existsSync(row.local_path)) {
        missingLocalPaths += 1
        continue
      }

      const text = readFileSync(row.local_path, 'utf8')
      const result = parseMorgue(text, {
        candidateId: row.candidate_id,
        serverId: row.server_id as ServerId,
        playerName: row.player_name,
        sourceVersionLabel: row.source_version_label,
        endedAt: row.ended_at,
        morgueUrl: row.morgue_url,
      })
      const parsedAt = new Date().toISOString()

      if (result.ok) {
        parseResultRepo.upsertSuccess(db, {
          candidateId: row.candidate_id,
          parsedJson: result.record,
          parsedAt,
        })
      } else {
        parseFailures += 1
        parseResultRepo.upsertFailure(db, {
          candidateId: row.candidate_id,
          failureCode: result.failure.reason,
          failureDetail: result.failure.detail,
          parsedAt,
        })
      }

      updatedRows += 1
    }

    return {
      updatedRows,
      parseFailures,
      missingLocalPaths,
    }
  } finally {
    db.close()
  }
}

function rewriteDbParseResults(dataDir: string): DbBackfillSummary {
  const dbPaths = collectFiles(dataDir, 'pipeline.sqlite')
  let updatedRows = 0
  let parseFailures = 0
  let missingLocalPaths = 0

  for (const dbPath of dbPaths) {
    const summary = rewriteParseResults(dbPath)
    updatedRows += summary.updatedRows
    parseFailures += summary.parseFailures
    missingLocalPaths += summary.missingLocalPaths
  }

  return {
    scannedDbs: dbPaths.length,
    updatedRows,
    parseFailures,
    missingLocalPaths,
  }
}

function main() {
  const dataDir = resolveDataDir(process.argv[2])
  const fileSummary = rewriteParsedJsonFiles(dataDir)
  const dbSummary = rewriteDbParseResults(dataDir)

  console.log(`Data dir: ${dataDir}`)
  console.log(`parsed.json files updated: ${fileSummary.updated}/${fileSummary.scanned}`)
  console.log(`pipeline.sqlite files scanned: ${dbSummary.scannedDbs}`)
  console.log(`parse_results rows updated: ${dbSummary.updatedRows}`)
  console.log(`parse_results parse failures: ${dbSummary.parseFailures}`)
  console.log(`parse_results missing local paths: ${dbSummary.missingLocalPaths}`)

  if (dbSummary.parseFailures > 0 || dbSummary.missingLocalPaths > 0) {
    process.exitCode = 1
  }
}

main()

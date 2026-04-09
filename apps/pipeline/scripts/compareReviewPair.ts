import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  compareReviewPair,
  formatReviewPairComparison,
} from '../src/audit/compareReviewPair'
import type { ParsedMorgueTextRecord } from '../../../packages/parser/src/types'

function resolveCaseDir(inputPath: string): string {
  const directPath = path.resolve(inputPath)
  if (existsSync(path.resolve(directPath, 'raw.txt')) && existsSync(path.resolve(directPath, 'parsed.json'))) {
    return directPath
  }

  const repoRootRelativePath = path.resolve(process.cwd(), '../..', inputPath)
  if (
    existsSync(path.resolve(repoRootRelativePath, 'raw.txt'))
    && existsSync(path.resolve(repoRootRelativePath, 'parsed.json'))
  ) {
    return repoRootRelativePath
  }

  return directPath
}

function main() {
  const caseDirArg = process.argv[2]

  if (!caseDirArg) {
    console.error('Usage: tsx scripts/compareReviewPair.ts <review-case-dir>')
    process.exit(1)
  }

  const caseDir = resolveCaseDir(caseDirArg)
  const rawPath = path.resolve(caseDir, 'raw.txt')
  const parsedPath = path.resolve(caseDir, 'parsed.json')
  const rawText = readFileSync(rawPath, 'utf8')
  const parsed = JSON.parse(readFileSync(parsedPath, 'utf8')) as ParsedMorgueTextRecord
  const result = compareReviewPair(rawText, parsed)

  console.log(`Raw: ${rawPath}`)
  console.log(`Parsed: ${parsedPath}`)
  console.log('')
  console.log(formatReviewPairComparison(result))
}

main()

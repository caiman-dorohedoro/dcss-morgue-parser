import path from 'node:path'
import process from 'node:process'
import { exportFullFixtureReview } from '../src/audit/exportFixtureReview'

function main() {
  const outputDirArg = process.argv[2]
  const outputDir = outputDirArg
    ? path.resolve(process.cwd(), outputDirArg)
    : path.resolve(process.cwd(), 'data/review-fixtures-current')
  const result = exportFullFixtureReview({
    workspaceDir: process.cwd(),
    outputDir,
  })

  console.log(`wrote ${result.caseCount} review pairs to ${result.outputDir}`)
  console.log(`auto-mismatch cases: ${result.autoMismatchCaseCount}`)
  console.log(`open ${path.resolve(result.outputDir, 'comparison-report.md')} for the bundle summary`)
}

main()

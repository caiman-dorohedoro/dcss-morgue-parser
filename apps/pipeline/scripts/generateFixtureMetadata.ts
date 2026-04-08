import { writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildFixtureMetadataReport,
  summarizeFixtureMetadataReport,
} from '../src/audit/buildFixtureMetadata'
import { buildCrawlSourceCoverageSummary } from '../src/audit/crawlSourceCoverage'

const workspaceDir = process.cwd()
const outputPath = path.resolve(workspaceDir, '../../fixtures/morgue/test-referenced-metadata.json')

async function main() {
  const report = buildFixtureMetadataReport({ workspaceDir })
  report.crawlSourceCoverage = await buildCrawlSourceCoverageSummary(report.fixtures, {
    crawlSourceDir: path.resolve(workspaceDir, '../../crawl/crawl-ref/source'),
  })
  const summaryReport = summarizeFixtureMetadataReport(report)

  writeFileSync(outputPath, `${JSON.stringify(summaryReport, null, 2)}\n`, 'utf8')

  const relativeOutputPath = path.relative(path.resolve(workspaceDir, '../..'), outputPath)

  console.log(`wrote ${relativeOutputPath}`)
  console.log(
    `fixtures=${summaryReport.summary.fixtureCount} parseSuccess=${summaryReport.summary.parseSuccessCount} parseFailure=${summaryReport.summary.parseFailureCount}`,
  )
}

await main()

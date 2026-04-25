import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCrawlEquipmentCatalog } from '../src/audit/crawlEquipmentCatalog'
import { resolveRuntimePaths } from '../src/runtime/paths'

type CliOptions = {
  crawlRoot?: string
  out?: string
  stdout: boolean
  targetMajorVersion?: number
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`)
  }
  return value
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    stdout: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    switch (arg) {
      case '--crawl-root':
        options.crawlRoot = readValue(args, index, arg)
        index += 1
        break
      case '--out':
        options.out = readValue(args, index, arg)
        index += 1
        break
      case '--stdout':
        options.stdout = true
        break
      case '--target-major-version': {
        const value = readValue(args, index, arg)
        if (!/^\d+$/.test(value)) {
          throw new Error(`Invalid ${arg}: ${value}`)
        }
        options.targetMajorVersion = Number.parseInt(value, 10)
        index += 1
        break
      }
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const paths = resolveRuntimePaths()
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const crawlRoot = options.crawlRoot ?? path.resolve(workspaceRoot, 'crawl')
  const catalog = await buildCrawlEquipmentCatalog({
    crawlRoot,
    targetMajorVersion: options.targetMajorVersion,
  })
  const serialized = `${JSON.stringify(catalog, null, 2)}\n`

  if (options.stdout) {
    process.stdout.write(serialized)
    return
  }

  const outPath = path.resolve(options.out ?? path.resolve(paths.auditDir, 'crawl-equipment-catalog.json'))
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, serialized, 'utf8')
  console.error(`Wrote Crawl equipment catalog to ${outPath}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

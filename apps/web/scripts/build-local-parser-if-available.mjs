import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..', '..')
const rootPackageJsonPath = resolve(repoRoot, 'package.json')
const parserPackageJsonPath = resolve(repoRoot, 'packages', 'parser', 'package.json')
const rootTsupPath = resolve(repoRoot, 'node_modules', '.bin', 'tsup')

function hasWorkspaceRoot() {
  if (!existsSync(rootPackageJsonPath)) {
    return false
  }

  try {
    const parsed = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'))
    return Array.isArray(parsed.workspaces)
  } catch {
    return false
  }
}

if (!hasWorkspaceRoot() || !existsSync(parserPackageJsonPath) || !existsSync(rootTsupPath)) {
  console.log('Skipping local parser build; standalone web install detected.')
  process.exit(0)
}

const result = spawnSync('npm', ['run', 'build', '-w', 'dcss-morgue-parser'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

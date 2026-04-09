import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMorgueText } from '../../../../packages/parser/src/index'
import type { ParsedMorgueTextRecord } from '../../../../packages/parser/src/types'

function loadMorgueFixture(directory: 'focused' | 'full', name: string) {
  return readFileSync(
    path.resolve(process.cwd(), `../../fixtures/morgue/${directory}/${name}`),
    'utf8',
  )
}

function expectedFixtureName(directory: 'focused' | 'full', morgueName: string) {
  return `${directory}-${morgueName.replace(/\.txt$/i, '.json')}`
}

function loadExpectedRecord(directory: 'focused' | 'full', morgueName: string): ParsedMorgueTextRecord {
  return JSON.parse(
    readFileSync(
      path.resolve(
        process.cwd(),
        `../../fixtures/morgue/expected/${expectedFixtureName(directory, morgueName)}`,
      ),
      'utf8',
    ),
  ) as ParsedMorgueTextRecord
}

const GOLDEN_CASES = [
  {
    name: 'cao-0.34-webtiles-quit',
    directory: 'focused',
    morgue: 'cao-0.34-webtiles-quit.txt',
  },
  {
    name: 'cao-trunk-webtiles-death',
    directory: 'focused',
    morgue: 'cao-trunk-webtiles-death.txt',
  },
  {
    name: 'spell-library-table-full',
    directory: 'focused',
    morgue: 'spell-library-table-full.txt',
  },
  {
    name: 'colored-draconian',
    directory: 'focused',
    morgue: 'colored-draconian.txt',
  },
  {
    name: 'skryme-jiyva-full',
    directory: 'focused',
    morgue: 'skryme-jiyva-full.txt',
  },
  {
    name: 'knorpule3000-gozag-full',
    directory: 'focused',
    morgue: 'knorpule3000-gozag-full.txt',
  },
  {
    name: 'regalia-two-amulets',
    directory: 'focused',
    morgue: 'regalia-two-amulets.txt',
  },
] as const

const FULL_GOLDEN_CASES = readdirSync(path.resolve(process.cwd(), '../../fixtures/morgue/full'))
  .filter((name) => name.endsWith('.txt'))
  .sort()
  .map((name) => ({
    name: `full/${name}`,
    directory: 'full' as const,
    morgue: name,
  }))

describe('parseMorgueText golden fixtures', () => {
  for (const testCase of [...GOLDEN_CASES, ...FULL_GOLDEN_CASES]) {
    it(`matches expected structured output for ${testCase.name}`, () => {
      const result = parseMorgueText(loadMorgueFixture(testCase.directory, testCase.morgue))

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.record).toEqual(loadExpectedRecord(testCase.directory, testCase.morgue))
      }
    })
  }
})

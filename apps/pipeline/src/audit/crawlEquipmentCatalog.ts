import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type CrawlEquipmentCatalogSource = {
  crawlRoot: string
  sourceDir: string
}

export type CrawlArmourEgoCatalogEntry = {
  enumName: string
  token: string
  displayName: string
  terseName: string
  isObsolete: boolean
}

export type CrawlBrandCatalogEntry = {
  enumName: string
  token: string | null
  displayName: string
  terseName: string
  isItemBrand: boolean
  isObsolete: boolean
}

export type CrawlMissileBrandCatalogEntry = {
  enumName: string
  token: string
  displayName: string
  terseName: string
  isObsolete: boolean
}

export type CrawlJewelleryEffectCatalogEntry = {
  enumName: string
  itemClass: 'ring' | 'amulet'
  displayName: string
  terseName: string
  isObsolete: boolean
}

export type CrawlUnrandartCatalogEntry = {
  enumName: string
  name: string
  objectClass: string
  subtype: string
  displayType: string | null
  flags: string[]
  isDeleted: boolean
  isNoGen: boolean
}

export type CrawlEquipmentCatalog = {
  source: CrawlEquipmentCatalogSource | null
  tagMajorVersion: number
  armourEgos: CrawlArmourEgoCatalogEntry[]
  weaponBrands: CrawlBrandCatalogEntry[]
  missileBrands: CrawlMissileBrandCatalogEntry[]
  jewelleryEffects: CrawlJewelleryEffectCatalogEntry[]
  unrandarts: CrawlUnrandartCatalogEntry[]
}

export type CrawlEquipmentSourceFiles = {
  tagMajorVersion: number
  itemPropEnum: string
  itemName: string
  mapdef: string
  artData: string
}

type CaseNameMap = Record<string, string>

const OBSOLETE_NAMES = new Set(['obsolete', 'obsolescence', 'obsoleteness'])

function isObsoleteName(...names: Array<string | null | undefined>): boolean {
  return names.some((name) => name !== null && name !== undefined && OBSOLETE_NAMES.has(name))
}

function humanizeToken(token: string): string {
  return token.replaceAll('_', ' ')
}

function expressionMatchesTagMajor(expression: string, targetMajorVersion: number): boolean | null {
  const match = expression.match(/^\s*TAG_MAJOR_VERSION\s*(==|!=|>=|<=|>|<)\s*(\d+)\s*$/)
  if (!match) {
    return null
  }

  const value = Number.parseInt(match[2], 10)
  switch (match[1]) {
    case '==':
      return targetMajorVersion === value
    case '!=':
      return targetMajorVersion !== value
    case '>=':
      return targetMajorVersion >= value
    case '<=':
      return targetMajorVersion <= value
    case '>':
      return targetMajorVersion > value
    case '<':
      return targetMajorVersion < value
    default:
      return null
  }
}

export function preprocessCrawlEquipmentSource(raw: string, targetMajorVersion: number): string {
  const lines = raw.split('\n')
  const output: string[] = []
  const stack: Array<{
    outerActive: boolean
    currentActive: boolean
    branchTaken: boolean
  }> = []

  const isActive = (): boolean => stack.every((entry) => entry.currentActive)

  for (const line of lines) {
    const ifMatch = line.match(/^\s*#if\s+(.+?)\s*$/)
    if (ifMatch) {
      const condition = expressionMatchesTagMajor(ifMatch[1], targetMajorVersion)
      if (condition !== null) {
        const outerActive = isActive()
        stack.push({
          outerActive,
          currentActive: outerActive && condition,
          branchTaken: condition,
        })
        continue
      }
    }

    const elifMatch = line.match(/^\s*#elif\s+(.+?)\s*$/)
    if (elifMatch && stack.length > 0) {
      const condition = expressionMatchesTagMajor(elifMatch[1], targetMajorVersion)
      if (condition !== null) {
        const current = stack[stack.length - 1]
        current.currentActive = current.outerActive && !current.branchTaken && condition
        current.branchTaken = current.branchTaken || condition
        continue
      }
    }

    if (/^\s*#else\b/.test(line) && stack.length > 0) {
      const current = stack[stack.length - 1]
      current.currentActive = current.outerActive && !current.branchTaken
      current.branchTaken = true
      continue
    }

    if (/^\s*#endif\b/.test(line) && stack.length > 0) {
      stack.pop()
      continue
    }

    if (isActive()) {
      output.push(line)
    }
  }

  return output.join('\n')
}

function extractTagMajorVersion(tagVersionRaw: string): number {
  const match = tagVersionRaw.match(/#define\s+TAG_MAJOR_VERSION\s+(\d+)/)
  if (!match) {
    throw new Error('Could not find TAG_MAJOR_VERSION in crawl tag-version.h')
  }
  return Number.parseInt(match[1], 10)
}

function findBalancedBlock(raw: string, startIndex: number): string {
  const openIndex = raw.indexOf('{', startIndex)
  if (openIndex === -1) {
    return ''
  }

  let depth = 0
  for (let index = openIndex; index < raw.length; index += 1) {
    const char = raw[index]
    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return raw.slice(openIndex + 1, index)
      }
    }
  }

  return ''
}

function extractFunctionBody(raw: string, functionName: string): string {
  const functionIndex = raw.indexOf(functionName)
  if (functionIndex === -1) {
    return ''
  }
  return findBalancedBlock(raw, functionIndex)
}

function extractQuotedArray(raw: string, arrayName: string): string[] {
  const arrayIndex = raw.search(new RegExp(`\\b${arrayName}\\s*\\[\\]\\s*=`))
  if (arrayIndex === -1) {
    return []
  }

  const body = findBalancedBlock(raw, arrayIndex)
  return [...body.matchAll(/"([^"]*)"/g)].map((match) => match[1])
}

function extractEnumSequence(raw: string, enumName: string): string[] {
  const source = raw.replaceAll(/\/\/.*$/gm, '')
  const enumIndex = source.search(new RegExp(`\\benum\\s+${enumName}\\b`))
  if (enumIndex === -1) {
    return []
  }

  const body = findBalancedBlock(source, enumIndex)
  return [...body.matchAll(/^\s*([A-Z][A-Z0-9_]+)\b/gm)].map((match) => match[1])
}

function parseReturnExpression(expression: string): { displayName: string; terseName: string } | null {
  const names = [...expression.matchAll(/"([^"]*)"/g)].map((match) => match[1])
  if (names.length === 0) {
    return null
  }

  if (expression.includes('MBN_TERSE')) {
    return {
      terseName: names[0],
      displayName: names[1] ?? names[0],
    }
  }

  if (expression.includes('MBN_NAME')) {
    return {
      displayName: names[0],
      terseName: names[1] ?? names[0],
    }
  }

  return {
    displayName: names[0],
    terseName: names[0],
  }
}

function extractCaseReturnPairs(raw: string): Record<string, { displayName: string; terseName: string }> {
  const pairs: Record<string, { displayName: string; terseName: string }> = {}
  const caseReturnPattern = /case\s+([A-Z0-9_]+):\s*(?:\n\s*)?return\s+([^;]+);/g

  for (const match of raw.matchAll(caseReturnPattern)) {
    const parsed = parseReturnExpression(match[2])
    if (parsed) {
      pairs[match[1]] = parsed
    }
  }

  return pairs
}

function extractSimpleCaseReturns(raw: string): CaseNameMap {
  const names: CaseNameMap = {}

  for (const match of raw.matchAll(/case\s+([A-Z0-9_]+):\s*return\s+"([^"]*)";/g)) {
    names[match[1]] = match[2]
  }

  return names
}

function splitTerseFunctionSections(functionBody: string): { verbose: string; terse: string } {
  const sections = functionBody.split(/\n\s*else\s*\n\s*\{/)
  return {
    verbose: sections[0] ?? '',
    terse: sections[1] ?? '',
  }
}

function buildArmourEgos(
  itemPropEnum: string,
  itemName: string,
  mapdef: string,
): CrawlArmourEgoCatalogEntry[] {
  const enumNames = extractEnumSequence(itemPropEnum, 'special_armour_type')
    .filter((name) =>
      name.startsWith('SPARM_')
      && name !== 'SPARM_FORBID_EGO'
      && name !== 'SPARM_NORMAL'
      && !name.startsWith('NUM_'),
    )
  const tokens = extractQuotedArray(mapdef, 'armour_egos').filter((token) => token !== '')
  const armourNameSections = splitTerseFunctionSections(
    extractFunctionBody(itemName, 'special_armour_type_name'),
  )
  const displayNames = extractSimpleCaseReturns(armourNameSections.verbose)
  const terseNames = extractSimpleCaseReturns(armourNameSections.terse)

  return enumNames.map((enumName, index) => {
    const token = tokens[index] ?? enumName.replace(/^SPARM_/, '').toLowerCase()
    const displayName = displayNames[enumName] ?? humanizeToken(token)
    const terseName = terseNames[enumName] ?? displayName

    return {
      enumName,
      token,
      displayName,
      terseName,
      isObsolete: isObsoleteName(displayName, terseName),
    }
  })
}

function buildWeaponBrands(
  itemPropEnum: string,
  itemName: string,
  mapdef: string,
): CrawlBrandCatalogEntry[] {
  const enumSequence = extractEnumSequence(itemPropEnum, 'brand_type')
  const itemTokens = extractQuotedArray(mapdef, 'weapon_brands').filter((token) => token !== '')
  const verboseNames = extractQuotedArray(itemName, 'weapon_brands_verbose')
  const terseNames = extractQuotedArray(itemName, 'weapon_brands_terse')

  const entries: CrawlBrandCatalogEntry[] = []
  let displayIndex = 0
  let itemTokenIndex = 0
  let isItemBrand = true

  for (const enumName of enumSequence) {
    if (enumName === 'SPWPN_FORBID_BRAND') {
      continue
    }

    if (enumName === 'NUM_REAL_SPECIAL_WEAPONS') {
      isItemBrand = false
      displayIndex += 1
      continue
    }

    if (!enumName.startsWith('SPWPN_')) {
      continue
    }

    const token = isItemBrand && enumName !== 'SPWPN_NORMAL'
      ? (itemTokens[itemTokenIndex++] ?? null)
      : null
    const displayName = verboseNames[displayIndex] ?? token ?? enumName.replace(/^SPWPN_/, '').toLowerCase()
    const terseName = terseNames[displayIndex] ?? displayName

    displayIndex += 1

    if (enumName === 'SPWPN_NORMAL') {
      continue
    }

    entries.push({
      enumName,
      token,
      displayName,
      terseName,
      isItemBrand,
      isObsolete: isObsoleteName(displayName, terseName),
    })
  }

  return entries
}

function buildMissileBrands(
  itemPropEnum: string,
  itemName: string,
  mapdef: string,
): CrawlMissileBrandCatalogEntry[] {
  const enumNames = extractEnumSequence(itemPropEnum, 'special_missile_type')
    .filter((name) =>
      name.startsWith('SPMSL_')
      && name !== 'SPMSL_FORBID_BRAND'
      && name !== 'SPMSL_NORMAL'
      && !name.startsWith('NUM_'),
    )
  const tokens = extractQuotedArray(mapdef, 'missile_brands').filter((token) => token !== '')
  const names = extractCaseReturnPairs(extractFunctionBody(itemName, 'missile_brand_name'))

  return enumNames.map((enumName, index) => {
    const token = tokens[index] ?? enumName.replace(/^SPMSL_/, '').toLowerCase()
    const displayName = names[enumName]?.displayName ?? humanizeToken(token)
    const terseName = names[enumName]?.terseName ?? displayName

    return {
      enumName,
      token,
      displayName,
      terseName,
      isObsolete: isObsoleteName(displayName, terseName),
    }
  })
}

function buildJewelleryEffects(
  itemPropEnum: string,
  itemName: string,
): CrawlJewelleryEffectCatalogEntry[] {
  const enumNames = extractEnumSequence(itemPropEnum, 'jewellery_type')
    .filter((name) =>
      (name.startsWith('RING_') || name.startsWith('AMU_'))
      && !name.includes('_FIRST_')
      && !name.startsWith('NUM_'),
    )
  const jewelleryNameSections = splitTerseFunctionSections(
    extractFunctionBody(itemName, 'jewellery_effect_name'),
  )
  const displayNames = extractSimpleCaseReturns(jewelleryNameSections.verbose)
  const terseNames = extractSimpleCaseReturns(jewelleryNameSections.terse)

  return enumNames.map((enumName) => {
    const displayName = displayNames[enumName] ?? humanizeToken(enumName.replace(/^(RING|AMU)_/, '').toLowerCase())
    const terseName = terseNames[enumName] ?? displayName

    return {
      enumName,
      itemClass: enumName.startsWith('RING_') ? 'ring' : 'amulet',
      displayName,
      terseName,
      isObsolete: isObsoleteName(displayName, terseName),
    }
  })
}

export function deriveUnrandEnumName(name: string, forcedEnum?: string): string {
  if (forcedEnum) {
    return `UNRAND_${forcedEnum.replace(/^UNRAND_/, '').trim()}`
  }

  const quotedName = name.match(/"([^"]+)"/)?.[1]
  const sourceName =
    quotedName
    ?? name.match(/\bof the\s+(.+)$/)?.[1]
    ?? name.match(/\bof\s+(.+)$/)?.[1]
    ?? name

  return `UNRAND_${
    sourceName
      .replaceAll("'", '')
      .replaceAll(/[^A-Za-z0-9]+/g, '_')
      .replaceAll(/^_+|_+$/g, '')
      .toUpperCase()
  }`
}

function splitArtDataBlocks(raw: string): string[][] {
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of raw.split('\n')) {
    if (!line.trim()) {
      if (current.length > 0) {
        blocks.push(current)
        current = []
      }
      continue
    }

    if (line.trim().startsWith('#') && current.length === 0) {
      continue
    }

    current.push(line)
  }

  if (current.length > 0) {
    blocks.push(current)
  }

  return blocks
}

function parseArtDataBlock(lines: string[]): CrawlUnrandartCatalogEntry | null {
  const fields = new Map<string, string>()

  for (const line of lines) {
    const match = line.match(/^\s*([A-Z_]+):\s*(.*?)\s*$/)
    if (!match) {
      continue
    }
    fields.set(match[1], match[2])
  }

  const name = fields.get('NAME')
  const objectSpec = fields.get('OBJ')
  if (!name || !objectSpec) {
    return null
  }

  const [objectClass, subtype] = objectSpec.split('/').map((value) => value.trim())
  if (!objectClass || !subtype || objectClass === 'OBJ_UNASSIGNED') {
    return null
  }

  const flags = (fields.get('BOOL') ?? '')
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean)

  return {
    enumName: deriveUnrandEnumName(name, fields.get('ENUM')),
    name,
    objectClass,
    subtype,
    displayType: fields.get('TYPE') ?? null,
    flags,
    isDeleted: flags.includes('deleted'),
    isNoGen: flags.includes('nogen'),
  }
}

function buildUnrandarts(artData: string): CrawlUnrandartCatalogEntry[] {
  return splitArtDataBlocks(artData)
    .map(parseArtDataBlock)
    .filter((entry): entry is CrawlUnrandartCatalogEntry => entry !== null)
}

export function buildCrawlEquipmentCatalogFromSource(
  sourceFiles: CrawlEquipmentSourceFiles,
): CrawlEquipmentCatalog {
  const itemPropEnum = preprocessCrawlEquipmentSource(
    sourceFiles.itemPropEnum,
    sourceFiles.tagMajorVersion,
  )
  const itemName = preprocessCrawlEquipmentSource(sourceFiles.itemName, sourceFiles.tagMajorVersion)
  const mapdef = preprocessCrawlEquipmentSource(sourceFiles.mapdef, sourceFiles.tagMajorVersion)
  const artData = preprocessCrawlEquipmentSource(sourceFiles.artData, sourceFiles.tagMajorVersion)

  return {
    source: null,
    tagMajorVersion: sourceFiles.tagMajorVersion,
    armourEgos: buildArmourEgos(itemPropEnum, itemName, mapdef),
    weaponBrands: buildWeaponBrands(itemPropEnum, itemName, mapdef),
    missileBrands: buildMissileBrands(itemPropEnum, itemName, mapdef),
    jewelleryEffects: buildJewelleryEffects(itemPropEnum, itemName),
    unrandarts: buildUnrandarts(artData),
  }
}

export async function buildCrawlEquipmentCatalog(options?: {
  crawlRoot?: string
  targetMajorVersion?: number
}): Promise<CrawlEquipmentCatalog> {
  const crawlRoot = path.resolve(options?.crawlRoot ?? path.resolve(process.cwd(), 'crawl'))
  const sourceDir = path.resolve(crawlRoot, 'crawl-ref/source')
  const [tagVersionRaw, itemPropEnum, itemName, mapdef, artData] = await Promise.all([
    readFile(path.resolve(sourceDir, 'tag-version.h'), 'utf8'),
    readFile(path.resolve(sourceDir, 'item-prop-enum.h'), 'utf8'),
    readFile(path.resolve(sourceDir, 'item-name.cc'), 'utf8'),
    readFile(path.resolve(sourceDir, 'mapdef.cc'), 'utf8'),
    readFile(path.resolve(sourceDir, 'art-data.txt'), 'utf8'),
  ])
  const tagMajorVersion = options?.targetMajorVersion ?? extractTagMajorVersion(tagVersionRaw)

  return {
    ...buildCrawlEquipmentCatalogFromSource({
      tagMajorVersion,
      itemPropEnum,
      itemName,
      mapdef,
      artData,
    }),
    source: {
      crawlRoot,
      sourceDir,
    },
  }
}

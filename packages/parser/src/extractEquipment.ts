import type {
  ArtifactKind,
  EquipmentEquipState,
  EquipmentItemSnapshot,
  EquipmentObjectClass,
  EquipmentPropertyBag,
  EquipmentSnapshot,
} from './types'
import {
  ARMOUR_EGO_PROPERTIES_BY_NAME,
  ARMOUR_EGO_BY_PROPERTY_SIGNATURE,
  ARMOUR_EGO_NAME_BY_NORMALIZED,
  BASE_PATTERNS_BY_SLOT,
  FIXED_JEWELLERY_PROPERTIES_BY_EFFECT,
  INTRINSIC_PROPERTIES_BY_ARMOUR_BASE_TYPE,
  KNOWN_UNRAND_BY_SLOT,
  SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT,
  SHIELD_LABELS,
  UNRAND_CLOAK_ITEMS,
  UNRAND_GLOVE_ITEMS,
  UNRAND_HEAD_ITEMS,
  UNRAND_ORB_ITEMS,
  UNRAND_SHIELD_ITEMS,
  type EquipmentSlot,
  type KnownUnrand,
} from './extractEquipmentData'
import {
  bagFromTokens,
  classifyPropertyTokens,
  emptyPropertyBag,
  hasPropertyBagContent,
  mergePropertyBags,
  normalizeUnique,
  overlayPropertyBag,
  subtractPropertyBags,
} from './extractEquipmentPropertyBag'
import { splitSections } from './splitSections'

type EquipmentLine = {
  category: string | null
  text: string
}

function isEquipped(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('(worn)')
    || lower.includes('(haunted)')
    || lower.includes('(melded)')
    || lower.includes('(installed)')
  )
}

function isCategoryHeading(line: string): boolean {
  return /^[A-Z][A-Za-z &'-]+$/.test(line)
}

function isItemLine(line: string): boolean {
  return /^[a-zA-Z0-9] - /.test(line)
}

function parseEquipmentLines(section: string): EquipmentLine[] {
  const lines: EquipmentLine[] = []
  let currentCategory: string | null = null

  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (isCategoryHeading(line) && !isItemLine(line)) {
      currentCategory = line
      continue
    }

    if (isItemLine(line)) {
      lines.push({
        category: currentCategory,
        text: line,
      })
    }
  }

  return lines
}

function hasAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(line))
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function exactNamePatterns(items: readonly KnownUnrand[]): RegExp[] {
  return items.map((item) => new RegExp(`\\b${escapeRegex(item.name)}\\b`, 'i'))
}

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanItemName(line: string): string {
  let value = normalizeSpacing(
    line
      .replace(/^[a-z0-9] - /i, '')
      .replace(/\s+\((?:worn|haunted|melded|installed)\).*$/i, '')
      .replace(/\s+\{.*$/, ''),
  )

  let changed = true
  while (changed) {
    const nextValue = normalizeSpacing(
      value
        .replace(/^\s*the\s+/i, '')
        .replace(/^\s*an?\s+/i, '')
        .replace(/^\s*cursed\s+/i, '')
        .replace(/^[+-]\d+\s+/, ''),
    )
    changed = nextValue !== value
    value = nextValue
  }

  return value
}

function extractEnchantment(line: string): number | null {
  const normalized = line.replace(/^[a-z0-9] - /i, '')
  const match = normalized.match(/^(?:the\s+)?(?:cursed\s+)?(?:an?\s+)?([+-]\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function extractEquipState(line: string): EquipmentEquipState {
  if (/\(installed\)/i.test(line)) {
    return 'installed'
  }

  if (/\(melded\)/i.test(line)) {
    return 'melded'
  }

  return /\(haunted\)/i.test(line) ? 'haunted' : 'worn'
}

function extractHeaderEquipState(line: string): EquipmentEquipState | null {
  if (!/^[a-z0-9] - /i.test(line)) {
    return null
  }

  if (/\binstalled\b/i.test(line)) {
    return 'installed'
  }

  if (/\bmelded\b/i.test(line)) {
    return 'melded'
  }

  return /\bhaunted\b/i.test(line) ? 'haunted' : 'worn'
}

function isCursed(line: string): boolean {
  return /\bcursed\b/i.test(line)
}

function extractPropertiesText(line: string): string | null {
  return line.match(/\{([^}]*)\}/)?.[1]?.trim() ?? null
}

function isFunctionalInscriptionToken(token: string): boolean {
  return /^@.+$/.test(token)
    || /^![A-Za-z*]+$/.test(token)
    || /^=[gksfR]+$/.test(token)
    || /^\+f+$/.test(token)
}

function extractProperties(propertiesText: string | null): string[] {
  if (!propertiesText) {
    return []
  }

  return propertiesText
    .split(/\s*,\s*/)
    .flatMap((segment) => normalizeSpacing(segment).split(/\s+/))
    .filter((token) => !isFunctionalInscriptionToken(token))
    .filter(Boolean)
}

function extractFunctionalInscriptions(propertiesText: string | null): string[] {
  if (!propertiesText) {
    return []
  }

  return normalizeUnique(
    propertiesText
      .split(/\s*,\s*/)
      .flatMap((segment) => normalizeSpacing(segment).split(/\s+/))
      .filter((token) => isFunctionalInscriptionToken(token))
    .filter(Boolean)
  )
}

function getObjectClass(slot: EquipmentSlot): EquipmentObjectClass {
  if (slot === 'amulet' || slot === 'ring') {
    return 'jewellery'
  }

  if (slot === 'gizmo') {
    return 'gizmo'
  }

  if (slot === 'talisman') {
    return 'talisman'
  }

  return 'armour'
}

function normalizeKnownUnrandName(value: string): string {
  return value.toLowerCase().replace(/^pair of /i, '').trim()
}

function findKnownUnrand(slot: EquipmentSlot, rawName: string): KnownUnrand | undefined {
  const normalizedRawName = normalizeKnownUnrandName(rawName)

  return KNOWN_UNRAND_BY_SLOT[slot].find((item) => normalizeKnownUnrandName(item.name) === normalizedRawName)
}

function detectBaseType(slot: EquipmentSlot, rawName: string, knownUnrand?: KnownUnrand): string | null {
  if (knownUnrand?.baseType) {
    return knownUnrand.baseType
  }

  if (slot === 'gizmo') {
    return 'gizmo'
  }

  if (slot === 'talisman') {
    const normalized = normalizeSpacing(rawName.toLowerCase().replace(/"[^"]*"/g, ''))
    const talismanOfMatch = normalized.match(/^talisman of (.+)$/)
    if (talismanOfMatch) {
      return `${talismanOfMatch[1]} talisman`
    }

    const baseMatch = normalized.match(/^([a-z-]+(?: [a-z-]+)* talisman)(?: of .+)?$/)
    return baseMatch?.[1] ?? null
  }

  const normalized = normalizeSpacing(rawName.toLowerCase().replace(/"[^"]*"/g, ''))

  for (const candidate of BASE_PATTERNS_BY_SLOT[slot]) {
    if (
      normalized === candidate.label
      || normalized.startsWith(`${candidate.label} `)
      || normalized.startsWith(`${candidate.label} of `)
    ) {
      return candidate.baseType
    }
  }

  return null
}

function getDisplayBaseName(slot: EquipmentSlot, baseType: string | null): string | null {
  if (!baseType) {
    return null
  }

  switch (slot) {
    case 'footwear':
      return baseType === 'barding' ? 'barding' : 'pair of boots'
    case 'gloves':
      return 'pair of gloves'
    case 'ring':
      return 'ring'
    case 'amulet':
      return 'amulet'
    case 'talisman':
      return baseType
    default:
      return baseType
  }
}

function extractSuffixAfterBase(rawName: string, slot: EquipmentSlot, baseType: string | null): string | null {
  if (!baseType) {
    return null
  }

  const normalized = normalizeSpacing(rawName.replace(/"[^"]*"/g, ''))
  const candidateLabels =
    slot === 'footwear' && baseType === 'boots'
      ? ['pair of boots', 'boots']
      : slot === 'gloves' && baseType === 'gloves'
        ? ['pair of gloves', 'gloves']
        : [getDisplayBaseName(slot, baseType) ?? baseType]

  for (const label of candidateLabels) {
    const match = normalized.match(new RegExp(`^${escapeRegex(label)} of (.+)$`, 'i'))
    if (match) {
      return normalizeSpacing(match[1])
    }
  }

  return null
}

function canonicalArmourEgo(name: string | null): string | null {
  if (!name) {
    return null
  }

  return ARMOUR_EGO_NAME_BY_NORMALIZED.get(name.toLowerCase()) ?? null
}

function inferArmourEgo(rawName: string, slot: EquipmentSlot, baseType: string | null, properties: string[]): string | null {
  const explicit = canonicalArmourEgo(extractSuffixAfterBase(rawName, slot, baseType))
  if (explicit) {
    return explicit
  }

  return ARMOUR_EGO_BY_PROPERTY_SIGNATURE.get(properties.join(' ')) ?? null
}

function isRandartJewellery(slot: EquipmentSlot, rawName: string, line: string): boolean {
  if (/^[a-z0-9] - the /i.test(line)) {
    return true
  }

  if (/".+?"/.test(rawName)) {
    return true
  }

  switch (slot) {
    case 'amulet':
      return /^amulet of (?:the )?[A-Z]/.test(rawName) || /necklace/i.test(rawName)
    case 'ring':
      return /^ring of (?:the )?[A-Z]/.test(rawName)
    default:
      return false
  }
}

function isRandartTalisman(rawName: string, line: string, baseType: string | null): boolean {
  if (/^[a-z0-9] - the /i.test(line)) {
    return true
  }

  if (/".+?"/.test(rawName)) {
    return true
  }

  const normalized = rawName.toLowerCase()
  if (normalized.startsWith('talisman of ')) {
    return false
  }

  return Boolean(baseType && normalized.startsWith(`${baseType} of `))
}

function isRandartArmour(rawName: string, line: string, slot: EquipmentSlot, baseType: string | null): boolean {
  if (/^[a-z0-9] - the /i.test(line)) {
    return true
  }

  if (/".+?"/.test(rawName)) {
    return true
  }

  const suffix = extractSuffixAfterBase(rawName, slot, baseType)
  return Boolean(suffix && !canonicalArmourEgo(suffix))
}

function getArtifactKind(
  slot: EquipmentSlot,
  rawName: string,
  line: string,
  objectClass: EquipmentObjectClass,
  baseType: string | null,
): ArtifactKind {
  if (findKnownUnrand(slot, rawName)) {
    return 'unrand'
  }

  if (slot === 'gizmo') {
    return 'randart'
  }

  if (objectClass === 'jewellery') {
    return isRandartJewellery(slot, rawName, line) ? 'randart' : 'normal'
  }

  if (objectClass === 'talisman') {
    return isRandartTalisman(rawName, line, baseType) ? 'randart' : 'normal'
  }

  return isRandartArmour(rawName, line, slot, baseType) ? 'randart' : 'normal'
}

function inferSubtypeEffect(slot: EquipmentSlot, rawName: string, artifactKind: ArtifactKind): string | null {
  if (artifactKind !== 'normal') {
    return null
  }

  if (slot === 'ring') {
    return rawName.match(/^ring of (.+)$/i)?.[1]?.toLowerCase() ?? null
  }

  if (slot === 'amulet') {
    return rawName.match(/^amulet of (.+)$/i)?.[1]?.toLowerCase() ?? null
  }

  if (slot === 'talisman' && rawName.match(/^talisman of (.+)$/i)) {
    return rawName.match(/^talisman of (.+)$/i)?.[1]?.toLowerCase() ?? null
  }

  return null
}

function formatScalarProperty(prefix: string, value: number | null): string[] {
  if (value === null || value === 0) {
    return []
  }

  const sign = value > 0 ? `+${value}` : `${value}`
  return [`${prefix}${sign}`]
}

function inferJewelleryIntrinsicProperties(subtypeEffect: string | null, enchant: number | null): string[] {
  if (!subtypeEffect) {
    return []
  }

  if (subtypeEffect in SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT) {
    return formatScalarProperty(SCALAR_JEWELLERY_PROPERTY_PREFIX_BY_EFFECT[subtypeEffect], enchant)
  }

  return FIXED_JEWELLERY_PROPERTIES_BY_EFFECT[subtypeEffect] ?? []
}

function inferIntrinsicProperties(
  objectClass: EquipmentObjectClass,
  baseType: string | null,
  subtypeEffect: string | null,
  enchant: number | null,
): string[] {
  if (objectClass === 'jewellery') {
    return inferJewelleryIntrinsicProperties(subtypeEffect, enchant)
  }

  if (objectClass === 'gizmo') {
    return []
  }

  if (!baseType) {
    return []
  }

  return INTRINSIC_PROPERTIES_BY_ARMOUR_BASE_TYPE[baseType] ?? []
}

function inferDisplayProperties(
  extractedPropertyBag: EquipmentPropertyBag,
  intrinsicProperties: EquipmentPropertyBag,
  egoProperties: EquipmentPropertyBag,
): EquipmentPropertyBag {
  const baseProperties = mergePropertyBags(intrinsicProperties, egoProperties)

  if (!hasPropertyBagContent(extractedPropertyBag)) {
    return baseProperties
  }

  return overlayPropertyBag(baseProperties, extractedPropertyBag)
}

function getDisplayName(
  slot: EquipmentSlot,
  rawName: string,
  artifactKind: ArtifactKind,
  baseType: string | null,
  ego: string | null,
  subtypeEffect: string | null,
): string {
  const knownUnrand = findKnownUnrand(slot, rawName)
  if (knownUnrand) {
    return knownUnrand.name
  }

  if (slot === 'orb' && artifactKind === 'randart') {
    return 'randart orb'
  }

  if (artifactKind === 'randart') {
    if (slot === 'bodyArmour' || slot === 'shield' || slot === 'orb') {
      return baseType ?? rawName
    }

    return rawName
  }

  if (artifactKind === 'normal' && ego && getObjectClass(slot) === 'armour') {
    const displayBase = getDisplayBaseName(slot, baseType)
    return displayBase ? `${displayBase} of ${ego}` : rawName
  }

  if (artifactKind === 'normal' && subtypeEffect) {
    const displayBase = getDisplayBaseName(slot, baseType)
    if (slot === 'talisman') {
      return `talisman of ${subtypeEffect}`
    }

    return displayBase ? `${displayBase} of ${subtypeEffect}` : rawName
  }

  if (slot === 'bodyArmour' || slot === 'shield' || slot === 'talisman') {
    return baseType ?? rawName
  }

  return rawName
}

function buildEquipmentItem(slot: EquipmentSlot, line: string | undefined): EquipmentItemSnapshot | undefined {
  if (!line) {
    return undefined
  }

  const rawName = cleanItemName(line)
  const propertiesText = extractPropertiesText(line)
  const extractedProperties = extractProperties(propertiesText)
  const extractedPropertyInfo = classifyPropertyTokens(slot, extractedProperties)
  const functionalInscriptions = extractFunctionalInscriptions(propertiesText)
  const objectClass = getObjectClass(slot)
  const equipState = extractEquipState(line)
  const cursed = isCursed(line)
  const knownUnrand = findKnownUnrand(slot, rawName)
  const baseType = detectBaseType(slot, rawName, knownUnrand)
  const enchant = extractEnchantment(line)
  const artifactKind = getArtifactKind(slot, rawName, line, objectClass, baseType)
  const subtypeEffect = inferSubtypeEffect(slot, rawName, artifactKind)
  const ego =
    objectClass === 'armour' && artifactKind === 'normal'
      ? inferArmourEgo(rawName, slot, baseType, extractedProperties)
      : null
  const intrinsicProperties = bagFromTokens(
    inferIntrinsicProperties(objectClass, baseType, subtypeEffect, enchant),
  )
  const egoProperties = bagFromTokens(
    artifactKind === 'normal' && ego ? ARMOUR_EGO_PROPERTIES_BY_NAME[ego] ?? [] : [],
  )
  const properties = inferDisplayProperties(
    extractedPropertyInfo.bag,
    intrinsicProperties,
    egoProperties,
  )
  const artifactProperties =
    artifactKind === 'normal'
      ? emptyPropertyBag()
      : subtractPropertyBags(properties, mergePropertyBags(intrinsicProperties, egoProperties))

  return {
    rawName,
    displayName: getDisplayName(slot, rawName, artifactKind, baseType, ego, subtypeEffect),
    objectClass,
    equipState,
    isCursed: cursed,
    baseType,
    enchant,
    artifactKind,
    ego,
    subtypeEffect,
    ...(extractedPropertyInfo.gizmoEffects.length > 0
      ? { gizmoEffects: extractedPropertyInfo.gizmoEffects }
      : {}),
    ...(extractedPropertyInfo.namedEffects.length > 0
      ? { namedEffects: extractedPropertyInfo.namedEffects }
      : {}),
    ...(extractedPropertyInfo.ashenzariCurses.length > 0
      ? { ashenzariCurses: extractedPropertyInfo.ashenzariCurses }
      : {}),
    propertiesText,
    ...(functionalInscriptions.length > 0 ? { functionalInscriptions } : {}),
    properties,
    intrinsicProperties,
    egoProperties,
    artifactProperties,
  }
}

function cleanHeaderItemName(line: string): string {
  return cleanItemName(line.replace(/^([a-z0-9] - )(?:(?:melded|haunted)\s+)/i, '$1'))
}

function extractHeaderEquipStates(text: string): Map<string, EquipmentEquipState> {
  const header = splitSections(text).header
  const lines = header.split('\n')
  const statsStart = lines.findIndex((line) => /^(?:Health|HP):/.test(line))

  if (statsStart === -1) {
    return new Map()
  }

  const states = new Map<string, EquipmentEquipState>()

  for (let index = statsStart + 3; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      if (states.size > 0) {
        break
      }
      continue
    }

    if (/^(?:%:|@:|A:|a:|0:|}:)/.test(trimmed)) {
      break
    }

    const itemText = line.split(/\s{2,}/).at(-1)?.trim() ?? ''
    const state = extractHeaderEquipState(itemText)

    if (!state) {
      continue
    }

    states.set(cleanHeaderItemName(itemText), state)
  }

  return states
}

function buildEquipmentItemWithHeaderState(
  slot: EquipmentSlot,
  line: string | undefined,
  headerEquipStates: ReadonlyMap<string, EquipmentEquipState>,
): EquipmentItemSnapshot | undefined {
  const item = buildEquipmentItem(slot, line)

  if (!item) {
    return undefined
  }

  const headerState = headerEquipStates.get(item.rawName)

  if (!headerState || headerState === 'worn') {
    return item
  }

  return {
    ...item,
    equipState: headerState,
  }
}

export function extractEquipment(text: string): EquipmentSnapshot {
  const section = splitSections(text).equipment
  const headerEquipStates = extractHeaderEquipStates(text)
  const lines = parseEquipmentLines(section)
  const equippedLines = lines.filter((line) => isEquipped(line.text))
  const armourLines = equippedLines
    .filter((line) => line.category === null || line.category === 'Armour')
    .map((line) => line.text)
  const jewelleryLines = equippedLines
    .filter((line) => line.category === 'Jewellery')
    .map((line) => line.text)
  const talismanLines = equippedLines
    .filter((line) => line.category === 'Talismans')
    .map((line) => line.text)
  const gizmoLines = equippedLines
    .filter((line) => line.category === 'Gizmo')
    .map((line) => line.text)

  const headPatterns = [
    /\bhat\b/i,
    /\bhelmet\b/i,
    /\bcap\b/i,
    /\bhood\b/i,
    ...exactNamePatterns(UNRAND_HEAD_ITEMS),
  ]
  const glovesPatterns = [/\bgloves\b/i, /\bgauntlets\b/i, ...exactNamePatterns(UNRAND_GLOVE_ITEMS)]
  const bootsPatterns = [/\bboots\b/i, /\bbarding\b/i, ...exactNamePatterns(KNOWN_UNRAND_BY_SLOT.footwear)]
  const cloakPatterns = [/\bcloak\b/i, /\bscarf\b/i, ...exactNamePatterns(UNRAND_CLOAK_ITEMS)]
  const shieldPatterns = [
    ...SHIELD_LABELS.map((label) => new RegExp(`\\b${label}\\b`, 'i')),
    ...exactNamePatterns(UNRAND_SHIELD_ITEMS),
  ]
  const orbPatterns = [/\borb\b/i, ...exactNamePatterns(UNRAND_ORB_ITEMS)]
  const amuletPatterns = [/\bamulet\b/i, /\bnecklace\b/i, /\bpendant\b/i, /\bbrooch\b/i]
  const ringPatterns = [/\bring\b/i]
  const nonBodyPatterns = [
    ...headPatterns,
    ...glovesPatterns,
    ...bootsPatterns,
    ...cloakPatterns,
    ...shieldPatterns,
    ...orbPatterns,
  ]

  const shieldLine = armourLines.find((line) => hasAny(line, shieldPatterns))
  const footwearLines = armourLines.filter((line) => hasAny(line, bootsPatterns))
  const helmetLines = armourLines.filter((line) => hasAny(line, headPatterns))
  const glovesLines = armourLines.filter((line) => hasAny(line, glovesPatterns))
  const cloakLines = armourLines.filter((line) => hasAny(line, cloakPatterns))
  const orbLine = armourLines.find((line) => hasAny(line, orbPatterns))
  const bodyArmourLine = armourLines.find((line) => !hasAny(line, nonBodyPatterns))
  const amuletLines = jewelleryLines.filter((line) => hasAny(line, amuletPatterns))
  const ringLines = jewelleryLines.filter((line) => hasAny(line, ringPatterns))
  const gizmoLine = gizmoLines[0]
  const talismanLine = talismanLines[0]

  const bodyArmourDetails = buildEquipmentItemWithHeaderState(
    'bodyArmour',
    bodyArmourLine,
    headerEquipStates,
  )
  const shieldDetails = buildEquipmentItemWithHeaderState('shield', shieldLine, headerEquipStates)
  const footwearDetails = footwearLines
    .map((line) => buildEquipmentItemWithHeaderState('footwear', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const helmetDetails = helmetLines
    .map((line) => buildEquipmentItemWithHeaderState('helmet', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const glovesDetails = glovesLines
    .map((line) => buildEquipmentItemWithHeaderState('gloves', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const cloakDetails = cloakLines
    .map((line) => buildEquipmentItemWithHeaderState('cloak', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const orbDetails = buildEquipmentItemWithHeaderState('orb', orbLine, headerEquipStates)
  const amuletDetailsList = amuletLines
    .map((line) => buildEquipmentItemWithHeaderState('amulet', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const ringDetails = ringLines
    .map((line) => buildEquipmentItemWithHeaderState('ring', line, headerEquipStates))
    .filter((item): item is EquipmentItemSnapshot => Boolean(item))
  const gizmoDetails = buildEquipmentItemWithHeaderState('gizmo', gizmoLine, headerEquipStates)
  const talismanDetails = buildEquipmentItemWithHeaderState(
    'talisman',
    talismanLine,
    headerEquipStates,
  )

  return {
    bodyArmour: bodyArmourDetails?.rawName ?? 'none',
    shield: shieldDetails?.rawName ?? 'none',
    helmets: helmetDetails.map((item) => item.rawName),
    gloves: glovesDetails.map((item) => item.rawName),
    footwear: footwearDetails.map((item) => item.rawName),
    cloaks: cloakDetails.map((item) => item.rawName),
    orb: orbDetails?.rawName ?? 'none',
    amulets: amuletDetailsList.map((item) => item.rawName),
    rings: ringDetails.map((ring) => ring.rawName),
    gizmo: gizmoDetails?.rawName ?? 'none',
    talisman: talismanDetails?.rawName ?? 'none',
    bodyArmourDetails,
    shieldDetails,
    helmetDetails: helmetDetails.length > 0 ? helmetDetails : undefined,
    glovesDetails: glovesDetails.length > 0 ? glovesDetails : undefined,
    footwearDetails: footwearDetails.length > 0 ? footwearDetails : undefined,
    cloakDetails: cloakDetails.length > 0 ? cloakDetails : undefined,
    orbDetails,
    amuletDetails: amuletDetailsList.length > 0 ? amuletDetailsList : undefined,
    ringDetails: ringDetails.length > 0 ? ringDetails : undefined,
    gizmoDetails,
    talismanDetails,
  }
}

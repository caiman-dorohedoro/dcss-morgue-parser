import type {
  EquipmentAshenzariCurse,
  EquipmentGizmoEffect,
  EquipmentNamedEffect,
  EquipmentPropertyBag,
} from './types'
import {
  ASHENZARI_CURSE_TOKENS,
  BOOLEAN_PROPERTY_KEYS_BY_TOKEN,
  BOOLEAN_PROPERTY_ORDER,
  GIZMO_EFFECT_TOKENS,
  NAMED_EFFECT_TOKENS,
  NUMERIC_PROPERTY_ORDER,
  NUMERIC_SEQUENCE_KEYS_BY_PREFIX,
  NUMERIC_SIGNED_KEYS_BY_PREFIX,
  type EquipmentSlot,
} from './extractEquipmentData'

export type ClassifiedPropertyTokens = {
  bag: EquipmentPropertyBag
  gizmoEffects: EquipmentGizmoEffect[]
  namedEffects: EquipmentNamedEffect[]
  ashenzariCurses: EquipmentAshenzariCurse[]
}

export function emptyPropertyBag(): EquipmentPropertyBag {
  return {
    numeric: {},
    booleanProps: {},
    opaqueTokens: [],
  }
}

export function normalizeUnique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function normalizePropertyBag(bag: EquipmentPropertyBag): EquipmentPropertyBag {
  return {
    numeric: Object.fromEntries(
      Object.entries(bag.numeric).filter((entry): entry is [string, number] => entry[1] !== 0),
    ),
    booleanProps: Object.fromEntries(
      Object.entries(bag.booleanProps).filter((entry): entry is [string, true] => Boolean(entry[1])),
    ),
    opaqueTokens: normalizeUnique(bag.opaqueTokens),
  }
}

function addNumericProperty(
  bag: EquipmentPropertyBag,
  key: keyof EquipmentPropertyBag['numeric'],
  value: number,
): void {
  if (value === 0) {
    return
  }

  bag.numeric[key] = (bag.numeric[key] ?? 0) + value
}

function addFlagProperty(
  bag: EquipmentPropertyBag,
  key: keyof EquipmentPropertyBag['booleanProps'],
): void {
  bag.booleanProps[key] = true
}

function sequenceValue(value: string): number | null {
  if (!/^[+-]+$/.test(value)) {
    return null
  }

  const direction = value[0] === '+' ? 1 : -1
  return direction * value.length
}

function addPropertyTokenToBag(bag: EquipmentPropertyBag, token: string): void {
  const exactFlagKey = BOOLEAN_PROPERTY_KEYS_BY_TOKEN[token]
  if (exactFlagKey) {
    addFlagProperty(bag, exactFlagKey)
    return
  }

  const numericSequenceMatch = token.match(/^(rF|rC|rN|Will|RegenMP|Regen|Stlth)([+-]+)$/)
  if (numericSequenceMatch) {
    const value = sequenceValue(numericSequenceMatch[2])
    if (value !== null) {
      addNumericProperty(bag, NUMERIC_SEQUENCE_KEYS_BY_PREFIX[numericSequenceMatch[1]], value)
      return
    }
  }

  const numericSignedMatch = token.match(/^(Str|Int|Dex|Slay|AC|EV|SH|HP|MP)([+-]\d+)$/)
  if (numericSignedMatch) {
    addNumericProperty(
      bag,
      NUMERIC_SIGNED_KEYS_BY_PREFIX[numericSignedMatch[1]],
      Number.parseInt(numericSignedMatch[2], 10),
    )
    return
  }

  bag.opaqueTokens.push(token)
}

export function classifyPropertyTokens(
  slot: EquipmentSlot,
  tokens: readonly string[],
): ClassifiedPropertyTokens {
  const bag = emptyPropertyBag()
  const gizmoEffects: EquipmentGizmoEffect[] = []
  const namedEffects: EquipmentNamedEffect[] = []
  const ashenzariCurses: EquipmentAshenzariCurse[] = []

  for (const token of tokens) {
    if (slot === 'gizmo' && GIZMO_EFFECT_TOKENS.has(token)) {
      gizmoEffects.push(token as EquipmentGizmoEffect)
      continue
    }

    if (slot !== 'gizmo' && NAMED_EFFECT_TOKENS.has(token)) {
      namedEffects.push(token as EquipmentNamedEffect)
      continue
    }

    if (ASHENZARI_CURSE_TOKENS.has(token)) {
      ashenzariCurses.push(token as EquipmentAshenzariCurse)
      continue
    }

    addPropertyTokenToBag(bag, token)
  }

  return {
    bag: normalizePropertyBag(bag),
    gizmoEffects: normalizeUnique(gizmoEffects) as EquipmentGizmoEffect[],
    namedEffects: normalizeUnique(namedEffects) as EquipmentNamedEffect[],
    ashenzariCurses: normalizeUnique(ashenzariCurses) as EquipmentAshenzariCurse[],
  }
}

export function bagFromTokens(tokens: readonly string[]): EquipmentPropertyBag {
  const bag = emptyPropertyBag()

  for (const token of tokens) {
    addPropertyTokenToBag(bag, token)
  }

  return normalizePropertyBag(bag)
}

export function mergePropertyBags(...bags: readonly EquipmentPropertyBag[]): EquipmentPropertyBag {
  const merged = emptyPropertyBag()

  for (const bag of bags) {
    for (const key of NUMERIC_PROPERTY_ORDER) {
      const value = bag.numeric[key]
      if (value === undefined || value === 0) {
        continue
      }

      addNumericProperty(merged, key, value)
    }

    for (const key of BOOLEAN_PROPERTY_ORDER) {
      if (bag.booleanProps[key]) {
        addFlagProperty(merged, key)
      }
    }

    merged.opaqueTokens.push(...bag.opaqueTokens)
  }

  return normalizePropertyBag(merged)
}

export function hasPropertyBagContent(bag: EquipmentPropertyBag): boolean {
  return (
    Object.keys(bag.numeric).length > 0
    || Object.keys(bag.booleanProps).length > 0
    || bag.opaqueTokens.length > 0
  )
}

export function overlayPropertyBag(
  base: EquipmentPropertyBag,
  overlay: EquipmentPropertyBag,
): EquipmentPropertyBag {
  const merged = mergePropertyBags(base)

  for (const key of NUMERIC_PROPERTY_ORDER) {
    const value = overlay.numeric[key]
    if (value === undefined) {
      continue
    }

    merged.numeric[key] = value
  }

  for (const key of BOOLEAN_PROPERTY_ORDER) {
    if (overlay.booleanProps[key]) {
      merged.booleanProps[key] = true
    }
  }

  merged.opaqueTokens = normalizeUnique([...merged.opaqueTokens, ...overlay.opaqueTokens])
  return normalizePropertyBag(merged)
}

export function subtractPropertyBags(
  minuend: EquipmentPropertyBag,
  subtrahend: EquipmentPropertyBag,
): EquipmentPropertyBag {
  const difference = emptyPropertyBag()

  for (const key of NUMERIC_PROPERTY_ORDER) {
    const value = (minuend.numeric[key] ?? 0) - (subtrahend.numeric[key] ?? 0)
    if (value !== 0) {
      difference.numeric[key] = value
    }
  }

  for (const key of BOOLEAN_PROPERTY_ORDER) {
    if (minuend.booleanProps[key] && !subtrahend.booleanProps[key]) {
      difference.booleanProps[key] = true
    }
  }

  const baseSpecials = new Set(subtrahend.opaqueTokens)
  difference.opaqueTokens = minuend.opaqueTokens.filter((value) => !baseSpecials.has(value))

  return normalizePropertyBag(difference)
}

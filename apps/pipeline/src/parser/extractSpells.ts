import {
  canonicalizeSpellNames,
  extractSpells as extractSpellsCore,
} from '../../../../packages/parser/src/index'
import type { SpellSnapshot } from '../types'

export { canonicalizeSpellNames }

export function extractSpells(
  text: string,
  options?: {
    canonicalSpellNames?: readonly string[]
  },
): SpellSnapshot[] {
  return extractSpellsCore(text, options)
}

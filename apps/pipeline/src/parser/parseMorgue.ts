import type {
  ParseFailureRecord,
  ParsedMorgueRecord,
  ParseMorgueMetadata,
} from '../types'
import { parseMorgueText } from '../../../../packages/parser/src/index'

export type ParseMorgueMeta = ParseMorgueMetadata

export type ParseMorgueResult =
  | {
      ok: true
      record: ParsedMorgueRecord
    }
  | {
      ok: false
      failure: ParseFailureRecord
    }

export function parseMorgue(text: string, meta: ParseMorgueMeta): ParseMorgueResult {
  const parsed = parseMorgueText(text)

  if (!parsed.ok) {
    return {
      ok: false,
      failure: parsed.failure,
    }
  }

  const { playerName: _parsedPlayerName, ...record } = parsed.record
  const mergedRecord: ParsedMorgueRecord = {
    ...record,
    ...meta,
  }

  return {
    ok: true,
    record: mergedRecord,
  }
}

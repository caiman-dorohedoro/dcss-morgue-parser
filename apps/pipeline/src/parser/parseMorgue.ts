import type {
  ParseFailureRecord,
  ParsedMorgueRecord,
  ParseMorgueMetadata,
} from '../types'
import { parseMorgueText } from 'dcss-morgue-parser'

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

function normalizePlayerName(value: string): string {
  return value.trim().toLowerCase()
}

export function parseMorgue(text: string, meta: ParseMorgueMeta): ParseMorgueResult {
  const parsed = parseMorgueText(text)

  if (!parsed.ok) {
    return {
      ok: false,
      failure: parsed.failure,
    }
  }

  if (
    parsed.record.playerName
    && normalizePlayerName(parsed.record.playerName) !== normalizePlayerName(meta.playerName)
  ) {
    return {
      ok: false,
      failure: {
        reason: 'morgue_player_name_mismatch',
        detail: `parsed=${parsed.record.playerName}, candidate=${meta.playerName}`,
      },
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

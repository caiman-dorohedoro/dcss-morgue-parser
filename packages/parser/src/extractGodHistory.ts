import { canonicalizeGodName } from './canonicalGodNames'
import type { GodHistoryEvent } from './types'

const NOTE_LINE_PATTERN = /^\s*(\d+)\s+\|\s+([^|]+?)\s+\|\s+(.+)$/gm

function parseRank(stars: string): number {
  return stars.length
}

function buildEvent(
  type: GodHistoryEvent['type'],
  turnText: string,
  place: string,
  godText: string,
  pietyRank?: number,
): GodHistoryEvent {
  return {
    type,
    turn: Number(turnText),
    place: place.trim(),
    god: canonicalizeGodName(godText),
    ...(pietyRank === undefined ? {} : { pietyRank }),
  }
}

export function extractGodHistory(text: string): GodHistoryEvent[] {
  const history: GodHistoryEvent[] = []

  for (const match of text.matchAll(NOTE_LINE_PATTERN)) {
    const [, turn, place, rawMessage] = match
    const message = rawMessage.trim()

    const joinMatch = message.match(/^Became a worshipper of (.+?)\.?$/)

    if (joinMatch) {
      history.push(buildEvent('join', turn, place, joinMatch[1]))
      continue
    }

    const abandonMatch = message.match(/^Fell from the grace of (.+?)\.?$/)

    if (abandonMatch) {
      history.push(buildEvent('abandon', turn, place, abandonMatch[1]))
      continue
    }

    const penanceMatch = message.match(/^Was placed under penance by (.+?)\.?$/)

    if (penanceMatch) {
      history.push(buildEvent('penance', turn, place, penanceMatch[1]))
      continue
    }

    const forgivenMatch = message.match(/^Was forgiven by (.+?)\.?$/)

    if (forgivenMatch) {
      history.push(buildEvent('forgiven', turn, place, forgivenMatch[1]))
      continue
    }

    const giftMatch = message.match(/^Received a gift from (.+?)\.?$/)

    if (giftMatch) {
      history.push(buildEvent('gift', turn, place, giftMatch[1]))
      continue
    }

    const pietyMatch = message.match(/^Reached (\*{1,6}) piety under (.+?)\.?$/)

    if (pietyMatch) {
      history.push(buildEvent('piety_rank', turn, place, pietyMatch[2], parseRank(pietyMatch[1])))
    }
  }

  return history
}

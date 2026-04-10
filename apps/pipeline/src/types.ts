import type {
  ArtifactKind,
  BaseStatsSnapshot,
  EquipmentAshenzariCurse,
  EquipmentBooleanPropertyKey,
  EquipmentEquipState,
  EquipmentGizmoEffect,
  EquipmentItemSnapshot,
  EquipmentNamedEffect,
  EquipmentNumericPropertyKey,
  EquipmentObjectClass,
  EquipmentPropertyBag,
  EquipmentSnapshot,
  FormSnapshot,
  MorgueVersion,
  MutationEntrySnapshot,
  MutationSnapshot,
  ParseFailureRecord,
  ParsedMorgueTextRecord,
  SkillLevelsSnapshot,
  SkillsSnapshot,
  SpellSnapshot,
} from '../../../packages/parser/src/index'

export type TargetVersion = '0.34' | 'trunk'

export type ServerId = (typeof ACTIVE_SERVER_IDS)[number]

export type LogfileManifest = {
  url: string
  sourceVersionLabel: string
}

export type MorgueRule =
  | {
      kind: 'morgue-player-dir'
      baseUrl: string
    }
  | {
      kind: 'rawdata-player-dir'
      baseUrl: string
    }

export type ServerManifest = {
  id: ServerId
  host: string
  buckets: readonly TargetVersion[]
  logfiles: Record<TargetVersion, LogfileManifest>
  morgueRule: MorgueRule
}

export type LogfileOffsetRow = {
  serverId: ServerId
  version: TargetVersion
  logfileUrl: string
  byteOffset: number
  updatedAt: string
}

export type CandidateGame = {
  candidateId: string
  serverId: ServerId
  version: TargetVersion
  sourceVersionLabel: string
  playerName: string
  xl: number | null
  species: string | null
  background: string | null
  god: string | null
  endMessage: string
  startedAt: string
  endedAt: string
  logfileUrl: string
  rawXlogLine: string
  discoveredAt: string
  sampledBootstrapAt: string | null
  sampledIncrementalAt: string | null
}

export type CandidateFilterOptions = {
  minXl?: number
  species?: readonly string[]
  backgrounds?: readonly string[]
  gods?: readonly string[]
}

export type SamplingMode = 'deterministic' | 'random'
export type {
  ArtifactKind,
  BaseStatsSnapshot,
  EquipmentAshenzariCurse,
  EquipmentBooleanPropertyKey,
  EquipmentEquipState,
  EquipmentGizmoEffect,
  EquipmentItemSnapshot,
  EquipmentNamedEffect,
  EquipmentNumericPropertyKey,
  EquipmentObjectClass,
  EquipmentPropertyBag,
  EquipmentSnapshot,
  FormSnapshot,
  MorgueVersion,
  MutationEntrySnapshot,
  MutationSnapshot,
  ParseFailureRecord,
  ParsedMorgueTextRecord,
  SkillLevelsSnapshot,
  SkillsSnapshot,
  SpellSnapshot,
}

export type ParseMorgueMetadata = {
  candidateId: string
  serverId: ServerId
  playerName: string
  sourceVersionLabel: string
  endedAt: string
  morgueUrl: string
}

export type ParsedMorgueRecord = Omit<ParsedMorgueTextRecord, 'playerName'> & ParseMorgueMetadata

export type MorgueFetchStatus = 'success' | 'not_found' | 'timeout' | 'invalid' | 'error'

export type MorgueFetchRow = {
  candidateId: string
  morgueUrl: string
  fetchStatus: MorgueFetchStatus
  httpStatus: number | null
  localPath: string | null
  lastError: string | null
  fetchedAt: string
}

export type ParseSuccessRow = {
  candidateId: string
  parseStatus: 'success'
  parsedJson: unknown
  failureCode: null
  failureDetail: null
  parsedAt: string
}

export type ParseFailureRow = {
  candidateId: string
  parseStatus: 'failure'
  parsedJson: null
  failureCode: string
  failureDetail: string | null
  parsedAt: string
}

export type ParseResultRow = ParseSuccessRow | ParseFailureRow

export const ACTIVE_SERVER_IDS = [
  'CBRG',
  'CNC',
  'CDI',
  'CXC',
  'CBR2',
  'CAO',
  'LLD',
  'CPO',
] as const

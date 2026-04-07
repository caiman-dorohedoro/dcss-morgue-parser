import { ACTIVE_SERVER_IDS, type ServerId, type ServerManifest, type TargetVersion } from '../types'

const TARGET_BUCKETS = ['0.34', 'trunk'] as const satisfies readonly TargetVersion[]

export const SERVER_MANIFEST = Object.freeze({
  CBRG: {
    id: 'CBRG',
    host: 'crawl-br.roguelikes.gg',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'https://crawl-br.roguelikes.gg/meta/0.34/logfile',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'https://crawl-br.roguelikes.gg/meta/git/logfile',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'https://crawl-br.roguelikes.gg/morgue',
    },
  },
  CNC: {
    id: 'CNC',
    host: 'archive.nemelex.cards',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'https://archive.nemelex.cards/meta/crawl-0.34/logfile',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'https://archive.nemelex.cards/meta/crawl-git/logfile',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'https://archive.nemelex.cards/morgue',
    },
  },
  CDI: {
    id: 'CDI',
    host: 'crawl.dcss.io',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'https://crawl.dcss.io/crawl/meta/crawl-0.34/logfile',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'https://crawl.dcss.io/crawl/meta/crawl-git/logfile',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'https://crawl.dcss.io/crawl/morgue',
    },
  },
  CXC: {
    id: 'CXC',
    host: 'crawl.xtahua.com',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'https://crawl.xtahua.com/crawl/meta/0.34/logfile',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'https://crawl.xtahua.com/crawl/meta/git/logfile',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'https://crawl.xtahua.com/crawl/morgue',
    },
  },
  CBR2: {
    id: 'CBR2',
    host: 'cbro.berotato.org',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'https://cbro.berotato.org/meta/0.34/logfile',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'https://cbro.berotato.org/meta/git/logfile',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'https://cbro.berotato.org/morgue',
    },
  },
  CAO: {
    id: 'CAO',
    host: 'crawl.akrasiac.org',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'http://crawl.akrasiac.org/logfile34',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'http://crawl.akrasiac.org/logfile-git',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'rawdata-player-dir',
      baseUrl: 'http://crawl.akrasiac.org/rawdata',
    },
  },
  LLD: {
    id: 'LLD',
    host: 'lazy-life.ddo.jp',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'http://lazy-life.ddo.jp/meta/0.34/logfile',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'http://lazy-life.ddo.jp/meta/trunk/logfile',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'http://lazy-life.ddo.jp:8080/morgue',
    },
  },
  CPO: {
    id: 'CPO',
    host: 'crawl.project357.org',
    buckets: TARGET_BUCKETS,
    logfiles: {
      '0.34': {
        url: 'https://crawl.project357.org/dcss-logfiles-0.34',
        sourceVersionLabel: '0.34',
      },
      trunk: {
        url: 'https://crawl.project357.org/dcss-logfiles-trunk',
        sourceVersionLabel: 'git',
      },
    },
    morgueRule: {
      kind: 'morgue-player-dir',
      baseUrl: 'https://crawl.project357.org/morgue',
    },
  },
} as const satisfies Record<ServerId, ServerManifest>)

export function getServerManifest(serverId: ServerId): ServerManifest {
  return SERVER_MANIFEST[serverId]
}

export function getBucketForSourceVersion(
  serverId: ServerId,
  sourceVersionLabel: string,
): TargetVersion {
  if (sourceVersionLabel === 'git' || sourceVersionLabel === 'trunk') {
    return 'trunk'
  }

  const versionMatch = sourceVersionLabel.match(/^0\.(\d+)(?:[.-].*)?$/)

  if (versionMatch) {
    const minorVersion = Number.parseInt(versionMatch[1], 10)

    if (minorVersion === 34) {
      return '0.34'
    }

    if (minorVersion > 34) {
      return 'trunk'
    }
  }

  throw new Error(`Unsupported source version for ${serverId}: ${sourceVersionLabel}`)
}

export { ACTIVE_SERVER_IDS }

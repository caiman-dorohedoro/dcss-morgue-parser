import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Check, Copy } from 'lucide-react'
import {
  parseMorgueText,
  type EquipmentItemSnapshot,
  type MutationEntrySnapshot,
  type ParsedMorgueTextRecord,
  type SkillLevelsSnapshot,
  type SpellSnapshot,
} from '../../../packages/parser/src/index'
import { defaultMorgueText } from './defaultMorgue'

type EquipmentGroup = {
  label: string
  summary: string[]
  details?: EquipmentItemSnapshot[]
}

const SKILL_LABELS: Record<keyof SkillLevelsSnapshot, string> = {
  fighting: 'Fighting',
  macesFlails: 'Maces & Flails',
  axes: 'Axes',
  polearms: 'Polearms',
  staves: 'Staves',
  unarmedCombat: 'Unarmed',
  throwing: 'Throwing',
  shortBlades: 'Short Blades',
  longBlades: 'Long Blades',
  rangedWeapons: 'Ranged',
  armour: 'Armour',
  dodging: 'Dodging',
  shields: 'Shields',
  stealth: 'Stealth',
  spellcasting: 'Spellcasting',
  conjurations: 'Conjurations',
  hexes: 'Hexes',
  summonings: 'Summonings',
  necromancy: 'Necromancy',
  forgecraft: 'Forgecraft',
  translocations: 'Translocations',
  transmutations: 'Transmutations',
  alchemy: 'Alchemy',
  fireMagic: 'Fire',
  iceMagic: 'Ice',
  airMagic: 'Air',
  earthMagic: 'Earth',
  poisonMagic: 'Poison',
  invocations: 'Invocations',
  evocations: 'Evocations',
  shapeshifting: 'Shapeshifting',
}

function formatNullable(value: string | null | undefined) {
  if (!value || value === 'none') {
    return 'None'
  }

  return value
}

function formatSkillValue(value: number) {
  return value.toFixed(value % 1 === 0 ? 0 : 1)
}

function summarizePropertyBag(item: EquipmentItemSnapshot) {
  const segments: string[] = []

  const numericEntries = Object.entries(item.properties.numeric).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
  if (numericEntries.length > 0) {
    segments.push(
      ...numericEntries.map(([key, value]) => {
        const sign = value > 0 ? '+' : ''
        return `${key} ${sign}${value}`
      }),
    )
  }

  const flags = Object.keys(item.properties.booleanProps)
  if (flags.length > 0) {
    segments.push(...flags)
  }

  if (item.properties.opaqueTokens.length > 0) {
    segments.push(...item.properties.opaqueTokens)
  }

  return segments
}

function buildEquipmentGroups(record: ParsedMorgueTextRecord): EquipmentGroup[] {
  return [
    {
      label: 'Body',
      summary: [record.bodyArmour],
      details: record.bodyArmourDetails ? [record.bodyArmourDetails] : undefined,
    },
    {
      label: 'Shield',
      summary: [record.shield],
      details: record.shieldDetails ? [record.shieldDetails] : undefined,
    },
    {
      label: 'Aux',
      summary: [...record.helmets, ...record.cloaks, ...record.gloves, ...record.footwear],
      details: [
        ...(record.helmetDetails ?? []),
        ...(record.cloakDetails ?? []),
        ...(record.glovesDetails ?? []),
        ...(record.footwearDetails ?? []),
      ],
    },
    {
      label: 'Jewellery',
      summary: [...record.amulets, ...record.rings],
      details: [...(record.amuletDetails ?? []), ...(record.ringDetails ?? [])],
    },
    {
      label: 'Special',
      summary: [record.orb, record.gizmo, record.talisman].filter(Boolean) as string[],
      details: [record.orbDetails, record.gizmoDetails, record.talismanDetails].filter(
        (value): value is EquipmentItemSnapshot => Boolean(value),
      ),
    },
  ]
}

function getTopSkills(skills: SkillLevelsSnapshot, effectiveSkills: SkillLevelsSnapshot) {
  return (Object.keys(SKILL_LABELS) as (keyof SkillLevelsSnapshot)[])
    .map((key) => ({
      key,
      label: SKILL_LABELS[key],
      base: skills[key],
      effective: effectiveSkills[key],
    }))
    .filter((entry) => entry.effective > 0 || entry.base > 0)
    .sort((left, right) => right.effective - left.effective || right.base - left.base)
    .slice(0, 10)
}

function splitSpells(spells: SpellSnapshot[]) {
  return {
    memorized: spells.filter((spell) => spell.memorized),
    library: spells.filter((spell) => !spell.memorized),
  }
}

function handleFailureDetail(detail: string | null) {
  return detail ?? 'The parser could not recognize the morgue layout.'
}

function App() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(() => parseMorgueText(''))
  const deferredInput = useDeferredValue(input)
  const fileInputId = useId()
  const textAreaId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    startTransition(() => {
      setResult(parseMorgueText(deferredInput))
    })
  }, [deferredInput])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    setInput(text)
    event.target.value = ''
  }

  const lineCount = input.length === 0 ? 0 : input.split(/\r?\n/).length

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Skip to Main Content
      </a>
      <header className="hero">
        <div>
          <p className="eyebrow">Interactive parser playground</p>
          <h1>DCSS morgue viewer</h1>
        </div>
        <div className="hero-stats">
          <span>{lineCount} lines</span>
          <span>{input.length.toLocaleString()} chars</span>
          <span>{result.ok ? 'Parse OK' : 'Needs Attention'}</span>
        </div>
      </header>
      <p aria-live="polite" className="sr-only">
        {input.trim().length === 0
          ? 'No morgue text loaded.'
          : result.ok
            ? `Parse completed. ${lineCount} lines loaded.`
            : `Parse failed: ${result.failure.reason}.`}
      </p>

      <main className="workspace" id="main-content">
        <section className="panel input-panel">
          <div className="panel-header">
            <div>
              <h2>Raw morgue</h2>
            </div>
            <div className="panel-actions">
              <button className="ghost-button" onClick={() => setInput(defaultMorgueText)} type="button">
                Load Sample
              </button>
              <button className="ghost-button" onClick={() => setInput('')} type="button">
                Clear
              </button>
              <button
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload
              </button>
              <input
                className="sr-only"
                id={fileInputId}
                name="morgueFile"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
                accept=".txt,.log,.morgue,text/plain"
              />
            </div>
          </div>
          <textarea
            aria-label="Morgue text"
            autoComplete="off"
            className="morgue-input"
            id={textAreaId}
            name="morgueText"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste a morgue file here…"
            spellCheck={false}
            value={input}
          />
        </section>

        <section className="panel output-panel">
          <div className="panel-header">
            <div>
              <h2>Structured view</h2>
            </div>
          </div>

          {input.trim().length === 0 ? (
            <EmptyState />
          ) : result.ok ? (
            <ParsedView record={result.record} />
          ) : (
            <FailureView detail={handleFailureDetail(result.failure.detail)} reason={result.failure.reason} />
          )}
        </section>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h3>Nothing to parse yet</h3>
      <p>Paste a morgue file or load the bundled sample to start inspecting the parser output.</p>
    </div>
  )
}

function FailureView(props: { reason: string; detail: string }) {
  return (
    <div className="failure-state">
      <div className="status-pill status-pill-failure">Parse failed</div>
      <h3>{props.reason}</h3>
      <p>{props.detail}</p>
    </div>
  )
}

function ParsedView(props: { record: ParsedMorgueTextRecord }) {
  const { record } = props
  const equipmentGroups = buildEquipmentGroups(record)
  const topSkills = getTopSkills(record.skills, record.effectiveSkills)
  const spells = splitSpells(record.spells)
  const [copied, setCopied] = useState(false)
  const rawJson = JSON.stringify(record, null, 2)

  async function handleCopyRawJson() {
    try {
      await navigator.clipboard.writeText(rawJson)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="parsed-view">
      <section className="summary-grid">
        <SummaryCard label="Character" value={record.playerName ?? 'Unknown'} accent />
        <SummaryCard label="Lineage" value={[record.species, record.speciesVariant].filter(Boolean).join(' / ')} />
        <SummaryCard label="Background" value={formatNullable(record.background)} />
        <SummaryCard label="God" value={formatNullable(record.god)} />
        <SummaryCard label="Version" value={record.version} />
        <SummaryCard label="Form" value={formatNullable(record.form)} />
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h3>Core stats</h3>
        </div>
        <div className="stats-layout">
          <div className="stat-group stat-group-progression">
            <span className="stat-group-label">Progression</span>
            <div className="stat-list">
              <Metric label="XL" value={record.xl} />
            </div>
          </div>
          <div className="stat-group stat-group-defense">
            <span className="stat-group-label">Defense</span>
            <div className="stat-list">
              <Metric label="AC" value={record.ac} />
              <Metric label="EV" value={record.ev} />
              <Metric label="SH" value={record.sh} />
            </div>
          </div>
          <div className="stat-group stat-group-attributes">
            <span className="stat-group-label">Attributes</span>
            <div className="stat-list">
              <Metric label="Str" value={record.strength} />
              <Metric label="Int" value={record.intelligence} />
              <Metric label="Dex" value={record.dexterity} />
            </div>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h3>Equipment</h3>
        </div>
        <div className="equipment-groups">
          {equipmentGroups.map((group) => (
            <article className="equipment-group" key={group.label}>
              <header>
                <span className="group-label">{group.label}</span>
                <span className="group-summary">{group.summary.filter((value) => value !== 'none').length} items</span>
              </header>
              {group.details && group.details.length > 0 ? (
                <div className="equipment-list">
                  {group.details.map((item) => (
                    <div className="equipment-item" key={`${group.label}:${item.displayName}:${item.equipState}`}>
                      <div className="equipment-main">
                        <strong>{item.displayName}</strong>
                        <span className="equipment-meta">
                          {item.objectClass} · {item.equipState}
                          {item.enchant !== null ? ` · +${item.enchant}` : ''}
                          {item.ego ? ` · ${item.ego}` : ''}
                        </span>
                      </div>
                      {summarizePropertyBag(item).length > 0 ? (
                        <div className="tag-row">
                          {summarizePropertyBag(item).map((token) => (
                            <span className="tag" key={`${item.displayName}:${token}`}>
                              {token}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">{group.summary.filter((value) => value !== 'none').join(', ') || 'None'}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="two-up">
        <article className="section-card">
          <div className="section-heading">
            <h3>Top skills</h3>
            <p>Highest effective values first.</p>
          </div>
          {topSkills.length > 0 ? (
            <div className="skill-list">
              {topSkills.map((skill) => (
                <div className="skill-row" key={String(skill.key)}>
                  <span>{skill.label}</span>
                  <div className="skill-values">
                    <strong>{formatSkillValue(skill.effective)}</strong>
                    {skill.base !== skill.effective ? (
                      <span className="muted-copy">base {formatSkillValue(skill.base)}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No trained skills were detected.</p>
          )}
        </article>

        <article className="section-card">
          <div className="section-heading">
            <h3>Mutations</h3>
          </div>
          {record.mutations.length > 0 ? (
            <div className="mutation-list">
              {record.mutations.map((mutation) => (
                <MutationRow key={`${mutation.name}:${mutation.level ?? 'none'}`} mutation={mutation} />
              ))}
            </div>
          ) : (
            <p className="muted-copy">No mutations parsed.</p>
          )}
        </article>
      </section>

      <section className="two-up">
        <article className="section-card">
          <div className="section-heading">
            <h3>Memorized spells</h3>
            <p>{spells.memorized.length} parsed</p>
          </div>
          {spells.memorized.length > 0 ? (
            <SpellList spells={spells.memorized} />
          ) : (
            <p className="muted-copy">No memorized spells.</p>
          )}
        </article>

        <article className="section-card">
          <div className="section-heading">
            <h3>Spell library</h3>
            <p>{spells.library.length} parsed</p>
          </div>
          {spells.library.length > 0 ? (
            <SpellList spells={spells.library} />
          ) : (
            <p className="muted-copy">Spell library is empty.</p>
          )}
        </article>
      </section>

      <details className="json-drawer">
        <summary>
          <span>Raw JSON</span>
          <button
            aria-label="Copy raw JSON"
            className="icon-button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void handleCopyRawJson()
            }}
            title={copied ? 'Copied' : 'Copy raw JSON'}
            type="button"
          >
            {copied ? <Check aria-hidden="true" size={15} strokeWidth={2.1} /> : <Copy aria-hidden="true" size={15} strokeWidth={2.1} />}
          </button>
        </summary>
        <pre>{rawJson}</pre>
      </details>
    </div>
  )
}

function SummaryCard(props: { label: string; value: string; accent?: boolean }) {
  return (
    <article className={props.accent ? 'summary-card summary-card-accent' : 'summary-card'}>
      <span>{props.label}</span>
      <strong>{props.value || 'Unknown'}</strong>
    </article>
  )
}

function Metric(props: { label: string; value: number }) {
  return (
    <div className="metric-inline">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

function MutationRow(props: { mutation: MutationEntrySnapshot }) {
  const badges = [
    props.mutation.level !== null ? `L${props.mutation.level}` : null,
    props.mutation.suppressed ? 'suppressed' : null,
    props.mutation.transient ? 'transient' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="mutation-row">
      <span>{props.mutation.name}</span>
      <div className="tag-row">
        {badges.map((badge) => (
          <span className="tag" key={`${props.mutation.name}:${badge}`}>
            {badge}
          </span>
        ))}
      </div>
    </div>
  )
}

function SpellList(props: { spells: SpellSnapshot[] }) {
  return (
    <div className="spell-list">
      {props.spells.map((spell) => (
        <div className="spell-row" key={`${spell.name}:${spell.memorized}`}>
          <span>{spell.name}</span>
          <div className="tag-row">
            <span className="tag">{spell.castable ? 'castable' : 'unusable'}</span>
            <span className="tag">
              {spell.failurePercent === null ? 'N/A' : `${spell.failurePercent}% fail`}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default App

import { Check, ChevronRight, Copy } from 'lucide-react'
import { useState } from 'react'
import type {
  MutationEntrySnapshot,
  ParsedMorgueTextRecord,
  SpellSnapshot,
} from 'dcss-morgue-parser'
import {
  buildEquipmentGroups,
  formatEnchantValue,
  formatNullable,
  formatSkillValue,
  getTopSkills,
  splitSpells,
  summarizePropertyBag,
} from './viewerHelpers'

export function ParsedView(props: { record: ParsedMorgueTextRecord; sourceText: string }) {
  const { record, sourceText } = props
  const equipmentGroups = buildEquipmentGroups(record)
  const topSkills = getTopSkills(record.skills, record.effectiveSkills, sourceText)
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
        <SummaryCard label="Player" value={record.playerName ?? 'Unknown'} accent />
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
          <div className="stat-group">
            <span className="stat-group-label">Progression</span>
            <div className="stat-list">
              <Metric label="XL" value={record.xl} />
            </div>
          </div>
          <div className="stat-group">
            <span className="stat-group-label">Defense</span>
            <div className="stat-list">
              <Metric label="AC" value={record.ac} />
              <Metric label="EV" value={record.ev} />
              <Metric label="SH" value={record.sh} />
            </div>
          </div>
          <div className="stat-group">
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
                    <div className="equipment-item" key={`${group.label}:${item.rawName}:${item.equipState}`}>
                      <div className="equipment-main">
                        <div className="equipment-title-row">
                          <strong>{item.displayName}</strong>
                          {item.enchant !== null ? (
                            <span className="equipment-enchant">{formatEnchantValue(item.enchant)}</span>
                          ) : null}
                        </div>
                        <span className="equipment-meta">
                          {item.objectClass} · {item.equipState}
                          {item.ego ? ` · ${item.ego}` : ''}
                        </span>
                      </div>
                      {summarizePropertyBag(item).length > 0 ? (
                        <div className="tag-row">
                          {summarizePropertyBag(item).map((token) => (
                            <span className="tag" key={`${item.rawName}:${token}`}>
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
          <span className="summary-label">
            <ChevronRight aria-hidden="true" className="summary-chevron" size={15} strokeWidth={2.1} />
            <span>Raw JSON</span>
          </span>
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
          <span className="spell-name">{spell.name}</span>
          <div className="tag-row spell-badges">
            <span className="tag">{spell.failurePercent === null ? 'N/A' : `${spell.failurePercent}%`}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

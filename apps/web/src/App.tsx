import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { parseMorgueText } from 'dcss-morgue-parser'
import { ParsedView } from './ParsedView'
import {
  clearStoredInput,
  handleFailureDetail,
  readPersistPreference,
  readStoredInput,
  storeInput,
  storePersistPreference,
} from './viewerHelpers'

type ParseSnapshot = {
  result: ReturnType<typeof parseMorgueText>
  durationMs: number
}

function measureParse(text: string): ParseSnapshot {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const result = parseMorgueText(text)
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now()

  return {
    result,
    durationMs: Math.max(0, Math.round(end - start)),
  }
}

function App() {
  const [persistInput, setPersistInput] = useState(() => readPersistPreference())
  const [input, setInput] = useState(() => (readPersistPreference() ? readStoredInput() : ''))
  const [parseSnapshot, setParseSnapshot] = useState(() => measureParse(''))
  const deferredInput = useDeferredValue(input)
  const fileInputId = useId()
  const persistInputId = useId()
  const textAreaId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    startTransition(() => {
      setParseSnapshot(measureParse(deferredInput))
    })
  }, [deferredInput])

  useEffect(() => {
    try {
      storePersistPreference(persistInput)

      if (!persistInput) {
        clearStoredInput()
      }
    } catch {
      // Ignore storage write failures so the local viewer stays usable.
    }
  }, [persistInput])

  useEffect(() => {
    if (!persistInput) {
      return
    }

    try {
      storeInput(input)
    } catch {
      // Ignore storage write failures so the local viewer stays usable.
    }
  }, [input, persistInput])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    setInput(text)
    event.target.value = ''
  }

  function scrollMorgue(direction: 'top' | 'bottom') {
    const node = textAreaRef.current

    if (!node) {
      return
    }

    node.scrollTo({
      top: direction === 'top' ? 0 : node.scrollHeight,
      behavior: 'smooth',
    })
  }

  const lineCount = input.length === 0 ? 0 : input.split(/\r?\n/).length
  const { result, durationMs } = parseSnapshot

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
          <span>{durationMs} ms</span>
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
        <div className="input-panel-shell">
          <section className="panel input-panel">
            <div className="panel-header">
              <div>
                <h2>Raw morgue</h2>
              </div>
              <div className="panel-actions">
                <label className="persist-toggle" htmlFor={persistInputId}>
                  <input
                    checked={persistInput}
                    id={persistInputId}
                    onChange={(event) => setPersistInput(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Save</span>
                </label>
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
              ref={textAreaRef}
              spellCheck={false}
              value={input}
            />
          </section>
          <div className="morgue-scroll-shortcuts" aria-label="Raw morgue scroll shortcuts">
            <button
              aria-label="Scroll raw morgue to top"
              className="scroll-jump-button"
              onClick={() => scrollMorgue('top')}
              type="button"
            >
              <ArrowUp aria-hidden="true" size={15} strokeWidth={2.1} />
            </button>
            <button
              aria-label="Scroll raw morgue to bottom"
              className="scroll-jump-button"
              onClick={() => scrollMorgue('bottom')}
              type="button"
            >
              <ArrowDown aria-hidden="true" size={15} strokeWidth={2.1} />
            </button>
          </div>
        </div>

        <section className="panel output-panel">
          <div className="panel-header">
            <div>
              <h2>Structured view</h2>
            </div>
          </div>

          {input.trim().length === 0 ? (
            <EmptyState />
          ) : result.ok ? (
            <ParsedView record={result.record} sourceText={input} />
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
      <p>Paste a morgue file or upload one to start inspecting the parser output.</p>
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

export default App

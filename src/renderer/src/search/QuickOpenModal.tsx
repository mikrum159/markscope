import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

// Structurally matches main/search/searchDocuments.ts's SearchResult, kept
// as its own renderer-local type rather than imported across the
// main/renderer TypeScript project boundary - same reasoning as App.tsx's
// duplicated tree types from Slice 5 (see mvp-shape/log.md).
interface SearchResult {
  rootPath: string
  relativePath: string
  fileName: string
  title: string | null
  snippet: string
}

interface QuickOpenModalProps {
  onClose: () => void
  onOpenDocument: (rootPath: string, relativePath: string, name: string) => void
}

// Real query/results (Slice 21), replacing the Slice 12 placeholder shell.
// One ranked list against the whole catalog - no scope picker, no
// match-range highlighting, both deferred (see searchDocuments.ts). Esc and
// backdrop click close it; typing queries on every keystroke since a local
// SQLite FTS5 lookup is fast enough that debouncing would be premature.
export function QuickOpenModal({
  onClose,
  onOpenDocument
}: QuickOpenModalProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  // Guards against an older query's response landing after a newer one -
  // requests race over IPC and there's no cancellation, so the query that
  // fired a response has to identify itself as still current before it's
  // allowed to update state.
  const latestQueryRef = useRef('')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    latestQueryRef.current = trimmed
    if (!trimmed) return
    window.api.search.query(trimmed).then((found) => {
      if (latestQueryRef.current !== trimmed) return
      setResults(found)
      setActiveIndex(0)
    })
  }, [query])

  function openResult(result: SearchResult): void {
    onOpenDocument(result.rootPath, result.relativePath, result.fileName)
    onClose()
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (!query.trim() || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openResult(results[activeIndex])
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="quick-open"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="quick-open-header">
          <Search size={16} className="quick-open-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="quick-open-input"
            placeholder="Search all documents…"
            aria-label="Search all documents"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="quick-open-close"
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {query.trim() && (
          <ul className="quick-open-results" role="listbox">
            {results.length === 0 ? (
              <li className="quick-open-empty">No matches.</li>
            ) : (
              results.map((result, index) => (
                <li key={`${result.rootPath}::${result.relativePath}`}>
                  <button
                    type="button"
                    className="quick-open-result"
                    role="option"
                    aria-selected={index === activeIndex}
                    data-active={index === activeIndex ? 'true' : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openResult(result)}
                  >
                    <span className="quick-open-result-title">
                      {result.title ?? result.fileName}
                    </span>
                    <span className="quick-open-result-path">{result.relativePath}</span>
                    {result.snippet && (
                      <span className="quick-open-result-snippet">{result.snippet}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

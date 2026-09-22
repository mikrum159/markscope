import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidProps {
  code: string
}

type MermaidState =
  { status: 'loading' } | { status: 'ready'; svg: string } | { status: 'error'; message: string }

// Reads mermaid's theme colours from the resolved CSS custom properties
// (theme.css / ADR-0020) rather than hard-coding hex values here - mermaid's
// themeVariables API takes plain colour strings, computed at render time
// from whichever theme (light/dark) is currently active. This does not pick
// up a live OS theme flip on an already-rendered diagram - the SVG's colours
// are baked in at render time - which is an accepted gap for this slice.
function readMermaidThemeVariables(): Record<string, string> {
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string): string => styles.getPropertyValue(name).trim()
  return {
    background: token('--color-surface-sunken'),
    primaryColor: token('--color-surface'),
    primaryTextColor: token('--color-text'),
    primaryBorderColor: token('--color-border-strong'),
    secondaryColor: token('--color-accent-subtle'),
    tertiaryColor: token('--color-surface-hover'),
    lineColor: token('--color-text-muted'),
    textColor: token('--color-text'),
    nodeTextColor: token('--color-text'),
    edgeLabelBackground: token('--color-surface'),
    fontFamily: token('--font-sans')
  }
}

async function renderMermaid(id: string, code: string): Promise<string> {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: readMermaidThemeVariables()
  })
  const { svg } = await mermaid.render(id, code)
  return svg
}

export function Mermaid({ code }: MermaidProps): React.JSX.Element {
  const rawId = useId()
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  // key={code} at the call site remounts this component whenever the
  // diagram source changes, so state naturally starts back at 'loading'
  // rather than needing a synchronous reset inside the effect below.
  const [state, setState] = useState<MermaidState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    renderMermaid(diagramId, code)
      .then((svg) => {
        if (!cancelled) setState({ status: 'ready', svg })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Invalid diagram'
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, diagramId])

  if (state.status === 'loading') {
    return <div className="document-preview-mermaid-loading" aria-hidden="true" />
  }

  if (state.status === 'error') {
    return (
      <div className="document-preview-mermaid-error" role="alert">
        Couldn&apos;t render this diagram: {state.message}
      </div>
    )
  }

  return (
    <div
      className="document-preview-mermaid"
      // Mermaid's own output, generated locally from document content
      // already trusted enough to render (see DocumentPreview's PreviewCode
      // note) - not sanitized HTML from an external/attacker source.
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  )
}

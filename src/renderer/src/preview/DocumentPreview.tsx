import { type ComponentPropsWithoutRef, isValidElement, type JSX, useEffect, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import { Mermaid } from './Mermaid'
import { sanitizeSchema } from './sanitizeSchema'
import './preview.css'

interface DocumentPreviewProps {
  content: string
  rootPath: string
  documentPath: string
}

const EXTERNAL_HREF = /^(https?:|mailto:)/i
const DATA_URI = /^data:/i

// react-markdown's own defaultUrlTransform strips any URL whose protocol
// isn't in its safe list (http/https/ircs/mailto/xmpp) *before* the
// sanitize schema above is ever consulted - data: images would otherwise be
// blanked to '' here regardless of the schema's protocols.src allowance.
function urlTransform(value: string, key: string): string {
  if (key === 'src' && DATA_URI.test(value)) return value
  return defaultUrlTransform(value)
}

// Relative Markdown-link resolution is a later slice (mvp-shape.md's
// "Mermaid and relative assets" candidate); only genuinely external links
// are followable - anything else is rendered without an href so a click
// cannot navigate the window away (architecture.md §8: file links outside a
// trusted root are blocked; here, nothing is resolved to a trusted-root path
// yet, so nothing is followable).
function PreviewLink({ href, children }: ComponentPropsWithoutRef<'a'>): JSX.Element {
  if (typeof href === 'string' && EXTERNAL_HREF.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  return (
    <span
      className="document-preview-link-deferred"
      title="Opening linked documents isn't available yet"
    >
      {children}
    </span>
  )
}

interface PreviewImageProps {
  src?: string
  alt?: string
  rootPath: string
  documentPath: string
}

// Images are resolved through the same trusted-root IPC boundary as
// readMarkdownFile (architecture.md §8), relative to the *document's*
// directory - see readAsset.ts. External http(s) image URLs are
// deliberately NOT fetched: loading one would be an implicit network
// request with no explicit user action, which v0.1's no-network-surface
// property (architecture.md §3 principle 8) does not allow. data: URIs are
// already-inline and make no such request, so they pass straight through.
function PreviewImage({ src, alt, rootPath, documentPath }: PreviewImageProps): JSX.Element {
  const isExternal = typeof src === 'string' && EXTERNAL_HREF.test(src)
  const isDataUri = typeof src === 'string' && DATA_URI.test(src)
  const isLocalAsset = typeof src === 'string' && !isExternal && !isDataUri

  // key={...} at the call site (rootPath:documentPath:src) remounts this
  // component whenever the resolved image identity changes, so state starts
  // back at null naturally instead of needing a synchronous reset here.
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (isLocalAsset) {
      window.api.workspace.readAsset(rootPath, documentPath, src as string).then((dataUrl) => {
        if (!cancelled) setResolvedSrc(dataUrl)
      })
    }

    return () => {
      cancelled = true
    }
  }, [src, rootPath, documentPath, isLocalAsset])

  if (isDataUri) return <img src={src} alt={alt} />

  if (isExternal) {
    return (
      <span
        className="document-preview-image-deferred"
        title="Loading remote images isn't available yet"
      >
        {alt || 'Image'}
      </span>
    )
  }

  if (!resolvedSrc) {
    return <span className="document-preview-image-pending">{alt || 'Image'}</span>
  }

  return <img src={resolvedSrc} alt={alt} />
}

function isMermaidLanguage(className: unknown): boolean {
  return typeof className === 'string' && className.split(' ').includes('language-mermaid')
}

// Mermaid fences are rendered as diagrams, not as highlighted code - 'mermaid'
// isn't a language rehype-highlight recognises, so (with ignoreMissing) its
// text child reaches here unmodified. Every other language passes through
// unchanged, already highlighted by rehype-highlight upstream in the rehype
// pipeline; nothing here has to know what languages exist.
function PreviewCode({ className, children }: ComponentPropsWithoutRef<'code'>): JSX.Element {
  if (isMermaidLanguage(className)) {
    const code = String(children).replace(/\n$/, '')
    return <Mermaid key={code} code={code} />
  }

  return <code className={className}>{children}</code>
}

// A Mermaid diagram shouldn't sit inside a <pre> styled as a code block -
// unwrap it. children here is the *unrendered* <PreviewCode> element (React
// only invokes it once PreviewPre itself has returned), so mermaid-ness is
// read off its className prop directly rather than off what it renders to.
function PreviewPre({ children }: ComponentPropsWithoutRef<'pre'>): JSX.Element {
  const child = Array.isArray(children) ? children[0] : children
  const childClassName = isValidElement(child)
    ? (child.props as { className?: unknown }).className
    : undefined

  if (isMermaidLanguage(childClassName)) return <>{children}</>

  return <pre>{children}</pre>
}

export function DocumentPreview({
  content,
  rootPath,
  documentPath
}: DocumentPreviewProps): JSX.Element {
  return (
    <div className="document-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
        rehypePlugins={[
          // Slugs heading ids before sanitize runs - ../preview/headings.ts
          // computes the same ids off the raw markdown (fresh GithubSlugger,
          // document order) so OutlineRail can scroll to them. `id` is
          // already in rehype-sanitize's default schema, so no schema change
          // is needed here.
          rehypeSlug,
          [rehypeHighlight, { ignoreMissing: true }],
          [rehypeSanitize, sanitizeSchema]
        ]}
        components={{
          a: PreviewLink,
          img: ({ src, alt }) => (
            <PreviewImage
              key={`${rootPath}:${documentPath}:${src ?? ''}`}
              src={src}
              alt={alt}
              rootPath={rootPath}
              documentPath={documentPath}
            />
          ),
          code: PreviewCode,
          pre: PreviewPre
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

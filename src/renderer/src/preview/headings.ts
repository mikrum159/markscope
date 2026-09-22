import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import GithubSlugger from 'github-slugger'
import type { Heading, Root } from 'mdast'
import { HEADING_ID_PREFIX } from './sanitizeSchema'

export interface OutlineHeading {
  id: string
  text: string
  // 0-based, relative to the shallowest heading level actually used in the
  // document - so a document starting at H2 still renders its top level
  // flush left, matching design-v1.html's outline rail indentation.
  depth: number
}

// Same parser react-markdown builds internally (remark-parse + remark-gfm),
// used here only to walk the AST for heading text - DocumentPreview does the
// actual rendering. Kept as a module-level singleton since it's stateless
// and safe to reuse across parses.
const parser = unified().use(remarkParse).use(remarkGfm)

// Slugs must match DocumentPreview's rehype-slug output exactly, so a click
// can scroll to the right element. rehype-slug slugs each heading's plain
// rendered text with a fresh GithubSlugger per document, in document order;
// this mirrors that exactly using the plain text mdast-util-to-string
// extracts from the same parse tree.
export function extractHeadings(content: string): OutlineHeading[] {
  const tree = parser.parse(content) as Root
  const raw: { level: number; text: string }[] = []

  visit(tree, 'heading', (node: Heading) => {
    const text = toString(node).trim()
    if (text) raw.push({ level: node.depth, text })
  })

  if (raw.length === 0) return []

  const slugger = new GithubSlugger()
  const minLevel = Math.min(...raw.map((heading) => heading.level))

  return raw.map((heading) => ({
    id: HEADING_ID_PREFIX + slugger.slug(heading.text),
    text: heading.text,
    depth: heading.level - minLevel
  }))
}

export interface ActiveHeadingPath {
  // The depth-0 heading the active heading falls under (itself, if the
  // active heading is already depth 0). Null if nothing is active yet.
  topLevel: OutlineHeading | null
  // The exact active heading. Same object as `topLevel` when it's depth 0 -
  // callers that want a deduplicated two-segment path (OutlineRail's
  // two-tier highlight, Breadcrumb's second segment) compare ids rather than
  // rendering both.
  active: OutlineHeading | null
}

// Walks the flat heading list up to the active heading, keeping the last
// depth-0 heading seen along the way - headings render in document order, so
// that's the active heading's nearest top-level ancestor.
export function findActiveHeadingPath(
  headings: OutlineHeading[],
  activeId: string | null
): ActiveHeadingPath {
  if (activeId === null) return { topLevel: null, active: null }

  let topLevel: OutlineHeading | null = null
  for (const heading of headings) {
    if (heading.depth === 0) topLevel = heading
    if (heading.id === activeId) return { topLevel, active: heading }
  }
  return { topLevel: null, active: null }
}

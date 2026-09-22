import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import type { Heading, Root } from 'mdast'

// Same parser combination as the renderer's preview/headings.ts, but not
// imported from there directly - that module lives in the renderer bundle
// and also tracks slugs/depth for the outline rail, which the search index
// doesn't need. This is a separate, simpler extraction: plain heading text
// only, for the documents_fts `headings` column.
//
// unwrapEsm: electron-vite's main build externalizes these packages
// (they're in package.json `dependencies`) rather than bundling them, so
// they reach the app as raw `require()` calls Node resolves as native ESM -
// each comes back as `{ __esModule: true, default: <plugin> }` with nothing
// in the build unwrapping it, unlike the renderer's Vite/Rollup bundle,
// which does. Passing the wrapper straight to `.use()` fails at runtime
// ("received an empty preset") even though it type-checks fine - caught by
// the required manual `npm run dev` check, not by typecheck/lint/test.
function unwrapEsm<T>(mod: T): T {
  return (mod as unknown as { default?: T }).default ?? mod
}

const parser = unified().use(unwrapEsm(remarkParse)).use(unwrapEsm(remarkGfm))

export function extractHeadingTexts(content: string): string[] {
  const tree = parser.parse(content) as Root
  const texts: string[] = []
  visit(tree, 'heading', (node: Heading) => {
    const text = toString(node).trim()
    if (text) texts.push(text)
  })
  return texts
}

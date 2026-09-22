import { describe, expect, it } from 'vitest'
import { extractHeadings, findActiveHeadingPath } from './headings'
import { HEADING_ID_PREFIX } from './sanitizeSchema'

function id(slug: string): string {
  return HEADING_ID_PREFIX + slug
}

describe('extractHeadings', () => {
  it('returns an empty list for a document with no headings', () => {
    expect(extractHeadings('Just body text.\n\nNo headings here.')).toEqual([])
  })

  it('computes depth relative to the shallowest heading used, not the raw H-level', () => {
    const content = ['## Top', '### Nested', '## Sibling'].join('\n\n')

    expect(extractHeadings(content)).toEqual([
      { id: id('top'), text: 'Top', depth: 0 },
      { id: id('nested'), text: 'Nested', depth: 1 },
      { id: id('sibling'), text: 'Sibling', depth: 0 }
    ])
  })

  it('slugs plain text, stripped of inline formatting', () => {
    const [heading] = extractHeadings('# `readFile.ts` and **bold** stuff')

    expect(heading.text).toBe('readFile.ts and bold stuff')
    expect(heading.id).toBe(id('readfilets-and-bold-stuff'))
  })

  it('disambiguates duplicate heading text the same way github-slugger does', () => {
    const content = ['# Duplicate', 'body', '# Duplicate'].join('\n\n')

    expect(extractHeadings(content).map((heading) => heading.id)).toEqual([
      id('duplicate'),
      id('duplicate-1')
    ])
  })
})

describe('findActiveHeadingPath', () => {
  const headings = extractHeadings(
    ['## Top', '### Nested', '## Sibling', '### Sibling nested'].join('\n\n')
  )

  it('returns nulls when nothing is active yet', () => {
    expect(findActiveHeadingPath(headings, null)).toEqual({ topLevel: null, active: null })
  })

  it('returns the same heading for both when the active heading is depth 0', () => {
    const top = headings[0]
    expect(findActiveHeadingPath(headings, top.id)).toEqual({ topLevel: top, active: top })
  })

  it('finds the nearest preceding depth-0 heading for a nested active heading', () => {
    const [top, nested] = headings
    expect(findActiveHeadingPath(headings, nested.id)).toEqual({ topLevel: top, active: nested })
  })

  it('tracks the most recent depth-0 heading, not the first', () => {
    const sibling = headings[2]
    const siblingNested = headings[3]
    expect(findActiveHeadingPath(headings, siblingNested.id)).toEqual({
      topLevel: sibling,
      active: siblingNested
    })
  })

  it('returns nulls for an id that is not in the list', () => {
    expect(findActiveHeadingPath(headings, 'not-a-real-id')).toEqual({
      topLevel: null,
      active: null
    })
  })
})

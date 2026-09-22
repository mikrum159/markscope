import { describe, expect, it } from 'vitest'
import { extractHeadingTexts } from './extractHeadingText'

describe('extractHeadingTexts', () => {
  it('returns heading text in document order', () => {
    expect(extractHeadingTexts('# One\n\nBody\n\n## Two\n\nMore body')).toEqual(['One', 'Two'])
  })

  it('returns an empty array for a document with no headings', () => {
    expect(extractHeadingTexts('Just a paragraph.')).toEqual([])
  })

  it('reduces inline formatting to plain text', () => {
    expect(extractHeadingTexts('# Hello **World**')).toEqual(['Hello World'])
  })
})

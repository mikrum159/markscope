import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isInsideRoot } from './rootBoundary'

const root = resolve('C:/Users/dev/project')

describe('isInsideRoot', () => {
  it('accepts a file directly inside the root', () => {
    expect(isInsideRoot(root, resolve(root, 'README.md'))).toBe(true)
  })

  it('accepts a nested file', () => {
    expect(isInsideRoot(root, resolve(root, 'docs/plans/shape.md'))).toBe(true)
  })

  it('rejects a sibling directory that shares the root prefix', () => {
    // The case a naive `absPath.startsWith(rootDir)` check gets wrong.
    expect(isInsideRoot(root, resolve('C:/Users/dev/project-notes/secret.md'))).toBe(false)
  })

  it('rejects a parent path', () => {
    expect(isInsideRoot(root, resolve(root, '..'))).toBe(false)
    expect(isInsideRoot(root, resolve(root, '../outside.md'))).toBe(false)
  })

  it('rejects the root itself', () => {
    expect(isInsideRoot(root, root)).toBe(false)
  })

  it('accepts a contained file whose name begins with two dots', () => {
    // The case a naive `rel.startsWith('..')` check gets wrong: this file is
    // legitimately inside the root and must stay readable.
    expect(isInsideRoot(root, resolve(root, '..config.md'))).toBe(true)
    expect(isInsideRoot(root, resolve(root, 'docs/..rc.md'))).toBe(true)
  })

  it('rejects an unrelated absolute path', () => {
    expect(isInsideRoot(root, resolve('D:/elsewhere/file.md'))).toBe(false)
  })
})

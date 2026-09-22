import { defaultSchema } from 'rehype-sanitize'

// Extends rehype-sanitize's default schema so rehype-highlight's classes
// survive sanitization: the default schema only allows `language-*` on
// <code> and nothing on <span>, but rehype-highlight adds `hljs`/`language-*`
// on <code> and `hljs-*` on the spans inside it.
export const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^(language-|hljs)/]],
    span: [['className', /^hljs-/]]
  },
  protocols: {
    ...defaultSchema.protocols,
    // data: images are already-inline, not a network fetch - see PreviewImage.
    src: [...(defaultSchema.protocols?.src ?? []), 'data']
  }
} as typeof defaultSchema

// rehype-sanitize's default (GitHub) schema clobber-prefixes every `id`
// (including the ones rehype-slug assigns to headings) with 'user-content-',
// to stop a heading id from clobbering a same-named DOM global. headings.ts
// needs the exact same prefix to compute ids that match what actually lands
// in the DOM, so it's exported here rather than duplicated as a hardcoded
// string. Lives in its own module (not DocumentPreview.tsx) because that
// file may only export components, per react-refresh's fast-refresh rule.
export const HEADING_ID_PREFIX = sanitizeSchema.clobberPrefix ?? ''

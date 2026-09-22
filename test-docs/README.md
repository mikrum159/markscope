# MarkScope Test Fixture

This folder is a synthetic sample tree used to smoke-test the
MarkScope explorer, preview, search, and watcher against a realistic
mix of Markdown features. See `docs/specs/quality.md` §2 in the main
repo for the coverage this tree is meant to provide.

## GFM features

Some **bold text**, some *italic text*, and some `inline code`.

> A blockquote, because reading apps should render these too.

A fenced code block:

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`
}
```

An unordered list:

- First item
- Second item
  - Nested item

An ordered list:

1. Step one
2. Step two

A relative image:

![Diagram](images/diagram.png)

See [architecture.md](architecture.md) for a plain sibling document.

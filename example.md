---
title: Imperative vs. Declarative Code
subtitle: "Sam Ly"
---
### [Footnotes](https://github.com/markdown-it/markdown-it-footnote)

A definition can appear before the paragraph that references it. The parser records it during the block pass, then waits until references are resolved later.

This is an ^[inline footnote].

[^front-loaded]: This definition is intentionally placed before its reference.

This paragraph finally points back to the early definition[^front-loaded]. It also references a note whose definition will not appear until the bottom of the document[^late-arrival].

[^between-paragraphs]: This definition is wedged between two ordinary paragraphs.

The next paragraph uses the middle definition[^between-paragraphs], then repeats the late definition[^late-arrival] so you can see how duplicate references produce multiple anchors for the same emitted footnote.

### Definitions in Awkward Places

[^under-heading]: This definition sits directly under a heading, before any prose in that section gets to use it.

This section references the under-heading note[^under-heading]. It also includes an inline footnote^[Inline footnotes do not have a source label, but the plugin still emits them into the same final footnote block.] to compare with labeled footnotes.

Here is another paragraph with a forward reference[^after-list]. The definition for that one is tucked after a short list instead of immediately nearby.

- First list item with no note.
- Second list item that references the early note again[^front-loaded].

[^after-list]: This definition appears after a list, even though its reference appeared before the list.

The closing paragraph references a bottom definition[^bottom-most], then the source immediately drops into the final definitions.

[^late-arrival]: This definition lives near the bottom, but its first reference happened much earlier.

[^bottom-most]: This is the last definition in the source file.

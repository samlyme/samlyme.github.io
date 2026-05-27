import { expect, test } from "bun:test";
import { markdownToArticle } from "./parse";
import type { Figure, Paragraph } from "./ast";
import { sanitizeText } from "./render";

const doc = (body: string) => `---
title: Test
subtitle: Test
---

${body}`;

test("attaches a footnote immediately after an image to the figure only", () => {
  const article = markdownToArticle(
    doc("![](https://example.com/image.png)[^ref]\n\n[^ref]: image note"),
  );

  const blocks = article.sections[0]?.blocks ?? [];
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.type).toBe("figure");

  const figure = blocks[0] as Figure;
  expect(figure.note?.id).toBe("ref-0");
  expect(figure.note?.content).toEqual([
    {
      type: "textChunk",
      content: sanitizeText("image note"),
      bold: false,
      italic: false,
      code: false,
    },
  ]);
});

test("keeps ordinary footnote references in paragraph text", () => {
  const article = markdownToArticle(doc("hello[^ref]\n\n[^ref]: side note"));

  const blocks = article.sections[0]?.blocks ?? [];
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.type).toBe("paragraph");

  const paragraph = blocks[0] as Paragraph;
  expect(paragraph.text.map((item) => item.type)).toEqual([
    "textChunk",
    "note",
  ]);
});

test("preserves tex delimiters and commands for MathJax", () => {
  const article = markdownToArticle(doc("Inline $F_n \\le 2^n$.\n\n$$x^2$$"));

  const blocks = article.sections[0]?.blocks ?? [];
  expect(blocks).toHaveLength(2);

  const inlineParagraph = blocks[0] as Paragraph;
  const displayParagraph = blocks[1] as Paragraph;

  expect(inlineParagraph.text[0]).toMatchObject({
    type: "textChunk",
    content: sanitizeText("Inline $F_n \\le 2^n$."),
  });
  expect(displayParagraph.text[0]).toMatchObject({
    type: "textChunk",
    content: sanitizeText("$$x^2$$"),
  });
});

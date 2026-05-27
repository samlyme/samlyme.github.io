import { expect, test } from "bun:test";
import { markdownToArticle } from "./parse";
import type { Figure, Paragraph } from "./ast";

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
      content: "image note",
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

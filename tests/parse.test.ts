import { expect, test } from "bun:test";
import { markdownToArticle } from "../parse";
import type { Figure, Paragraph } from "../ast";
import { sanitizeText } from "../render";

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

test("defaults missing subtitles to empty text", () => {
  const article = markdownToArticle(`---
title: Test
---

Body`);

  expect(article.subtitle).toBe("");
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

test("parses wikilinks as ordinary links", () => {
  const article = markdownToArticle(
    doc("Read [[Proof by Induction]] and [[Union Find Algorithm|union-find]]."),
  );

  const blocks = article.sections[0]?.blocks ?? [];
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.type).toBe("paragraph");

  const paragraph = blocks[0] as Paragraph;
  expect(paragraph.text).toMatchObject([
    { type: "textChunk", content: sanitizeText("Read ") },
    {
      type: "textChunk",
      content: sanitizeText("Proof by Induction"),
      link: "Proof%20by%20Induction/",
    },
    { type: "textChunk", content: sanitizeText(" and ") },
    {
      type: "textChunk",
      content: sanitizeText("union-find"),
      link: "Union%20Find%20Algorithm/",
    },
    { type: "textChunk", content: sanitizeText(".") },
  ]);
});

test("parses wikilink images as ordinary images", () => {
  const article = markdownToArticle(
    doc("![[image.png]]\n\n![[diagram.png|Image caption]]"),
  );

  const blocks = article.sections[0]?.blocks ?? [];
  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.type).toBe("figure");
  expect(blocks[1]?.type).toBe("figure");

  const plainFigure = blocks[0] as Figure;
  expect(plainFigure.image).toEqual({ src: "image.png", alt: "" });
  expect(plainFigure.text).toEqual([]);

  const captionedFigure = blocks[1] as Figure;
  expect(captionedFigure.image).toEqual({ src: "diagram.png", alt: "" });
  expect(captionedFigure.text).toMatchObject([
    { type: "textChunk", content: sanitizeText("Image caption") },
  ]);
});

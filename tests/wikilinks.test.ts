import { expect, test } from "bun:test";
import MarkdownIt from "markdown-it";
import MarkdownItWikilinks from "../wikilinks";

const md = new MarkdownIt().use(MarkdownItWikilinks);
const resolvedMd = new MarkdownIt().use(MarkdownItWikilinks, {
  resolveHref: (target) => {
    if (target === "blogs/index") return "/blogs/";
    return undefined;
  },
});

test("emits page links as pretty URLs", () => {
  expect(inlineTokenShape("[[Page|Label]]")).toEqual(
    inlineTokenShape("[Label](Page/)"),
  );
});

test("leaves non-page wikilink targets unchanged", () => {
  expect(inlineTokenShape("[[resume.pdf|Resume]]")).toEqual(
    inlineTokenShape("[Resume](resume.pdf)"),
  );
  expect(inlineTokenShape("[[https://example.com/path|External]]")).toEqual(
    inlineTokenShape("[External](https://example.com/path)"),
  );
});

test("uses a configured resolver for content links", () => {
  expect(inlineTokenShape("[[blogs/index|blogs]]", resolvedMd)).toEqual(
    inlineTokenShape("[blogs](/blogs/)"),
  );
});

test("does not invent pretty page urls when a resolver is configured", () => {
  expect(inlineTokenShape("[[Missing Page|Missing]]", resolvedMd)).toEqual(
    inlineTokenShape("[Missing](Missing%20Page)"),
  );
});

test("emits the same token shape as a markdown image", () => {
  expect(inlineTokenShape("![[image.png]]")).toEqual(
    inlineTokenShape("![](image.png)"),
  );
  expect(inlineTokenShape("![[image.png|Label]]")).toEqual(
    inlineTokenShape("![Label](image.png)"),
  );
});

function inlineTokenShape(source: string, parser = md) {
  const inline = parser
    .parse(source, {})
    .find((token) => token.type === "inline");
  if (!inline?.children) throw new Error("Expected inline children.");

  return inline.children.map((token) => ({
    type: token.type,
    tag: token.tag,
    nesting: token.nesting,
    content: token.content,
    href: token.attrGet("href") ?? undefined,
    src: token.attrGet("src") ?? undefined,
    alt: token.attrGet("alt") ?? undefined,
  }));
}

import { expect, test } from "bun:test";
import MarkdownIt from "markdown-it";
import MarkdownItWikilinks from "../wikilinks";

const md = new MarkdownIt().use(MarkdownItWikilinks);

test("emits the same token shape as a markdown link", () => {
  expect(inlineTokenShape("[[Page|Label]]")).toEqual(
    inlineTokenShape("[Label](Page)"),
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

function inlineTokenShape(source: string) {
  const inline = md.parse(source, {}).find((token) => token.type === "inline");
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

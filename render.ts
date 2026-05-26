import type { ImportsNotUsedAsValues } from "typescript";
import type {
  Article,
  Block,
  BlockQuote,
  TextChunk,
  CodeBlock,
  Content,
  Epigraph,
  Heading,
  List,
  Paragraph,
  Section,
  Note,
  Text,
  InlineItem,
} from "./ast";

export function renderArticle(article: Article): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <link rel="stylesheet" href="tufte.css"/>
</head>
<body>
  <h1>${article.title}</h1>
  <p class="subtitle">${article.subtitle}</p>
  
  ${article.sections.map(renderSection).join("\n")}
</body>
</html>
  `;
}

function renderSection(section: Section): string {
  return `
<section>
  ${section.blocks.map(renderBlock).join("\n")}
</section>
  `;
}

function renderBlock(block: Block): Content {
  switch (block.type) {
    case "heading":
      return renderHeading(block);
    case "paragraph":
      return renderParagraph(block);
    case "list":
      return renderList(block);
    case "codeBlock":
      return renderCodeBlock(block);
    case "blockQuote":
      return renderBlockQuote(block);
    case "epigraph":
      return renderEpigraph(block);
  }
}

const renderHeading = (heading: Heading): Content => {
  const text = renderText(heading.text);
  switch (heading.level) {
    case "section":
      return tag("h2")(text);
    case "subsection":
      return tag("h3")(text);
  }
};
const renderParagraph = (paragraph: Paragraph): Content => {
  let nt = "" as Content;
  if (paragraph.newthought) {
    nt = renderText(paragraph.newthought);
  }
  return tag("p")((newthought(nt) + renderText(paragraph.text)) as Content);
};
const renderList = (list: List): Content => {
  const tagName = list.listType == "ordered" ? "ol" : "ul";
  return tag(tagName)(concat(...list.items.map(renderText).map(tag("li"))));
};
const renderCodeBlock = (codeBlock: CodeBlock): Content =>
  tag("pre")(tag("code")(codeBlock.content as Content)); // TODO: implement language selection
const renderBlockQuote = (blockQuote: BlockQuote): Content =>
  tag("blockquote")(
    concat(
      tag("p")(renderText(blockQuote.content)),
      tag("footer")(renderText(blockQuote.footer)),
    ),
  );
const renderEpigraph = ({ blockQuote }: Epigraph): Content =>
  tag("blockquote")(
    concat(
      tag("i")(tag("p")(renderText(blockQuote.content))),
      tag("footer")(renderText(blockQuote.footer)),
    ),
  );
const concat = (...content: Content[]): Content =>
  content.join("\n") as Content;
const renderText = (text: Text): Content =>
  text.map(renderInlineItem).join() as Content;
const renderInlineItem = (inlineItem: InlineItem): Content => {
  switch (inlineItem.type) {
    case "textChunk":
      return renderChunk(inlineItem);
    case "note":
      return renderNote(inlineItem);
  }
};
const renderChunk = (chunk: TextChunk): Content => {
  let out = chunk.content;
  if (chunk.bold) tag("b")(out);
  if (chunk.italic) tag("i")(out);
  if (chunk.code) tag("code")(out); // Potential bug.
  if (chunk.link) tag("a", { href: chunk.link })(out);
  return out;
};
const renderNote = (sideNote: Note): Content =>
  concat(
    tag("label", {
      for: sideNote.id,
      class: `margin-toggle ${sideNote.variant === "side" ? "sidenote-number" : ""}`,
    })((sideNote.variant === "side" ? "" : "&#8853;") as Content),

    tag("input", {
      type: "checkbox",
      id: sideNote.id,
      class: "margin-toggle",
    })("" as Content),

    tag("span", { class: sideNote.variant + "note" })(
      renderText(sideNote.content),
    ),
  );

// HTML helpers
const newthought = (content: Content) =>
  tag("span", { class: "newthought" })(content);

type Attributes = Record<string, string>; // UNSAFE!
const tag = (type: string, attr?: Attributes) => (content: Content) =>
  `<${type}${attr ? Object.entries(attr).map(([k, v]) => ` ${k}=\"${v}\"`) : " "}>${content}</${type}>` as Content;

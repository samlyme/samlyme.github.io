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
  Figure,
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
    case "figure":
      return renderFigure(block);
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
  return tag("p")(
    concat(newthought(nt), " " as Content, renderText(paragraph.text)),
  );
};
const renderList = (list: List): Content => {
  const tagName = list.listType == "ordered" ? "ol" : "ul";
  return tag(tagName)(concat(...list.items.map(renderText).map(tag("li"))));
};
const renderCodeBlock = (codeBlock: CodeBlock): Content => {
  const attr = codeBlock.language
    ? { class: `language-${codeBlock.language}` }
    : undefined;
  return tag("pre")(tag("code", attr)(sanitizeText(codeBlock.content)));
};
const renderBlockQuote = (blockQuote: BlockQuote): Content =>
  tag("blockquote")(
    concat(
      // could be evil, idk
      tag("p")(concat(...blockQuote.blocks.map(renderBlock))),
      tag("footer")(renderText(blockQuote.footer)),
    ),
  );
const renderEpigraph = ({ blockQuote }: Epigraph): Content =>
  tag("blockquote")(
    concat(
      // could be evil, idk
      tag("i")(tag("p")(concat(...blockQuote.blocks.map(renderBlock)))),
      tag("footer")(renderText(blockQuote.footer)),
    ),
  );
const renderFigure = (figure: Figure): Content => {
  let attr = undefined; // match from rust would go so hard!!!!
  if (figure.variant !== "standard") {
    attr = { class: figure.variant };
  }

  return tag(
    "figure",
    attr,
  )(
    concat(
      tag("img", { src: figure.image.src, alt: figure.image.alt })(),
      figure.note ? renderNote(figure.note) : empty,
    ),
  );
};

const concat = (...content: Content[]): Content =>
  content.join("\n") as Content;
const renderText = (text: Text): Content =>
  text.map(renderInlineItem).join("") as Content;
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
  if (chunk.bold) out = tag("b")(out);
  if (chunk.italic) out = tag("i")(out);
  if (chunk.code) out = tag("code")(out); // Potential bug.
  if (chunk.link) out = tag("a", { href: chunk.link })(out);
  return out;
};
const renderNote = (sideNote: Note): Content =>
  concat(
    tag("label", {
      for: sideNote.id,
      class: `margin-toggle ${sideNote.variant === "side" ? "sidenote-number" : ""}`,
    })((sideNote.variant === "side" ? "" : "&#9758;") as Content),

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

type Attributes = Record<string, string>;
const empty = "" as Content;
const tag =
  (type: string, attr?: Attributes) =>
  (content: Content = empty) =>
    `<${type} ${
      attr
        ? Object.entries(attr)
            .map(([k, v]) => `${k}=\"${sanitizeAttribute(v)}\"`)
            .join(" ")
        : ""
    }>${content}</${type}>` as Content;
function sanitizeAttribute(unsafeString: string): string {
  return unsafeString.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}
// Sanitized text! HTML is escaped.
// I do not allow for inline html unless explicitly in a directive!
export function sanitizeText(unsafeString: string): Content {
  return unsafeString.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;"; // &#39; is safer than &apos; for older browsers
      default:
        return match;
    }
  }) as Content;
}

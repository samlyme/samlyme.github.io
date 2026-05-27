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
  MarginFigure,
} from "./ast";

const codeCopyStyles = `
.code-block {
    width: 52.5%;
}

.code-block-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.15rem;
}

.code-copy-button {
    border: 1px solid var(--hljs-border, #d8d0b8);
    border-radius: 2px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 0.7rem;
    line-height: 1;
    padding: 0.2rem 0.35rem;
}

.code-copy-button:hover,
.code-copy-button:focus {
    background: var(--hljs-background, #f7f4e8);
}

.code-block pre {
    margin-top: 0;
}

.code-block pre > code {
    box-sizing: border-box;
    width: 100%;
    margin-left: 0;
}

@media (max-width: 760px) {
    .code-block {
        width: 97%;
    }
}
`.trim();

const codeCopyScript = `
document.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest("[data-copy-code]");
  if (!(button instanceof HTMLButtonElement)) return;

  const code = button.closest(".code-block")?.querySelector("pre > code");
  if (!code) return;

  try {
    const text = code.textContent || "";

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    button.textContent = "copied";
    setTimeout(() => {
      button.textContent = "copy";
    }, 1200);
  } catch {
    button.textContent = "error";
    setTimeout(() => {
      button.textContent = "copy";
    }, 1200);
  }
});
`.trim();

const mathJaxConfigScript = String.raw`
window.MathJax = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true
  },
  options: {
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
  }
};
`.trim();

export function renderArticle(article: Article): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <link rel="stylesheet" href="tufte.css"/>
  <link rel="stylesheet" href="hljs-tufte.css">
  <style>
${codeCopyStyles}
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
  <script>hljs.highlightAll();</script>
  <script>
${mathJaxConfigScript}
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js"></script>
  <script>
${codeCopyScript}
  </script>
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
    case "horizontalRule":
      return tag("hr")();
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
  return tag(tagName)(
    concat(
      ...list.items
        .map((item) => concat(...item.map(renderBlock)))
        .map(tag("li")),
    ), // I don't think i will ever understand this again.
  );
};
const renderCodeBlock = (codeBlock: CodeBlock): Content => {
  const attr = codeBlock.language
    ? { class: `language-${codeBlock.language}` }
    : undefined;
  return tag("div", { class: "code-block" })(
    concat(
      tag("div", { class: "code-block-header" })(
        tag("button", {
          type: "button",
          class: "code-copy-button",
          "data-copy-code": "true",
          "aria-label": "Copy code",
        })("copy" as Content),
      ),
      tag("pre")(tag("code", attr)(sanitizeText(codeBlock.content))),
    ),
  );
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

  // Notes for figures should't be numbered.
  if (figure.note) figure.note.variant = "margin";

  return tag(
    "figure",
    attr,
  )(
    concat(
      tag("img", figure.image)(),
      figure.note ? renderNote(figure.note) : empty,
      renderText(figure.text),
    ),
  );
};
const renderMarginFigure = (marginFigure: MarginFigure) =>
  tag("figure")(tag("img", marginFigure.image)());

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
      concat(
        ...sideNote.content.map((content) =>
          content.type === "textChunk"
            ? renderChunk(content)
            : renderMarginFigure(content),
        ),
      ),
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

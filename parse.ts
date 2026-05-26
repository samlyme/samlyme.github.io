import MarkdownIt from "markdown-it";
import MarkdownItFootNote from "markdown-it-footnote";
import type Token from "markdown-it/lib/token.mjs";
import type {
  Article,
  Block,
  BlockQuote,
  Content,
  Heading,
  List,
  Section,
  Text,
} from "./ast";
import { sanitizeText } from "./render";
import yaml from "YAML";

class TokenCursor {
  constructor(
    private tokens: Token[],
    private pos = 0,
  ) {}

  peek(): Token | undefined {
    return this.tokens[this.pos]; // undefined means ur at EOF
  }

  consume(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new Error("Unexpected EOF");
    this.pos++;
    return token;
  }

  expect(type: TokenType): Token {
    const token = this.consume();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    return token;
  }

  done(): boolean {
    return this.pos >= this.tokens.length;
  }
}

type TokenType =
  | "heading_open"
  | "heading_close"
  | "paragraph_open"
  | "paragraph_close"
  | "blockquote_open"
  | "blockquote_close"
  | "inline"
  | "hr"
  | "bullet_list_open"
  | "list_item_open"
  | "list_item_close"
  | "bullet_list_close"
  | "ordered_list_open"
  | "ordered_list_close"
  | "fence"
  | "footnote_block_open"
  | "footnote_open"
  | "footnote_anchor"
  | "footnote_close"
  | "footnote_block_close";

type InlineChildrenTokenType =
  | "text"
  | "strong_open"
  | "strong_close"
  | "em_open"
  | "em_close"
  | "s_open"
  | "s_close"
  | "code_inline"
  | "link_open"
  | "link_close"
  | "image"
  | "softbreak";

export function markdownToArticle(source: string): Article {
  const splits = source.split("---");
  if (splits.length < 3) throw new Error("Missing frontmatter");

  const frontMatter = splits[1]!;
  const body = splits.slice(2).join("---");

  const { title, subtitle } = yaml.parse(frontMatter);
  if (typeof title !== "string") throw new Error("Invalid title");
  if (typeof subtitle !== "string") throw new Error("Invalid subtitle");

  const article: Article = {
    title: sanitizeText(title),
    subtitle: sanitizeText(subtitle),
    sections: [],
  };

  // tables aren't in tufte-css, and I always use fenced code blocks.
  const md = new MarkdownIt({ html: false })
    .use(MarkdownItFootNote)
    .disable(["table", "code", "strikethrough"]);

  const tokens = md.parse(body, {});

  const cursor = new TokenCursor(tokens);
  // Top level, everything belongs to a section. Sections are delimited by
  // headings.
  while (cursor.peek() !== undefined) {
    article.sections.push(parseSection(cursor));
  }

  return article;
}

function parseSection(cursor: TokenCursor): Section {
  const blocks: Block[] = [];
  let newthought: Text = [];

  const open = cursor.consume();
  switch (open.type as TokenType) {
    // these 3 should be mutually exclusive.
    case "heading_open": {
      const text = parseInlineChildren(cursor.expect("inline"));
      const close = cursor.expect("heading_close");
      const headingLevel = open.markup.length; // janky way to get heading level.
      if (headingLevel >= 3) {
        newthought.push(...text); // handled by paragraph.
      } else {
        blocks.push({
          type: "heading",
          level: headingLevel === 2 ? "subsection" : "section",
          text,
        });
      }
      break;
    }
    case "paragraph_open": {
      const text = parseInlineChildren(cursor.expect("inline"));
      const close = cursor.expect("paragraph_close");
      blocks.push({
        type: "paragraph",
        newthought,
        text,
      });
      newthought = []; // no ball knowledge here :(
      break;
    }
    case "blockquote_open": {
      // uh oh, block quotes can be nested!
      // also, they begin with a paragraph.
      const text = parseInlineChildren(cursor.expect("inline"));
      const close = cursor.expect("blockquote_close");
      break;
    }

    // Lists are special
    case "fence": {
      break; // idk
    }
    case "bullet_list_open": {
      const middle = cursor.expect("inline");
      const close = cursor.expect("bullet_list_close");
      break;
    }
    case "ordered_list_open": {
      const middle = cursor.expect("inline");
      const close = cursor.expect("ordered_list_close");
      break;
    }
    default: // any closing tags here are invalid.
      throw new Error("Invalid parser state.");
  }

  return { blocks };
}

// function parseBlock(block: Token): Block {
//   swtich (block.type as TokenType)
// }

function parseInlineChildren(inline: Token): Text {
  const text: Text = [];
  if (!inline.children) throw new Error("inline has no children"); // fuck it, could be bug here.

  const childCursor = new TokenCursor(inline.children);
  let bold = false;
  let italic = false;
  let code = false;
  let link = undefined; // may be a tough one!
  while (childCursor.peek() !== undefined) {
    const curr = childCursor.consume();
    switch (curr.type as InlineChildrenTokenType) {
      case "text":
      case "softbreak":
        break; // do nothing lol
      case "strong_open":
        bold = true;
        break;
      case "strong_close":
        bold = false;
        break;
      case "em_open":
        italic = true;
        break;
      case "em_close":
        italic = false;
        break;
      case "code_inline":
        code = true;
        break;
      case "link_open":
        link = curr.attrGet("href") || "";
        break;
      case "link_close":
        link = undefined;
    }
    text.push({
      type: "textChunk",
      content: sanitizeText(curr.content),
      bold,
      italic,
      code,
      link,
    });
    if (code) code = false; // Janky trick because code inline tokens are the content.
  }

  return text;
}

// rather than rawdogging the indices, make a class. (my mortal enemy).

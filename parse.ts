import MarkdownIt from "markdown-it";
import MarkdownItFootnotes from "markdown-it-footnote";
import type Token from "markdown-it/lib/token.mjs";
import type {
  Article,
  Block,
  BlockQuote,
  Content,
  Figure,
  Note,
  NoteContent,
  Section,
  Text,
} from "./ast";
import { sanitizeText } from "./render";
import yaml from "YAML";

class TokenCursor {
  constructor(
    public tokens: Token[],
    public pos = 0,
    public footnoteRecord: FootnoteRecord = {},
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
      throw new Error(
        `Expected ${type}, got ${token.type}, at pos: ${this.pos - 1}`,
      );
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
  | "footnote_block_close"
  | "footnote_open"
  | "footnote_close";

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
  | "softbreak"
  | "footnote_ref";

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
  // ignore footnotes for now!
  const md = new MarkdownIt({ html: false, linkify: true })
    .use(MarkdownItFootnotes)
    .disable(["table", "code", "strikethrough"]);

  const tokens = md.parse(body, {});
  let footnoteBlockStart = undefined;
  // before doing anything, chop off the footnote block.
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token!.type === "footnote_block_open") {
      footnoteBlockStart = i;
      break;
    }
  }

  const footnoteTokens = tokens
    .slice(footnoteBlockStart ?? tokens.length)
    .filter((token) => token.type !== "footnote_anchor");
  // Footnote anchors are not needed in my implementation.
  if (footnoteBlockStart) tokens.length = footnoteBlockStart;
  const footnoteCursor = new TokenCursor(footnoteTokens);
  const footnoteRecord = parseFootnoteBlock(footnoteCursor);

  const cursor = new TokenCursor(tokens, 0, footnoteRecord);
  // Top level, everything belongs to a section. Sections are delimited by
  // headings.
  while (cursor.peek() !== undefined) {
    article.sections.push(parseSection(cursor));
  }

  return article;
}

function parseSection(cursor: TokenCursor): Section {
  const blocks: Block[] = [];

  const currType: TokenType = cursor.peek()!.type as TokenType;
  // This prevents an infinite loop where we fail to advance the cursor.
  // This is because sections "start" at whatever block, but "end" when the
  // next header is opened.
  if (currType == "heading_open") {
    ``;
    blocks.push(...parseBlock(cursor, []));
  }
  while (
    cursor.peek() !== undefined &&
    cursor.peek()!.type !== "heading_open"
  ) {
    blocks.push(...parseBlock(cursor, []));
  }

  return { blocks };
}

function parseBlock(cursor: TokenCursor, newthought: Text): Block[] {
  const open = cursor.consume();
  switch (open.type as TokenType) {
    // these 3 should be mutually exclusive.
    case "heading_open": {
      const [text, blocks] = parseInlineChildren(
        cursor.expect("inline"),
        cursor.footnoteRecord,
      );
      const close = cursor.expect("heading_close");
      const headingLevel = open.markup.length; // janky way to get heading level.
      if (headingLevel >= 3) {
        newthought.push(...text); // handled by paragraph.
      } else {
        return [
          ...blocks,
          {
            type: "heading",
            level: headingLevel === 2 ? "subsection" : "section",
            text,
          },
        ];
      }
      return parseBlock(cursor, newthought); // uhhhh
    }
    case "paragraph_open": {
      const [text, blocks] = parseInlineChildren(
        cursor.expect("inline"),
        cursor.footnoteRecord,
      );
      const close = cursor.expect("paragraph_close");
      return [
        ...blocks,
        {
          type: "paragraph",
          newthought,
          text,
        },
      ];
    }
    case "blockquote_open": {
      const blocks: Block[] = [];
      let footer: Text = [];
      const blockQuote: BlockQuote = { type: "blockQuote", blocks, footer };
      // const text = parseInlineChildren(cursor.expect("inline"));
      while (cursor.peek()?.type !== "blockquote_close") {
        blocks.push(...parseBlock(cursor, newthought));
      }
      cursor.expect("blockquote_close");

      if (blocks.length >= 2) {
        const lastBlock = blocks.at(-1)!;
        if (
          lastBlock.type === "list" &&
          lastBlock.listType === "unordered" &&
          lastBlock.items.length === 1
        ) {
          // If the last item in a blockquote is an "unordered list"
          // Yeah this looks genuinely cursed lol.
          const lastListItem = lastBlock.items[0]!;
          if (lastListItem.length === 1) {
            const lastBlock = lastListItem[0]!;
            if (lastBlock.type == "paragraph") {
              footer.push(...lastBlock.text);
              blocks.pop();
            }
          }
        }
      }

      return [blockQuote];
    }

    // Lists are special
    case "bullet_list_open": {
      const items: Block[][] = [];
      while (cursor.peek()?.type !== "bullet_list_close") {
        items.push(parseListItem(cursor));
      }
      cursor.expect("bullet_list_close");
      return [{ type: "list", listType: "unordered", items: items }];
    }
    case "ordered_list_open": {
      const items: Block[][] = [];
      while (cursor.peek()?.type !== "ordered_list_close") {
        items.push(parseListItem(cursor));
      }
      cursor.expect("ordered_list_close");
      return [{ type: "list", listType: "ordered", items: items }];
    }

    case "fence": {
      return [
        {
          type: "codeBlock",
          language: open.info,
          content: open.content,
        },
      ];
    }
    // TODO: handle these.
    case "hr":
      return [
        {
          type: "horizontalRule",
        },
      ];
    default: // any closing tags here are invalid.
      console.log(`At: ${cursor.pos}, ${open.type} `);
      throw new Error("Invalid parser state.");
  }
}

function parseListItem(cursor: TokenCursor): Block[] {
  const blocks: Block[] = [];
  cursor.expect("list_item_open");
  while (cursor.peek()?.type !== "list_item_close") {
    blocks.push(...parseBlock(cursor, [])); // mischievous state thing.
  }
  cursor.expect("list_item_close");

  return blocks;
}

function parseInlineChildren(
  inline: Token,
  footnoteRecord: FootnoteRecord,
): [Text, Block[]] {
  const text: Text = [];
  const residueBlocks: Block[] = [];
  if (!inline.children) throw new Error("inline has no children"); // fuck it, could be bug here.

  const childCursor = new TokenCursor(inline.children);
  let bold = false;
  let italic = false;
  let code = false;
  let link = undefined; // may be a tough one!
  let softbreak = false;
  while (childCursor.peek() !== undefined) {
    const curr = childCursor.consume();
    switch (curr.type as InlineChildrenTokenType) {
      case "text":
        break;
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
      case "s_open":
      case "s_close":
        break;
      case "code_inline":
        code = true;
        break;
      case "link_open":
        link = curr.attrGet("href") || "";
        break;
      case "link_close":
        link = undefined;
        break;
      case "image": {
        const src = curr.attrGet("src") || "";
        const alt = curr.attrGet("alt") || "";
        const title = curr.attrGet("title"); // TODO: do something with title.
        const figure: Figure = {
          type: "figure",
          variant: "standard",
          image: {
            src,
            alt,
          },
        };
        residueBlocks.push(figure);
        // I will make this behave how I like it. The image WILL be a figure,
        // which is a block element. Thus, I need to bubble this up.
        break;
      }

      case "softbreak":
        softbreak = true;
        break;

      case "footnote_ref":
        const id = curr.meta["id"] as number;
        const note = footnoteRecord[id];
        if (note === undefined) throw new Error("Invalid footnote_ref id.");
        if (!note.used) text.push(note);
        else console.warn("Duplicate footnote references are not rendered.");

        note.used = true;

        break;
    }
    text.push({
      type: "textChunk",
      content: sanitizeText((softbreak ? " " : "") + curr.content),
      bold,
      italic,
      code,
      link,
    });
    if (code) code = false; // Janky trick because code inline tokens are the content.
    if (softbreak) softbreak = false;
  }

  return [text, residueBlocks];
}

type FootnoteRecord = Record<number, Note & { used: boolean }>;

// A behavioral quirk of my implementation is that footnotes (sidenotes)
// can not be referenced by multiple places in the doc. Need to override how
// tufte-css works if we want that.
function parseFootnoteBlock(cursor: TokenCursor): FootnoteRecord {
  const out: FootnoteRecord = {};

  cursor.expect("footnote_block_open");

  while (cursor.peek()!.type === "footnote_open") {
    const open = cursor.expect("footnote_open");
    const id = open.meta["id"];

    const label = open.meta["label"] as string;
    const blocks: Block[] = [];
    while (cursor.peek()!.type !== "footnote_close") {
      blocks.push(...parseBlock(cursor, []));
    }
    out[id] = {
      type: "note",
      variant: "side", // TODO: encode margin notes somehow. Useful for images.
      id: `${label}-${id}`,
      content: flattenNote(blocks),
      used: false,
    };
    cursor.expect("footnote_close");
  }

  cursor.expect("footnote_block_close");

  return out;
}

// for CSS reasons, I need to flatten the footnote.
// Although markdown allows you to have arbitrary blocks in footnote,
// I will not. I will try my best to coerce the data.
// Instead, I will have some "whitelisted sidenote items", all others are not
// allowed.
function flattenNote(blocks: Block[]): NoteContent[] {
  const out: NoteContent[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "figure":
        const { image, note } = block;
        out.push({ type: "marginFigure", image });
        if (note) {
          out.push(...note.content.filter((item) => item.type === "textChunk"));
        }
        break;
      case "paragraph":
        if (block.newthought) {
          out.push(
            ...block.newthought.filter((item) => item.type === "textChunk"),
          );
        }
        out.push(...block.text.filter((item) => item.type === "textChunk"));
        break;
      case "heading":
        out.push(
          ...block.text
            .filter((item) => item.type === "textChunk")
            .map((textChunk) => {
              // TODO: probably a better way to do this.
              if (block.level == "section") textChunk.bold = true;
              textChunk.italic = true;
              return textChunk;
            }),
        );
        break;
      default:
        throw new Error("Invalid content for sidenote/footnote.");
    }
  }
  return out;
}

import path from "node:path";
import MarkdownIt from "markdown-it";
import MarkdownItFootnotes from "markdown-it-footnote";
import type Token from "markdown-it/lib/token.mjs";
import MarkdownItWikilinks, { type WikilinksOptions } from "./wikilinks";
import MarkdownItContainer from "markdown-it-container";
import type {
  Article,
  Block,
  BlockQuote,
  Figure,
  Note,
  NoteContent,
  PageIndexItem,
  Section,
  Text,
} from "./ast";
import { sanitizeText } from "./render";
import yaml from "YAML";

interface MarkdownToArticleOptions {
  resolveWikilink?: WikilinksOptions["resolveHref"];
  inputPath?: string; // This article's path
  inputPaths?: string[]; // This entire content's paths.
}

class TokenCursor {
  constructor(
    public tokens: Token[],
    public pos = 0,
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
  | "footnote_close"
  | "container_page_index_open"
  | "container_page_index_close";

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

export function markdownToArticle(
  source: string,
  options: MarkdownToArticleOptions = {},
): Article {
  const splits = source.split("---");
  if (splits.length < 3) throw new Error("Missing frontmatter");

  const frontMatter = splits[1]!;
  const body = splits.slice(2).join("---");

  const { title, subtitle } = parseFrontmatter(frontMatter);

  const article: Article = {
    title,
    subtitle,
    sections: [],
  };

  // tables aren't in tufte-css, and I always use fenced code blocks.
  // ignore footnotes for now!
  const md = new MarkdownIt({ html: false, linkify: true })
    .use(MarkdownItFootnotes)
    .use(MarkdownItWikilinks, { resolveHref: options.resolveWikilink })
    .use(MarkdownItContainer, "page_index")
    .disable(["table", "code", "strikethrough"]);

  const tokens = md.parse(body, {});

  const footnoteRecord = consumeFootnoteTokens(tokens, {
    footnoteRecord: {}, // cursed, i know.
    allPaths: options.inputPaths ?? [],
    thisPath: options.inputPath ?? "",
  });

  const cursor = new TokenCursor(tokens);
  // Top level, everything belongs to a section. Sections are delimited by
  // headings.
  while (cursor.peek() !== undefined) {
    article.sections.push(
      parseSection(cursor, {
        footnoteRecord,
        allPaths: options.inputPaths ?? [],
        thisPath: options.inputPath ?? "",
      }),
    );
  }

  return article;
}

// Mutates tokens, and returns the FootnoteRecord.
function consumeFootnoteTokens(
  tokens: Token[],
  context: ParserContext,
): FootnoteRecord {
  let footnoteBlockStart = undefined;
  // before doing anything, chop off the footnote block.
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token!.type === "footnote_block_open") {
      footnoteBlockStart = i;
      break;
    }
  }

  if (footnoteBlockStart === undefined) return {};

  const footnoteTokens = tokens
    .slice(footnoteBlockStart)
    .filter((token) => token.type !== "footnote_anchor"); // Tufte-css doesn't render footnote_anchors.
  tokens.length = footnoteBlockStart;
  const footnoteCursor = new TokenCursor(footnoteTokens);
  return parseFootnoteBlock(footnoteCursor, context);
}

// TODO: parse the frontmatter over in `index.ts`, so we get the metadata  of
// other docs as context. This is useful for rendering the `page_index` element.
type Frontmatter = Omit<Article, "sections">;
function parseFrontmatter(source: string): Frontmatter {
  const frontmatter = yaml.parse(source);
  const title = frontmatter?.title;
  const subtitle = frontmatter?.subtitle ?? "";

  if (typeof title !== "string" || typeof subtitle !== "string")
    throw new Error("Invalid frontmatter.");

  return { title: sanitizeText(title), subtitle: sanitizeText(subtitle) };
}

interface ParserContext {
  // TODO: add frontmatter data of all other notes to ParserContext.
  footnoteRecord: FootnoteRecord;
  allPaths: string[]; // path to all other markdown files.
  thisPath: string; // path for this file.
}
function parseSection(cursor: TokenCursor, context: ParserContext): Section {
  const blocks: Block[] = [];

  const currType: TokenType = cursor.peek()!.type as TokenType;
  // This prevents an infinite loop where we fail to advance the cursor.
  // This is because sections "start" at whatever block, but "end" when the
  // next header is opened.
  if (currType == "heading_open") {
    blocks.push(...parseBlock(cursor, [], context));
  }
  while (
    cursor.peek() !== undefined &&
    !(cursor.peek()!.type === "heading_open" && cursor.peek()?.tag === "h1")
    // TODO: rework this logic to make only `#` headings create new sections.
  ) {
    blocks.push(...parseBlock(cursor, [], context));
  }

  return { blocks };
}

function parseBlock(
  cursor: TokenCursor,
  newthought: Text,
  context: ParserContext,
): Block[] {
  const { footnoteRecord } = context;
  const open = cursor.consume();
  switch (open.type as TokenType) {
    // these 3 should be mutually exclusive.
    case "heading_open": {
      const [text, blocks] = parseInlineChildren(
        cursor.expect("inline"),
        footnoteRecord,
      );
      const close = cursor.expect("heading_close");
      const headingLevel = open.markup.length; // janky way to get heading level.
      // TODO: Make only `#` markup create a new section.
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
      return parseBlock(cursor, newthought, context); // uhhhh
    }
    case "paragraph_open": {
      const [text, blocks] = parseInlineChildren(
        cursor.expect("inline"),
        footnoteRecord,
      );
      const close = cursor.expect("paragraph_close");
      if (text.length === 0 && newthought.length === 0) return blocks;

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
        blocks.push(...parseBlock(cursor, newthought, context));
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
        items.push(parseListItem(cursor, context));
      }
      cursor.expect("bullet_list_close");
      return [{ type: "list", listType: "unordered", items: items }];
    }
    case "ordered_list_open": {
      const items: Block[][] = [];
      while (cursor.peek()?.type !== "ordered_list_close") {
        items.push(parseListItem(cursor, context));
      }
      cursor.expect("ordered_list_close");
      return [{ type: "list", listType: "ordered", items: items }];
    }

    case "container_page_index_open": {
      const parent = path.dirname(context.thisPath);
      const siblings: PageIndexItem[] = context.allPaths
        .filter((item) => item.startsWith(parent) && item !== context.thisPath)
        .map((item) => path.basename(item, path.extname(item))) // get just the filename, with no extension.
        .map((item) => ({
          title: sanitizeText(item), // TODO: implement a metadata map.
          link: item + "/",
        }));

      const blocks: Block[] = [];
      // TODO: do something graceful with these.
      while (cursor.peek()?.type !== "container_page_index_close") {
        blocks.push(...parseBlock(cursor, newthought, context));
      }
      cursor.expect("container_page_index_close");
      blocks.push({ type: "pageIndex", items: siblings });
      return blocks;
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

function parseListItem(cursor: TokenCursor, context: ParserContext): Block[] {
  const blocks: Block[] = [];
  cursor.expect("list_item_open");
  while (cursor.peek()?.type !== "list_item_close") {
    blocks.push(...parseBlock(cursor, [], context)); // mischievous state thing.
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

        const figure: Figure = {
          type: "figure",
          variant: "standard",
          text: parseInlineChildren(curr, footnoteRecord)[0],
          image: {
            src,
            alt,
          },
        };
        const lookahead = childCursor.peek();
        if (lookahead && lookahead.type === "footnote_ref") {
          childCursor.consume();
          const id = lookahead.meta["id"] as number;
          const note = footnoteRecord[id];
          if (note === undefined) throw new Error("Invalid footnote_ref id.");

          if (!note.used) figure.note = note;
          else console.warn("Duplicate footnote references are not rendered.");

          note.used = true;
        }
        residueBlocks.push(figure);

        // this is critical. If not, the leftover content from
        // the image text will leak out.
        continue;
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
    if (curr.content || softbreak) {
      text.push({
        type: "textChunk",
        content: sanitizeText((softbreak ? " " : "") + curr.content),
        bold,
        italic,
        code,
        link,
      });
    }
    if (code) code = false; // Janky trick because code inline tokens are the content.
    if (softbreak) softbreak = false;
  }

  return [text, residueBlocks];
}

type FootnoteRecord = Record<number, Note & { used: boolean }>;

// A behavioral quirk of my implementation is that footnotes (sidenotes)
// can not be referenced by multiple places in the doc. Need to override how
// tufte-css works if we want that.
function parseFootnoteBlock(
  cursor: TokenCursor,
  context: ParserContext,
): FootnoteRecord {
  const out: FootnoteRecord = {};

  cursor.expect("footnote_block_open");

  while (cursor.peek()!.type === "footnote_open") {
    const open = cursor.expect("footnote_open");
    const id = open.meta["id"];

    const label = open.meta["label"] as string;
    const blocks: Block[] = [];
    while (cursor.peek()!.type !== "footnote_close") {
      // I don't know what happens if you use footnotes in footnote definitions.
      // I don't want to know....
      blocks.push(...parseBlock(cursor, [], context));
    }
    out[id] = {
      type: "note",
      variant: "side",
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

import MarkdownIt from "markdown-it";
import MarkdownItFootnotes from "markdown-it-footnote";
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

async function parse(inputPath: string) {
  const source = await Bun.file(inputPath).text();
  const splits = source.split("---");
  if (splits.length < 3) throw new Error("Missing frontmatter");

  const frontMatter = splits[1]!;
  const body = splits.slice(2).join("---");

  const { title, subtitle } = yaml.parse(frontMatter);
  if (typeof title !== "string") throw new Error("Invalid title");
  if (typeof subtitle !== "string") throw new Error("Invalid subtitle");

  const md = new MarkdownIt({ html: false })
    .disable(["table", "code", "strikethrough"])
    .use(MarkdownItFootnotes);

  const tokens = md.parse(body, {});
  return tokens;
}

const tokens = await parse("footnote.md");
console.log(JSON.stringify(tokens));

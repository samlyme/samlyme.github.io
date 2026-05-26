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

const inputPath = Bun.argv[2] ?? "demo.md";

const source = await Bun.file(inputPath).text();
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
console.log(JSON.stringify(tokens));

// const html = renderArticle(article);

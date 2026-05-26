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

const inputPath = Bun.argv[2] ?? "example.md";

const source = await Bun.file(inputPath).text();
const splits = source.split("---");
if (splits.length < 3) throw new Error("Missing frontmatter");

const frontMatter = splits[1]!;
const body = splits.slice(2).join("---");

const { title, subtitle } = yaml.parse(frontMatter);
if (typeof title !== "string") throw new Error("Invalid title");
if (typeof subtitle !== "string") throw new Error("Invalid subtitle");

const md = new MarkdownIt({ html: false }).disable([
  "table",
  "code",
  "strikethrough",
]);

const tokens = md.parse(body, {});

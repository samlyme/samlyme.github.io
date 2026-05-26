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

  // const sectionsByHeaders = body
  //   .split(/(?=^#{1,2}\s+)/gm)
  //   .map((s) => s.trim())
  //   .filter(Boolean); // I genuinely have no clue how this works, but I guess it does.

  // for (const section of sectionsByHeaders) {
  //   article.sections.push(markDownToSection(section));
  // }

  // tables aren't in tufte-css, and I always use fenced code blocks.
  const md = new MarkdownIt({ html: false })
    .use(MarkdownItFootNote)
    .disable(["table", "code", "strikethrough"]);

  const tokens = md.parse(body, {});
  // console.log(JSON.stringify(tokens));
  const tokenTypes = new Set();
  const clean = [];
  for (const token of tokens) {
    tokenTypes.add(token.type);
    clean.push({
      type: token.type,
      content: token.content,
      children: token.children,
    });
  }
  // console.log(JSON.stringify(clean));

  console.log(tokenTypes);

  return article;
}

function markDownToSection(source: string): Section {
  const blocks: Block[] = [];
  return { blocks };
}

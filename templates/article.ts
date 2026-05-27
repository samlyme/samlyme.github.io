import { readFileSync } from "node:fs";
import type { Content } from "../ast";

interface ArticleTemplateData {
  title: Content;
  subtitle: Content;
  body: Content;
}

const articleTemplate = readFileSync(
  new URL("./article.html", import.meta.url),
  "utf8",
);

export function renderArticleTemplate(data: ArticleTemplateData): string {
  return articleTemplate.replace(/{{\s*(title|subtitle|body)\s*}}/g, (
    _match,
    key: keyof ArticleTemplateData,
  ) => data[key]);
}

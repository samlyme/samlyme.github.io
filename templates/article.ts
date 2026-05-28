import { readFileSync } from "node:fs";
import type { Content } from "../ast";

interface ArticleTemplateData {
  title: Content;
  subtitle: Content;
  body: Content;
  assetPathPrefix: string;
}

type ArticleTemplateKey = keyof ArticleTemplateData | "header";

const articleTemplate = readFileSync(
  new URL("./article.html", import.meta.url),
  "utf8",
);
const headerTemplate = readFileSync(
  new URL("./header.html", import.meta.url),
  "utf8",
);

export function renderArticleTemplate(data: ArticleTemplateData): string {
  const templateData: Record<ArticleTemplateKey, string> = {
    title: data.title,
    subtitle: data.subtitle,
    body: data.body,
    assetPathPrefix: data.assetPathPrefix,
    header: headerTemplate,
  };

  return articleTemplate.replace(
    /{{\s*(title|subtitle|body|assetPathPrefix|header)\s*}}/g,
    (_match, key: ArticleTemplateKey) => templateData[key],
  );
}

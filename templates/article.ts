import { readFileSync } from "node:fs";
import type { Content } from "../ast";
import { renderHeaderTemplate, type HeaderLink } from "./header";

interface ArticleTemplateData {
  title: Content;
  subtitle: Content;
  body: Content;
  assetPathPrefix: string;
  headerLinks: HeaderLink[];
}

type ArticleTemplateKey =
  | keyof Omit<ArticleTemplateData, "headerLinks">
  | "header";

const articleTemplate = readFileSync(
  new URL("./article.html", import.meta.url),
  "utf8",
);

export function renderArticleTemplate(data: ArticleTemplateData): string {
  const templateData: Record<ArticleTemplateKey, string> = {
    title: data.title,
    subtitle: data.subtitle,
    body: data.body,
    assetPathPrefix: data.assetPathPrefix,
    header: renderHeaderTemplate({ links: data.headerLinks }),
  };

  return articleTemplate.replace(
    /{{\s*(title|subtitle|body|assetPathPrefix|header)\s*}}/g,
    (_match, key: ArticleTemplateKey) => templateData[key],
  );
}

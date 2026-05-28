import { markdownToArticle } from "./parse";
import { renderArticle } from "./render";

const inputPath = Bun.argv[2];
const outputPath = Bun.argv[3];
if (!inputPath || !outputPath)
  throw new Error("Must provide input and output paths.");

const source = await Bun.file(inputPath).text();
const article = markdownToArticle(source);

// console.log(JSON.stringify(article));

const html = renderArticle(article);
await Bun.write(outputPath, html);

// console.log(`Rendered ${inputPath} -> ${outputPath}`);

import { markdownToArticle } from "./parse";
import { renderArticle } from "./render";

const inputPath = Bun.argv[2] ?? "example.md";
const outputPath = Bun.argv[3] ?? "index.html";

const source = await Bun.file(inputPath).text();
const article = markdownToArticle(source);

console.log(JSON.stringify(article));

const html = renderArticle(article);
await Bun.write(outputPath, html);

// console.log(`Rendered ${inputPath} -> ${outputPath}`);

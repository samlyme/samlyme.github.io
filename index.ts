import { cp, mkdir, readdir } from "node:fs/promises";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import {
  createContentLinkResolver,
  createContentRouteMap,
  type ContentRouteMap,
} from "./content-routes";
import { markdownToArticle } from "./parse";
import { renderArticle } from "./render";
import { loadHeaderLinks, type HeaderLink } from "./templates/header";

const contentDir = "content";
const buildDir = "build";
const staticDir = "static";

await buildContent();

async function buildContent(): Promise<void> {
  await mkdir(buildDir, { recursive: true });
  // await Bun.write(join(buildDir, ".nojekyll"), ""); // Codex wrote this. not needed.
  await cp(staticDir, buildDir, { recursive: true, force: true }); // copy static assets

  const inputPaths = await findMarkdownFiles(contentDir);
  const headerLinks = await loadHeaderLinks(contentDir);
  const contentRoutes = createContentRouteMap(contentDir, inputPaths);
  await Promise.all(
    inputPaths.map((inputPath) =>
      renderMarkdownFile(inputPath, headerLinks, contentRoutes, inputPaths),
    ),
  );

  console.log(
    `Rendered ${inputPaths.length} file(s) from ${contentDir} -> ${buildDir}`,
  );
}

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const files: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const inputPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(inputPath)));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
      files.push(inputPath);
    }
  }

  return files;
}

async function renderMarkdownFile(
  inputPath: string,
  headerLinks: HeaderLink[],
  contentRoutes: ContentRouteMap,
  inputPaths: string[], // used for building page index.
): Promise<void> {
  const source = await Bun.file(inputPath).text();
  const article = markdownToArticle(source, {
    resolveWikilink: createContentLinkResolver(
      contentRoutes,
      relative(contentDir, inputPath),
    ),
    inputPath,
    inputPaths,
  });
  const outputPath = outputPathFor(inputPath);
  const html = renderArticle(article, {
    assetPathPrefix: assetPathPrefixFor(outputPath),
    headerLinks,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, html);
}

function outputPathFor(inputPath: string): string {
  const relativePath = relative(contentDir, inputPath);
  const withoutExtension = relativePath.slice(0, -extname(relativePath).length);

  if (basename(withoutExtension) === "index") {
    return join(buildDir, `${withoutExtension}.html`);
  }

  return join(buildDir, withoutExtension, "index.html");
}

function assetPathPrefixFor(outputPath: string): string {
  const relativeBuildRoot = relative(dirname(outputPath), buildDir)
    .split(sep)
    .join("/");

  return relativeBuildRoot ? `${relativeBuildRoot}/` : "";
}

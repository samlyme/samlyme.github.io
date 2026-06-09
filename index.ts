import { cp, mkdir, readdir } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  join,
  posix,
  relative,
  sep,
} from "node:path";
import type {
  Article,
  Block,
  InlineItem,
  Note,
  NoteContent,
  Text,
} from "./ast";
import {
  createContentLinkResolver,
  createContentRouteMap,
  type ContentRouteMap,
} from "./content-routes";
import { markdownToArticle } from "./parse";
import { renderArticle } from "./render";
import { loadHeaderLinks, type HeaderLink } from "./templates/header";

const defaultContentDir = "content";
const defaultBuildDir = "build";
const defaultStaticDir = "static";
const defaultSpecialAssetDirNames = ["attachments"];

interface BuildContentOptions {
  contentDir?: string;
  buildDir?: string;
  staticDir?: string;
  specialAssetDirNames?: string[];
}

if (import.meta.main) {
  await buildContent();
}

export async function buildContent({
  contentDir = defaultContentDir,
  buildDir = defaultBuildDir,
  staticDir = defaultStaticDir,
  specialAssetDirNames = defaultSpecialAssetDirNames,
}: BuildContentOptions = {}): Promise<void> {
  const specialAssetDirs = new Set(specialAssetDirNames);

  await mkdir(buildDir, { recursive: true });
  // await Bun.write(join(buildDir, ".nojekyll"), ""); // Codex wrote this. not needed.
  await cp(staticDir, buildDir, { recursive: true, force: true }); // copy static assets
  await copySpecialAssetDirectories(contentDir, buildDir, specialAssetDirs);

  const inputPaths = await findMarkdownFiles(contentDir, specialAssetDirs);
  const headerLinks = await loadHeaderLinks(contentDir, {
    ignoredDirectoryNames: specialAssetDirs,
  });
  const contentRoutes = createContentRouteMap(contentDir, inputPaths);
  await Promise.all(
    inputPaths.map((inputPath) =>
      renderMarkdownFile({
        inputPath,
        headerLinks,
        contentRoutes,
        inputPaths,
        contentDir,
        buildDir,
      }),
    ),
  );

  console.log(
    `Rendered ${inputPaths.length} file(s) from ${contentDir} -> ${buildDir}`,
  );
}

export async function findMarkdownFiles(
  directory: string,
  ignoredDirectoryNames: ReadonlySet<string> = new Set(
    defaultSpecialAssetDirNames,
  ),
): Promise<string[]> {
  const files: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const inputPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        files.push(
          ...(await findMarkdownFiles(inputPath, ignoredDirectoryNames)),
        );
      }
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
      files.push(inputPath);
    }
  }

  return files;
}

interface RenderMarkdownFileOptions {
  inputPath: string;
  headerLinks: HeaderLink[];
  contentRoutes: ContentRouteMap;
  inputPaths: string[];
  contentDir: string;
  buildDir: string;
}

async function renderMarkdownFile({
  inputPath,
  headerLinks,
  contentRoutes,
  inputPaths,
  contentDir,
  buildDir,
}: RenderMarkdownFileOptions): Promise<void> {
  const source = await Bun.file(inputPath).text();
  const article = markdownToArticle(source, {
    resolveWikilink: createContentLinkResolver(
      contentRoutes,
      relative(contentDir, inputPath),
    ),
    inputPath,
    inputPaths,
  });
  const outputPath = outputPathFor(inputPath, contentDir, buildDir);
  rewriteLocalAssetPaths(article, {
    contentDir,
    buildDir,
    inputPath,
    outputPath,
  });
  const html = renderArticle(article, {
    assetPathPrefix: assetPathPrefixFor(outputPath, buildDir),
    headerLinks,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, html);
}

function outputPathFor(
  inputPath: string,
  contentDir: string,
  buildDir: string,
): string {
  const relativePath = relative(contentDir, inputPath);
  const withoutExtension = relativePath.slice(0, -extname(relativePath).length);

  if (basename(withoutExtension) === "index") {
    return join(buildDir, `${withoutExtension}.html`);
  }

  return join(buildDir, withoutExtension, "index.html");
}

function assetPathPrefixFor(outputPath: string, buildDir: string): string {
  const relativeBuildRoot = relative(dirname(outputPath), buildDir)
    .split(sep)
    .join("/");

  return relativeBuildRoot ? `${relativeBuildRoot}/` : "";
}

async function copySpecialAssetDirectories(
  contentDir: string,
  buildDir: string,
  specialAssetDirNames: ReadonlySet<string>,
): Promise<void> {
  const assetDirs = await findSpecialAssetDirectories(
    contentDir,
    specialAssetDirNames,
  );

  await Promise.all(
    assetDirs.map((assetDir) =>
      cp(assetDir, join(buildDir, relative(contentDir, assetDir)), {
        recursive: true,
        force: true,
      }),
    ),
  );
}

async function findSpecialAssetDirectories(
  directory: string,
  specialAssetDirNames: ReadonlySet<string>,
): Promise<string[]> {
  const directories: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const inputPath = join(directory, entry.name);
    if (specialAssetDirNames.has(entry.name)) {
      directories.push(inputPath);
    } else {
      directories.push(
        ...(await findSpecialAssetDirectories(inputPath, specialAssetDirNames)),
      );
    }
  }

  return directories;
}

interface AssetRewriteContext {
  contentDir: string;
  buildDir: string;
  inputPath: string;
  outputPath: string;
}

function rewriteLocalAssetPaths(
  article: Article,
  context: AssetRewriteContext,
): void {
  for (const section of article.sections) {
    for (const block of section.blocks) {
      rewriteBlockAssetPaths(block, context);
    }
  }
}

function rewriteBlockAssetPaths(
  block: Block,
  context: AssetRewriteContext,
): void {
  switch (block.type) {
    case "figure":
      block.image.src = outputRelativeAssetPath(block.image.src, context);
      rewriteTextAssetPaths(block.text, context);
      if (block.note) rewriteNoteAssetPaths(block.note, context);
      break;
    case "paragraph":
      if (block.newthought) rewriteTextAssetPaths(block.newthought, context);
      rewriteTextAssetPaths(block.text, context);
      break;
    case "list":
      for (const item of block.items) {
        for (const itemBlock of item) rewriteBlockAssetPaths(itemBlock, context);
      }
      break;
    case "blockQuote":
      for (const childBlock of block.blocks) {
        rewriteBlockAssetPaths(childBlock, context);
      }
      rewriteTextAssetPaths(block.footer, context);
      break;
    case "epigraph":
      rewriteBlockAssetPaths(block.blockQuote, context);
      break;
    case "heading":
      rewriteTextAssetPaths(block.text, context);
      break;
    case "codeBlock":
    case "horizontalRule":
    case "pageIndex":
      break;
  }
}

function rewriteTextAssetPaths(
  text: Text,
  context: AssetRewriteContext,
): void {
  for (const item of text) rewriteInlineItemAssetPaths(item, context);
}

function rewriteInlineItemAssetPaths(
  item: InlineItem,
  context: AssetRewriteContext,
): void {
  if (item.type === "note") rewriteNoteAssetPaths(item, context);
}

function rewriteNoteAssetPaths(
  note: Note,
  context: AssetRewriteContext,
): void {
  for (const item of note.content) rewriteNoteContentAssetPaths(item, context);
}

function rewriteNoteContentAssetPaths(
  item: NoteContent,
  context: AssetRewriteContext,
): void {
  if (item.type === "marginFigure") {
    item.image.src = outputRelativeAssetPath(item.image.src, context);
  }
}

export function outputRelativeAssetPath(
  assetPath: string,
  { contentDir, buildDir, inputPath, outputPath }: AssetRewriteContext,
): string {
  if (isStableAssetPath(assetPath)) return assetPath;

  const { pathname, suffix } = splitPathnameSuffix(assetPath);
  if (pathname === "") return assetPath;

  const inputContentPath = toPosixPath(relative(contentDir, inputPath));
  const inputContentDir = posix.dirname(inputContentPath);
  const sourceAssetPath = posix.normalize(
    posix.join(inputContentDir === "." ? "" : inputContentDir, pathname),
  );

  if (sourceAssetPath === ".." || sourceAssetPath.startsWith("../")) {
    return assetPath;
  }

  const buildAssetPath = posix.join(toPosixPath(buildDir), sourceAssetPath);
  const outputDir = toPosixPath(dirname(outputPath));
  const relativeAssetPath = posix.relative(outputDir, buildAssetPath);

  return `${relativeAssetPath || "."}${suffix}`;
}

function splitPathnameSuffix(value: string): {
  pathname: string;
  suffix: string;
} {
  const suffixIndex = value.search(/[?#]/);

  if (suffixIndex === -1) return { pathname: value, suffix: "" };

  return {
    pathname: value.slice(0, suffixIndex),
    suffix: value.slice(suffixIndex),
  };
}

function isStableAssetPath(value: string): boolean {
  return (
    value.startsWith("#") ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

function toPosixPath(value: string): string {
  return value.split(sep).join("/");
}

import { basename, dirname, extname, posix, relative, sep } from "node:path";

export type ContentRouteMap = Map<string, string>;

export function createContentRouteMap(
  contentDir: string,
  inputPaths: string[],
): ContentRouteMap {
  const routes: ContentRouteMap = new Map();

  for (const inputPath of inputPaths) {
    const contentPath = normalizeContentPath(relative(contentDir, inputPath));
    const route = routeForContentPath(contentPath);

    for (const key of routeKeysForContentPath(contentPath)) {
      routes.set(key, route);
    }
  }

  return routes;
}

export function createContentLinkResolver(
  routes: ContentRouteMap,
  sourceContentPath: string,
): (target: string) => string | undefined {
  return (target) => resolveContentLink(routes, sourceContentPath, target);
}

export function resolveContentLink(
  routes: ContentRouteMap,
  sourceContentPath: string,
  target: string,
): string | undefined {
  if (isGeneralUrl(target)) return undefined;

  const { pathname, suffix } = splitPathnameSuffix(target);
  if (pathname === "") return undefined;

  for (const candidate of contentLinkCandidates(sourceContentPath, pathname)) {
    const route = routes.get(candidate);
    if (route) return `${route}${suffix}`;
  }

  return undefined;
}

function routeForContentPath(contentPath: string): string {
  const withoutExtension = stripMarkdownExtension(contentPath);
  const routePath =
    basename(withoutExtension) === "index"
      ? dirname(withoutExtension)
      : withoutExtension;

  if (routePath === "." || routePath === "") return "/";

  return `/${routePath.split("/").map(encodeURIComponent).join("/")}/`;
}

function routeKeysForContentPath(contentPath: string): string[] {
  const withoutExtension = stripMarkdownExtension(contentPath);
  const keys = new Set([contentPath, withoutExtension]);

  if (basename(withoutExtension) === "index") {
    const indexDirectory = dirname(withoutExtension);

    if (indexDirectory === ".") {
      keys.add("");
      keys.add("index");
      keys.add("index.md");
    } else {
      keys.add(indexDirectory);
      keys.add(`${indexDirectory}/index`);
      keys.add(`${indexDirectory}/index.md`);
    }
  }

  return [...keys].map(normalizeContentPath);
}

function contentLinkCandidates(
  sourceContentPath: string,
  targetPathname: string,
): string[] {
  const pathname = normalizeContentPath(targetPathname);
  const sourceDirectory = dirname(normalizeContentPath(sourceContentPath));
  const candidates = new Set<string>();

  if (targetPathname.startsWith("/")) {
    candidates.add(pathname);
  } else {
    const relativePath = normalizeContentPath(
      posix.join(sourceDirectory, pathname),
    );
    candidates.add(relativePath);
    candidates.add(pathname);
  }

  return [...candidates];
}

function splitPathnameSuffix(target: string): {
  pathname: string;
  suffix: string;
} {
  const suffixIndex = target.search(/[?#]/);

  if (suffixIndex === -1) {
    return { pathname: target, suffix: "" };
  }

  return {
    pathname: target.slice(0, suffixIndex),
    suffix: target.slice(suffixIndex),
  };
}

function normalizeContentPath(value: string): string {
  const normalized = posix.normalize(
    value.split(sep).join("/").replace(/^\/+/, ""),
  );

  return normalized === "." ? "" : normalized.replace(/\/+$/, "");
}

function stripMarkdownExtension(contentPath: string): string {
  return contentPath.slice(0, -extname(contentPath).length);
}

function isGeneralUrl(target: string): boolean {
  return (
    target.startsWith("#") ||
    target.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(target)
  );
}

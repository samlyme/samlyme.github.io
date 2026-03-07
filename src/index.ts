import * as yaml from "js-yaml";
import z from "zod";
import { readdir, stat } from "node:fs/promises";
import { join, parse as pathParse, basename } from "node:path";
import { mkdir } from "node:fs/promises";
import Bun from "bun";

type HTML = string & { __brand: "html" };

function mainTemplate(title: string, content: HTML): HTML {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sam Ly - ${title}</title>
    <link rel="stylesheet" href="/style.css">
    <script>
MathJax = {
  tex: {
    inlineMath: {'[+]': [['$', '$']]}
  },
  svg: {
    fontCache: 'global'
  }
};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
</head>
<body>
    <main>
        ${content}
    </main>

    <hr>
    <footer>
        <a href="/">home</a> | <a href="/contact">contact</a> | <a href="/blogs/">blogs</a>
    </footer>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
</body>
</html>
    ` as HTML;
}

function blogTemplate(title: string, content: HTML): HTML {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sam Ly - ${title}</title>
    <link rel="stylesheet" href="/style.css">
    <link
			href="https://unpkg.com/prismjs@1.20.0/themes/prism-okaidia.css"
			rel="stylesheet"
		/>
    <script>
MathJax = {
  tex: {
    inlineMath: {'[+]': [['$', '$']]}
  },
  svg: {
    fontCache: 'global'
  }
};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
</head>
<body>
    <header>
        <h1>${title}</h1>
    </header>
    <main>
        ${content}
    </main>

    <hr>
    <footer>
        <a href="/">home</a> | <a href="/contact">contact</a> | <a href="/blogs/">blogs</a>
    </footer>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
</body>
</html>
    ` as HTML;
}

const Layout = z.enum(["blog", "main"]);
type Layout = z.infer<typeof Layout>;

const Frontmatter = z.object({
  layout: Layout,
  title: z.string(),
  tags: z.optional(z.string()), // could be array of strings
});
type Frontmatter = z.infer<typeof Frontmatter>;

function splitFrontmatter(text: string): {
  frontmatter: Frontmatter;
  content: string;
} {
  const lines = text.split("---").slice(1);
  // console.log(lines);
  const yamlText = lines[0]!;
  const frontmatter = Frontmatter.parse(yaml.load(yamlText));

  const content = lines[1]!;

  return { frontmatter, content };
}

function parseMarkdown(text: string): HTML {
  return Bun.markdown.html(text, { latexMath: true }) as HTML;
}

function renderHtml(frontmatter: Frontmatter, content: HTML): HTML {
  const { layout, title } = frontmatter;
  switch (layout) {
    case "main":
      return mainTemplate(title, content);
    case "blog":
      return blogTemplate(title, content);
    default:
      throw new Error("Unknown Layout!");
  }
}

interface LeafNode {
  kind: "leaf";
  name: string;
  data: {
    frontmatter: Frontmatter;
    content: string;
  };
}
interface BranchNode {
  kind: "branch";
  name: string;
  index: LeafNode; // must be the index.md!
  children: (LeafNode | BranchNode)[];
}
type Node = LeafNode | BranchNode;
export async function parse(
  targetPath: string,
): Promise<LeafNode | BranchNode> {
  const fileStat = await stat(targetPath);

  if (fileStat.isDirectory()) {
    const entries = await readdir(targetPath, { withFileTypes: true });

    const childrenNodes = await Promise.all(
      entries.map((entry) => parse(join(targetPath, entry.name))),
    );

    const indexPosition = childrenNodes.findIndex(
      (child) => child.name === "index",
    );

    if (indexPosition === -1) {
      throw new Error(`index.md not found for directory: ${targetPath}`);
    }

    const [indexNode] = childrenNodes.splice(indexPosition, 1);

    return {
      kind: "branch",
      name: basename(targetPath),
      index: indexNode as LeafNode,
      children: childrenNodes,
    };
  }

  const pathInfo = pathParse(targetPath);

  return {
    kind: "leaf",
    name: pathInfo.name, // "about.md" becomes "about"
    data: splitFrontmatter(await Bun.file(targetPath).text()),
  };
}

function indexNavSection(branch: BranchNode) {
  const all = branch.children.map(
    (elem) => ` - [${elem.name}](./${encodeURIComponent(elem.name)})`,
  );
  return "\n\n" + all.join("\n");
}

interface HTMLLeaf {
  kind: "file";
  name: string;
  data: HTML;
}
interface HTMLBranchNode {
  kind: "dir";
  name: string;
  data: (HTMLLeaf | HTMLBranchNode)[];
}
type HTMLNode = HTMLLeaf | HTMLBranchNode;
function parseTree(root: Node): HTMLNode {
  const name = root.name;
  if (root.kind === "branch") {
    const navSection = indexNavSection(root);

    const innerHtml = parseMarkdown(root.index.data.content + navSection);
    const html = renderHtml(root.index.data.frontmatter, innerHtml);

    const indexLeaf: HTMLLeaf = {
      kind: "file",
      name: "index",
      data: html,
    };

    const childNodes = root.children.map(parseTree);

    return {
      kind: "dir",
      name,
      data: [indexLeaf, ...childNodes],
    };
  } else {
    const { frontmatter, content } = root.data;
    const html = renderHtml(frontmatter, parseMarkdown(content));

    return {
      kind: "file",
      name,
      data: html,
    };
  }
}

function outputHtmlTree(root: HTMLNode, path: string) {
  if (root.kind === "dir") {
    const newPath = join(path, root.name);
    mkdir(newPath, { recursive: true });
    root.data.map((elem) => outputHtmlTree(elem, newPath));
  } else {
    const out = Bun.file(join(path, root.name + ".html"));
    Bun.write(out, root.data);
  }
}

const contentTree = await parse("content");

const htmlTree = parseTree(contentTree);
// console.log(contentTree);
// console.log(htmlTree);

if (htmlTree.kind !== "dir")
  throw new Error("the root should be the content node. Must be a dir!");

htmlTree.data.map((elem) => outputHtmlTree(elem, "build"));

const css = Bun.file("src/style.css");
const cssBuild = Bun.file("build/style.css");
await Bun.write(cssBuild, css);

import * as yaml from "js-yaml";
import z from "zod";

type HTML = string;

function mainTemplate(title: string, content: HTML): HTML {
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
</head>
<body>
    <main>
        ${content}
    </main>

    <hr>
    <footer>
        <a href="/">home</a> | <a href="/contact">contact</a> | <a href="/blogs">blogs</a>
    </footer>
</body>
</html>
    `
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
        <a href="/">home</a> | <a href="/contact">contact</a> | <a href="/blogs">blogs</a>
    </footer>
</body>
</html>
    `
}


const Layout = z.enum(["blog", "main"]);
type Layout = z.infer<typeof Layout>;

const Frontmatter = z.object({
    layout: Layout,
    title: z.string(),
    tags: z.optional(z.string()), // could be array of strings
})
type Frontmatter = z.infer<typeof Frontmatter>;


function parseMarkdown(text: string): { frontmatter: Frontmatter, content: HTML } {
    const lines = text.split("---").slice(1);
    // console.log(lines);
    const yamlText = lines[0]!;
    const frontmatter = Frontmatter.parse(yaml.load(yamlText));

    const content = Bun.markdown.html(lines[1]!);

    return { frontmatter, content };
}

function render(frontmatter: Frontmatter, content: string): HTML {
    const { layout, title } = frontmatter;
    switch (layout) {
        case "main": return mainTemplate(title, content);
        case "blog": return blogTemplate(title, content);
        default: throw new Error("Unknown Layout!");
    }
}

const buildPromise = [];

const css = Bun.file("./style.css");
const cssBuild = Bun.file("./build/style.css");
buildPromise.push(Bun.write(cssBuild, css));

const file = Bun.file("./src/index.md");
const text = await file.text();
const { frontmatter, content } = parseMarkdown(text);

const html = render(frontmatter, content);
const htmlBuild = Bun.file("./build/index.html");
buildPromise.push(Bun.write(htmlBuild, html));

Promise.all(buildPromise);

// const distPromise = [];
await Bun.build({
  entrypoints: ["./build/index.html"],
  compile: true,
  target: "browser",
  outdir: "./dist",
});

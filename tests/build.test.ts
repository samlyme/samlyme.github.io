import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { buildContent, findMarkdownFiles } from "../index";

const doc = (title: string, body: string) => `---
title: ${title}
---

${body}
`;

test("copies attachment directories and rewrites local image paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "tufte-build-"));
  const contentDir = join(root, "content");
  const buildDir = join(root, "build");
  const staticDir = join(root, "static");

  try {
    await mkdir(join(contentDir, "attachments"), { recursive: true });
    await mkdir(join(contentDir, "blogs", "attachments"), { recursive: true });
    await mkdir(staticDir, { recursive: true });

    await writeFile(
      join(contentDir, "index.md"),
      doc("Home", "![[attachments/root image.png]]"),
    );
    await writeFile(
      join(contentDir, "blogs", "Post.md"),
      doc("Post", "![[attachments/blog image.png]]"),
    );
    await writeFile(
      join(contentDir, "attachments", "root image.png"),
      "root image",
    );
    await writeFile(
      join(contentDir, "blogs", "attachments", "blog image.png"),
      "blog image",
    );

    await buildContent({ contentDir, buildDir, staticDir });

    expect(
      await readFile(join(buildDir, "attachments", "root image.png"), "utf8"),
    ).toBe("root image");
    expect(
      await readFile(
        join(buildDir, "blogs", "attachments", "blog image.png"),
        "utf8",
      ),
    ).toBe("blog image");

    const rootHtml = await readFile(join(buildDir, "index.html"), "utf8");
    const postHtml = await readFile(
      join(buildDir, "blogs", "Post", "index.html"),
      "utf8",
    );

    expect(rootHtml).toContain('src="attachments/root%20image.png"');
    expect(postHtml).toContain('src="../attachments/blog%20image.png"');
    expect(rootHtml).not.toContain('<a href="/attachments">Attachments</a>');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("findMarkdownFiles skips special asset directories", async () => {
  const contentDir = await mkdtemp(join(tmpdir(), "tufte-content-"));

  try {
    await mkdir(join(contentDir, "attachments"), { recursive: true });
    await writeFile(join(contentDir, "page.md"), "");
    await writeFile(join(contentDir, "attachments", "ignored.md"), "");

    expect((await findMarkdownFiles(contentDir)).sort()).toEqual([
      join(contentDir, "page.md"),
    ]);
  } finally {
    await rm(contentDir, { recursive: true, force: true });
  }
});

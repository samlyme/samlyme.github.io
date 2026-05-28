import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { loadHeaderLinks } from "../templates/header";

test("loads one-level header links from top-level content entries", async () => {
  const contentDir = await mkdtemp(join(tmpdir(), "tufte-header-"));

  try {
    await writeFile(join(contentDir, "index.md"), "");
    await writeFile(join(contentDir, "about.md"), "");
    await mkdir(join(contentDir, "blogs"));
    await writeFile(join(contentDir, "blogs", "post.md"), "");

    const links = await loadHeaderLinks(contentDir);

    expect(links).toEqual([
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Blogs", href: "/blogs" },
    ]);
  } finally {
    await rm(contentDir, { recursive: true, force: true });
  }
});

import { mkdir } from "node:fs/promises";
import { readdir } from "node:fs/promises";

const start = process.cwd();
process.chdir("content");

const files = await readdir(".", {
  recursive: true,
  withFileTypes: true,
});

const docs = files.filter((item) => !item.isDirectory());

process.chdir(start);
await mkdir("build", { recursive: true });
process.chdir("build");

for (const doc of docs) {
  if (doc.name === "index.md") {
    await Bun.write(`./${doc.parentPath}/index.html`, `From: ${doc.name}`, {
      createPath: true,
    });
  } else {
    await Bun.write(
      `./${doc.parentPath}/${doc.name.slice(0, -3)}/index.html`,
      `From: ${doc.name}`,
      { createPath: true },
    );
  }
}

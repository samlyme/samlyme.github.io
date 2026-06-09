import { readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { spawn } from "node:child_process";

const contentDir = "content";
const pollIntervalMs = 500;

let lastSnapshot = await snapshotDirectory(contentDir);
let buildInProgress = false;
let rebuildQueued = false;

void rebuild();

setInterval(async () => {
  const nextSnapshot = await snapshotDirectory(contentDir);

  if (nextSnapshot === lastSnapshot) return;

  lastSnapshot = nextSnapshot;
  void rebuild();
}, pollIntervalMs);

console.log(`Watching ${contentDir} for changes...`);

async function rebuild(): Promise<void> {
  if (buildInProgress) {
    rebuildQueued = true;
    return;
  }

  buildInProgress = true;
  const child = spawn("bun", ["run", "build"], { stdio: "inherit" });

  child.on("exit", () => {
    buildInProgress = false;

    if (rebuildQueued) {
      rebuildQueued = false;
      void rebuild();
    }
  });
}

async function snapshotDirectory(directory: string): Promise<string> {
  const entries: string[] = [];

  await collectSnapshotEntries(directory, entries);

  return entries.sort().join("\n");
}

async function collectSnapshotEntries(
  directory: string,
  entries: string[],
): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const inputPath = join(directory, entry.name);
    const stats = await stat(inputPath);
    const normalizedPath = relative(contentDir, inputPath).split(sep).join("/");

    entries.push(`${normalizedPath}\t${stats.size}\t${stats.mtimeMs}`);

    if (entry.isDirectory()) {
      await collectSnapshotEntries(inputPath, entries);
    }
  }
}

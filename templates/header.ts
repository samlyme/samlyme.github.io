import type { Dirent } from "node:fs";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, extname } from "node:path";

export interface HeaderLink {
  label: string;
  href: string;
}

interface HeaderTemplateData {
  links: HeaderLink[];
}

const headerTemplate = readFileSync(
  new URL("./header.html", import.meta.url),
  "utf8",
);

export async function loadHeaderLinks(contentDir: string): Promise<HeaderLink[]> {
  const entries = await readdir(contentDir, { withFileTypes: true });

  return entries
    .filter(isTopLevelContentEntry)
    .map(headerLinkFor)
    .sort(compareHeaderLinks);
}

export function renderHeaderTemplate(data: HeaderTemplateData): string {
  const links = data.links.map(renderHeaderLink).join("\n      ");

  return headerTemplate.replace(/{{\s*links\s*}}/g, links);
}

function isTopLevelContentEntry(entry: Dirent): boolean {
  if (entry.name.startsWith(".")) return false;

  return (
    entry.isDirectory() ||
    (entry.isFile() && extname(entry.name).toLowerCase() === ".md")
  );
}

function headerLinkFor(entry: Dirent): HeaderLink {
  const name = entry.isDirectory()
    ? entry.name
    : basename(entry.name, extname(entry.name));

  if (name === "index") {
    return { label: "Home", href: "/" };
  }

  return {
    label: titleize(name),
    href: `/${encodeURIComponent(name)}`,
  };
}

function compareHeaderLinks(a: HeaderLink, b: HeaderLink): number {
  if (a.href === "/") return -1;
  if (b.href === "/") return 1;

  return a.label.localeCompare(b.label);
}

function renderHeaderLink(link: HeaderLink): string {
  return `<li><a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a></li>`;
}

function titleize(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, escapeHtmlCharacter);
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, escapeHtmlCharacter);
}

function escapeHtmlCharacter(character: string): string {
  switch (character) {
    case "&":
      return "&amp;";
    case "<":
      return "&lt;";
    case ">":
      return "&gt;";
    case '"':
      return "&quot;";
    case "'":
      return "&#39;";
    default:
      return character;
  }
}

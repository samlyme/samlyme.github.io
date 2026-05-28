import { expect, test } from "bun:test";
import { createContentRouteMap, resolveContentLink } from "../content-routes";

const routes = createContentRouteMap("content", [
  "content/index.md",
  "content/about.md",
  "content/blogs/index.md",
  "content/blogs/Information Theory.md",
]);

test("resolves content index wikilinks to their directory route", () => {
  expect(resolveContentLink(routes, "index.md", "blogs/index")).toBe("/blogs/");
  expect(resolveContentLink(routes, "index.md", "blogs/index.md")).toBe(
    "/blogs/",
  );
  expect(resolveContentLink(routes, "index.md", "blogs")).toBe("/blogs/");
});

test("resolves content wikilinks relative to the source file", () => {
  expect(
    resolveContentLink(routes, "blogs/index.md", "Information Theory"),
  ).toBe("/blogs/Information%20Theory/");
});

test("does not resolve general urls or unknown assets as content links", () => {
  expect(
    resolveContentLink(routes, "index.md", "https://example.com/path"),
  ).toBe(undefined);
  expect(resolveContentLink(routes, "index.md", "resume.pdf")).toBe(undefined);
});

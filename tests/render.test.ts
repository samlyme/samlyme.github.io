import { expect, test } from "bun:test";
import type { Article } from "../ast";
import { renderArticle, sanitizeText } from "../render";

const articleWithMath: Article = {
  title: sanitizeText("Math"),
  subtitle: sanitizeText("Rendering"),
  sections: [
    {
      blocks: [
        {
          type: "paragraph",
          text: [
            {
              type: "textChunk",
              content: sanitizeText("Inline $F_n \\le 2^n$ and display $$x^2$$."),
              bold: false,
              italic: false,
              code: false,
            },
          ],
        },
        {
          type: "codeBlock",
          language: "tex",
          content: "$not_math$",
        },
      ],
    },
  ],
};

test("configures MathJax before loading it", () => {
  const html = renderArticle(articleWithMath);

  expect(html).toContain('inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]]');
  expect(html).toContain('displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]]');
  expect(html).toContain("processEscapes: true");
  expect(html).toContain(
    'skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]',
  );
  expect(html.indexOf("window.MathJax")).toBeLessThan(
    html.indexOf("MathJax-script"),
  );
});

test("renders the shared header before article content", () => {
  const html = renderArticle(articleWithMath, {
    headerLinks: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Blogs", href: "/blogs" },
    ],
  });

  expect(html).toContain('<nav class="nav">');
  expect(html).toContain('<li><a href="/">Home</a></li>');
  expect(html).toContain('<li><a href="/about">About</a></li>');
  expect(html).toContain('<li><a href="/blogs">Blogs</a></li>');
  expect(html.indexOf("<header>")).toBeLessThan(html.indexOf("<h1>Math</h1>"));
});

test("leaves tex delimiters in article text for browser-side MathJax", () => {
  const html = renderArticle(articleWithMath);

  expect(html).toContain("Inline $F_n \\le 2^n$ and display $$x^2$$.");
  expect(html).toContain("<code class=\"language-tex\">$not_math$</code>");
});

test("renders note images inline without changing regular figures", () => {
  const html = renderArticle({
    title: sanitizeText("Images"),
    subtitle: sanitizeText("Notes"),
    sections: [
      {
        blocks: [
          {
            type: "figure",
            variant: "standard",
            text: [],
            image: { src: "regular.png", alt: "regular" },
          },
          {
            type: "paragraph",
            text: [
              { type: "textChunk", content: sanitizeText("See note") },
              {
                type: "note",
                variant: "side",
                id: "ref-0",
                content: [
                  {
                    type: "marginFigure",
                    image: { src: "note.png", alt: "note" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(html).toContain('<figure ><img src="regular.png" alt="regular"></img>');

  const sidenoteStart = html.indexOf('<span class="sidenote">');
  const sidenoteEnd = html.indexOf("</span>", sidenoteStart);
  const sidenoteHtml = html.slice(sidenoteStart, sidenoteEnd);

  expect(sidenoteHtml).toContain('<img src="note.png" alt="note"></img>');
  expect(sidenoteHtml).not.toContain("<figure");
});

import { expect, test } from "bun:test";
import type { Article } from "./ast";
import { renderArticle, sanitizeText } from "./render";

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

test("leaves tex delimiters in article text for browser-side MathJax", () => {
  const html = renderArticle(articleWithMath);

  expect(html).toContain("Inline $F_n \\le 2^n$ and display $$x^2$$.");
  expect(html).toContain("<code class=\"language-tex\">$not_math$</code>");
});

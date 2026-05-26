import type { Article, TextChunk, Content, Text, Note } from "./ast";
import { renderArticle } from "./render";
// maybe theres a better way to model this,
// Sanitized text! HTML is escaped.
// I do not allow for inline html unless explicitly in a directive!
export function sanitizeText(unsafeString: string): Content {
  return unsafeString.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;"; // &#39; is safer than &apos; for older browsers
      default:
        return match;
    }
  }) as Content;
}

type ChunkStyle = Omit<TextChunk, "type" | "content">;

const chunk = (content: string, style: ChunkStyle = {}): TextChunk => ({
  type: "textChunk",
  content: sanitizeText(content),
  ...style,
});

const note = (
  variant: Note["variant"],
  id: string,
  ...content: Text
): Note => ({
  type: "note",
  variant,
  id,
  content,
});

const text = (...items: Text): Text => items;

export const article: Article = {
  title: sanitizeText("A Reasonable Dummy Article"),
  subtitle: sanitizeText("Lorem Ipsum for the Tufte DSL"),
  sections: [
    {
      blocks: [
        {
          type: "epigraph",
          blockQuote: {
            type: "blockQuote",
            content: text(
              chunk(
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                { italic: true },
              ),
            ),
            footer: text(chunk("Pseudo-Cicero, De Finibus")),
          },
        },
        {
          type: "heading",
          level: "section",
          text: text(chunk("Opening Observations")),
        },
        {
          type: "paragraph",
          newthought: text(chunk("Lorem ipsum")),
          text: text(
            chunk(
              "dolor sit amet, consectetur adipiscing elit. Integer nec odio praesent libero sed cursus ante dapibus diam. ",
            ),
            chunk("codeeee", { code: true }),
            note(
              "side",
              "opening-note",
              chunk(
                "A sidenote is part of the inline text stream, with its own nested text content.",
              ),
            ),
            chunk("Sed nisi", { bold: true }),
            chunk(
              ", nulla quis sem at nibh elementum imperdiet duis sagittis ipsum.",
            ),
          ),
        },
        {
          type: "paragraph",
          text: text(
            chunk("Praesent mauris fusce nec tellus sed augue semper porta. "),
            chunk("Mauris massa", { italic: true }),
            chunk(
              ", vestibulum lacinia arcu eget nulla class aptent taciti sociosqu ad litora torquent per conubia nostra.",
            ),
          ),
        },
        {
          type: "list",
          listType: "unordered",
          items: [
            text(chunk("Curabitur sodales ligula in libero.")),
            text(chunk("Sed dignissim lacinia nunc.")),
            text(
              chunk("Nulla metus metus, ullamcorper vel, tincidunt sed, "),
              chunk("euismod", { code: true }),
              chunk(" in, nibh."),
            ),
          ],
        },
      ],
    },
    {
      blocks: [
        {
          type: "heading",
          level: "section",
          text: text(chunk("A Small Demonstration")),
        },
        {
          type: "paragraph",
          text: text(
            chunk(
              "Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. ",
            ),
            chunk("Nam nec ante", {
              link: "https://example.com/lorem-ipsum",
            }),
            note(
              "margin",
              "margin-note",
              chunk("A margin note uses the same inline note node with "),
              chunk("variant", { code: true }),
              chunk(" set to "),
              chunk("margin", { code: true }),
              chunk("."),
            ),
            chunk(" sed lacinia urna non tincidunt mattis tortor neque."),
          ),
        },
        {
          type: "heading",
          level: "subsection",
          text: text(chunk("Indented Example")),
        },
        {
          type: "paragraph",
          newthought: text(chunk("Hmmm, this is interesting!")),
          text: text(chunk("wow!", { bold: true })),
        },
        {
          type: "codeBlock",
          language: "ts",
          content: `const ratio = 1.618;
const measure = Math.round(42 * ratio);
console.log({ measure });`,
        },
        {
          type: "blockQuote",
          content: text(
            chunk(
              "Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.",
            ),
          ),
          footer: text(chunk("Aenean massa")),
        },
        {
          type: "list",
          listType: "ordered",
          items: [
            text(chunk("Aliquam lorem ante, dapibus in, viverra quis.")),
            text(chunk("Feugiat a, tellus phasellus viverra nulla.")),
            text(chunk("Metus varius laoreet quisque rutrum.")),
          ],
        },
        {
          type: "paragraph",
          text: text(
            chunk(
              "Aenean imperdiet etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi nam eget dui etiam rhoncus maecenas tempus tellus eget condimentum rhoncus sem quam semper libero.",
            ),
          ),
        },
      ],
    },
  ],
};

console.log(renderArticle(article));

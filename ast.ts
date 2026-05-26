export interface Article {
  title: Content;
  subtitle: Content;
  sections: Section[];
}

export interface Section {
  blocks: Block[];
}

export type Block =
  | Heading
  | Paragraph
  | List
  | CodeBlock
  | BlockQuote
  | Epigraph
  | Figure;

export interface Paragraph {
  type: "paragraph";
  newthought?: Text;
  text: Text;
}
export interface CodeBlock {
  type: "codeBlock";
  language?: string; // may be provided.
  content: string; // can be arbitrary since it is escaped.
}

export interface List {
  type: "list";
  listType: "ordered" | "unordered";
  items: Text[];
}

export interface Heading {
  type: "heading";
  level: "section" | "subsection"; // This actually maps to h2 and h3.
  text: Text;
}

export interface Epigraph {
  type: "epigraph";
  blockQuote: BlockQuote;
}
export interface BlockQuote {
  type: "blockQuote";
  blocks: Block[]; // this is the only recursive.
  footer: Text;
}

export interface Figure {
  type: "figure";
  variant: "standard" | "fullwidth" | "iframe-wrapper";
  // this is intentionally overfit. not for general use anyway!
  image: {
    src: string;
    alt: string;
  };
  note?: Note; // works as a label.
}

export type Text = InlineItem[];
export type InlineItem = TextChunk | Note;

export interface TextChunk {
  type: "textChunk";
  content: Content;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

export interface Note {
  type: "note";
  variant: "side" | "margin";
  id: string;
  content: Text;
}
export type Content = string & { __brand: "SanitizedString" };

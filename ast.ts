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
  | Epigraph;

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
  content: Text;
  footer: Text;
}

export type Text = Chunk[];

export interface Chunk {
  content: Content;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}
export type Content = string & { __brand: "SanitizedString" };

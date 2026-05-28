import type { PluginSimple } from "markdown-it";
import type { RuleInline } from "markdown-it/lib/parser_inline.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";

type LinkStateInline = StateInline & { linkLevel: number };
type WikilinkParts = {
  target: string;
  label: string;
  labelStart: number;
  labelEnd: number;
  hasAlias: boolean;
  close: number;
};

const BANG = 0x21; // !
const OPEN_BRACKET = 0x5b; // [

const MarkdownItWikilinks: PluginSimple = (md) => {
  md.inline.ruler.before("image", "wikiimage", parseWikiimage);
  md.inline.ruler.before("link", "wikilink", parseWikilink);
};

const parseWikilink: RuleInline = (state, silent) => {
  const start = state.pos;
  const max = state.posMax;

  if (state.src.charCodeAt(start) !== OPEN_BRACKET) return false;
  if (start + 1 >= max || state.src.charCodeAt(start + 1) !== OPEN_BRACKET) {
    return false;
  }

  const parts = parseWikilinkParts(state.src, start + 2, max);
  if (!parts) return false;

  const href = state.md.normalizeLink(parts.target);
  if (!state.md.validateLink(href)) return false;

  if (!silent) {
    const oldPos = state.pos;
    const oldMax = state.posMax;
    const linkState = state as LinkStateInline;

    state.pos = parts.labelStart;
    state.posMax = parts.labelEnd;

    const open = state.push("link_open", "a", 1);
    open.attrs = [["href", href]];

    linkState.linkLevel++;
    try {
      state.md.inline.tokenize(state);
    } finally {
      linkState.linkLevel--;
    }

    state.push("link_close", "a", -1);

    state.pos = oldPos;
    state.posMax = oldMax;
  }

  state.pos = parts.close + 2;
  return true;
};

const parseWikiimage: RuleInline = (state, silent) => {
  const start = state.pos;
  const max = state.posMax;

  if (state.src.charCodeAt(start) !== BANG) return false;
  if (
    start + 2 >= max ||
    state.src.charCodeAt(start + 1) !== OPEN_BRACKET ||
    state.src.charCodeAt(start + 2) !== OPEN_BRACKET
  ) {
    return false;
  }

  const parts = parseWikilinkParts(state.src, start + 3, max);
  if (!parts) return false;

  const src = state.md.normalizeLink(parts.target);
  if (!state.md.validateLink(src)) return false;

  if (!silent) {
    const content = parts.hasAlias ? parts.label : "";
    const children: Token[] = [];
    state.md.inline.parse(content, state.md, state.env, children);

    const token = state.push("image", "img", 0);
    token.attrs = [
      ["src", src],
      ["alt", ""],
    ];
    token.children = children;
    token.content = content;
  }

  state.pos = parts.close + 2;
  return true;
};

function parseWikilinkParts(
  src: string,
  contentStart: number,
  max: number,
): WikilinkParts | undefined {
  const close = src.indexOf("]]", contentStart);
  if (close < 0 || close + 2 > max) return undefined;

  const newline = src.indexOf("\n", contentStart);
  if (newline >= 0 && newline < close) return undefined;

  const pipe = src.indexOf("|", contentStart);
  const hasAlias = pipe >= 0 && pipe < close;

  const [targetStart, targetEnd] = trimInlineWhitespace(
    src,
    contentStart,
    hasAlias ? pipe : close,
  );
  const [labelStart, labelEnd] = trimInlineWhitespace(
    src,
    hasAlias ? pipe + 1 : contentStart,
    close,
  );

  if (targetStart === targetEnd || labelStart === labelEnd) return undefined;

  return {
    target: src.slice(targetStart, targetEnd),
    label: src.slice(labelStart, labelEnd),
    labelStart,
    labelEnd,
    hasAlias,
    close,
  };
}

function trimInlineWhitespace(
  src: string,
  start: number,
  end: number,
): [number, number] {
  while (start < end && isInlineWhitespace(src.charCodeAt(start))) start++;
  while (end > start && isInlineWhitespace(src.charCodeAt(end - 1))) end--;
  return [start, end];
}

function isInlineWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09;
}

export default MarkdownItWikilinks;

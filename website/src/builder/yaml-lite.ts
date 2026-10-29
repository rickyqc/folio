// Reads the plain YAML that Folio configs are written in: nested maps, lists, quoted and plain
// values, and comments. The full yaml library would almost double the website's weight, so this
// covers what configs use and stops with a line number on anything fancier.

export type YamlValue = string | boolean | null | YamlValue[] | { [key: string]: YamlValue };

export class YamlLiteError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.line = line;
  }
}

interface Line {
  indent: number;
  text: string;
  line: number;
}

const UNSUPPORTED = 'uses YAML the builder can’t read. Write it on one line, or edit it on GitHub.';

/** Removes a trailing comment, ignoring # inside quoted values. */
function stripComment(raw: string): string {
  let quote: '"' | "'" | null = null;
  let tokenStart = true;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote === '"') {
      if (c === '\\') i++;
      else if (c === '"') quote = null;
    } else if (quote === "'") {
      if (c === "'" && raw[i + 1] === "'") i++;
      else if (c === "'") quote = null;
    } else if (c === '#' && (i === 0 || /\s/.test(raw[i - 1] ?? ''))) {
      return raw.slice(0, i);
    } else if ((c === '"' || c === "'") && tokenStart) {
      quote = c;
    }
    // Quotes only open a value: right after "key:", "-" or the start of the line.
    if (c !== ' ') tokenStart = c === ':' || c === '-';
  }
  return raw;
}

function toLines(source: string): Line[] {
  const lines: Line[] = [];
  source.split(/\r?\n/).forEach((raw, i) => {
    const text = stripComment(raw).trimEnd();
    if (!text.trim()) return;
    const indent = text.length - text.trimStart().length;
    if (/^\s*\t/.test(text)) throw new YamlLiteError('use spaces, not tabs, to indent.', i + 1);
    if (indent === 0 && (text === '---' || text === '...')) return;
    lines.push({ indent, text: text.trimStart(), line: i + 1 });
  });
  return lines;
}

function scalar(raw: string, line: number): YamlValue {
  const v = raw.trim();
  if (v === '{}') return {};
  if (v === '[]') return [];
  if (v.startsWith('"')) {
    const end = /^"(?:[^"\\]|\\.)*"/.exec(v);
    if (!end || end[0].length !== v.length) {
      throw new YamlLiteError('a value in double quotes isn’t closed.', line);
    }
    try {
      return JSON.parse(end[0]) as string;
    } catch {
      throw new YamlLiteError(`this quoted value ${UNSUPPORTED}`, line);
    }
  }
  if (v.startsWith("'")) {
    const end = /^'(?:[^']|'')*'/.exec(v);
    if (!end || end[0].length !== v.length) {
      throw new YamlLiteError('a value in single quotes isn’t closed.', line);
    }
    return end[0].slice(1, -1).replace(/''/g, "'");
  }
  if (/^[[{|>&*!%@`]/.test(v)) throw new YamlLiteError(`this value ${UNSUPPORTED}`, line);
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (/^(null|~)?$/i.test(v)) return null;
  return v;
}

const KEY = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s:#'"-][^:]*?|-[^\s:][^:]*?)\s*:(?:\s+|$)/;

class Parser {
  i = 0;
  readonly lines: Line[];

  constructor(lines: Line[]) {
    this.lines = lines;
  }

  get current(): Line | undefined {
    return this.lines[this.i];
  }

  /** Parses whatever starts at the current line, which must be indented exactly `indent`. */
  block(indent: number): YamlValue {
    const line = this.current;
    if (!line) return null;
    return isItem(line.text) ? this.sequence(indent) : this.map(indent);
  }

  map(indent: number): YamlValue {
    const out: Record<string, YamlValue> = {};
    for (let line = this.current; line && line.indent === indent; line = this.current) {
      if (isItem(line.text))
        throw new YamlLiteError('a list item is out of place here.', line.line);
      const match = KEY.exec(line.text);
      if (!match?.[1]) {
        throw new YamlLiteError('expected a “name: value” line here.', line.line);
      }
      const key = String(scalar(match[1], line.line));
      const rest = line.text.slice(match[0].length);
      this.i++;
      out[key] = rest ? scalar(rest, line.line) : this.child(indent, true);
    }
    this.checkDedent(indent);
    return out;
  }

  sequence(indent: number): YamlValue {
    const out: YamlValue[] = [];
    for (let line = this.current; line && line.indent === indent; line = this.current) {
      if (!isItem(line.text)) break;
      const content = line.text.slice(1).trimStart();
      if (!content) {
        this.i++;
        out.push(this.child(indent, false));
      } else if (KEY.test(content)) {
        // "- key: value" starts a map indented to where "key" sits.
        const inner = indent + line.text.length - content.length;
        this.lines[this.i] = { indent: inner, text: content, line: line.line };
        out.push(this.map(inner));
      } else {
        this.i++;
        out.push(scalar(content, line.line));
      }
    }
    this.checkDedent(indent);
    return out;
  }

  /** The value of a "key:" or "-" with nothing after it: an indented block, or empty. */
  child(indent: number, allowSameIndentList: boolean): YamlValue {
    const next = this.current;
    if (!next) return null;
    if (next.indent > indent) return this.block(next.indent);
    // YAML lets a list sit at the same indent as its key: "blocks:\n- type: link".
    if (allowSameIndentList && next.indent === indent && isItem(next.text)) {
      return this.sequence(indent);
    }
    return null;
  }

  checkDedent(indent: number): void {
    const line = this.current;
    if (line && line.indent > indent) {
      throw new YamlLiteError('this line is indented more than the lines around it.', line.line);
    }
  }
}

function isItem(text: string): boolean {
  return text === '-' || text.startsWith('- ');
}

/** Parses a Folio-style YAML file, or throws a YamlLiteError naming the line. */
export function parseYamlLite(source: string): YamlValue {
  const lines = toLines(source);
  const first = lines[0];
  if (!first) return null;
  if (first.indent !== 0) {
    throw new YamlLiteError('the first line shouldn’t be indented.', first.line);
  }
  const parser = new Parser(lines);
  const value = parser.block(0);
  const leftover = parser.current;
  if (leftover) throw new YamlLiteError('this line doesn’t fit the lines above it.', leftover.line);
  return value;
}

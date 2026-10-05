/**
 * code-highlight.js — motor de resaltado NATIVO de <iswc-code> (sin CodeMirror).
 *
 * Sustituye a CM5 (runMode / fromTextArea): tokeniza con un escáner por
 * estados —determinista, sin CDN, nunca lanza— y emite tokens semánticos por
 * línea: { type, text } con type ∈ comment | string | number | keyword |
 * operator | punctuation | tag | attribute | property | function | variable |
 * atom | builtin | type | meta | plain.
 *
 * Lenguajes: html (html + <script>/<style> mixtos), javascript (js/ts/jsx/
 * tsx/json), css, diff/commit (clase de línea + tokens), shell, plaintext.
 *
 * Estado entre líneas (comentarios /* * /, regiones script/style, cadenas,
 * template literals y atributos HTML con comilla abierta) viaja en `state`.
 *
 * El color lo pone el CSS del componente mapeando `.tok-*` a las custom
 * properties --iswc-code-* (code-theme.js), el mismo rol que jugaban los .cm-*
 * en la era CodeMirror.
 */

import { TagInnerSchema, type TagInner } from "./code-highlight.schemas.js";
import type { TokenType, Token, HighlightLine, HighlightState, TokenizeResult } from "./code-highlight.schemas.js";

/** Tipos de token reconocidos por el highlighter. */

/** Token producido por los escáneres: tipo semántico + texto. */

/** Línea tokenizada que devuelve `tokenizeCode`. */

/** Estado entre líneas (multilínea: comentarios, regiones script/style, quotes, templates, atributo HTML). */

/** Resultado de tokenizar un documento completo. */

const LANG_IDS: ReadonlySet<string> = new Set([
  'javascript', 'typescript', 'jsx', 'tsx', 'json',
  'html', 'css', 'diff', 'commit', 'shell', 'plaintext',
]);

const JS_KEYWORDS: ReadonlySet<string> = new Set([
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum',
  'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null',
  'of', 'package', 'private', 'protected', 'public', 'return', 'set', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'var', 'void', 'while', 'with', 'yield',
]);

const CSS_ATOMS: ReadonlySet<string> = new Set([
  'auto', 'none', 'inherit', 'initial', 'unset', 'transparent', 'currentColor',
  'solid', 'dashed', 'dotted', 'hidden', 'visible', 'absolute', 'relative', 'fixed',
  'sticky', 'block', 'inline', 'flex', 'grid', 'row', 'column', 'wrap', 'nowrap',
  'center', 'start', 'end', 'left', 'right', 'top', 'bottom', 'normal', 'bold',
  'italic', 'pointer', 'default', 'cover', 'contain', 'repeat', 'no-repeat',
  'ellipsis', 'clip', 'important', 'sans-serif', 'monospace', 'serif',
]);

const isDigit = (c: string | undefined): boolean => !!c && c >= '0' && c <= '9';
const isIdentStart = (c: string | undefined): boolean => !!c && /[A-Za-z_$\u00c0-\u024f]/.test(c);
const isIdentPart = (c: string | undefined): boolean => !!c && /[A-Za-z0-9_$\u00c0-\u024f-]/.test(c);

/** Normaliza `lang` a un id soportado (default javascript). */
export function normalizeLang(lang: string | null | undefined): string {
  const raw = String(lang ?? '').trim().toLowerCase();
  if (['htmlmixed', 'htm', 'xml', 'svg'].includes(raw)) return 'html';
  if (['ts', 'mts', 'cts', 'typescript'].includes(raw)) return 'typescript';
  if (['js', 'mjs', 'cjs', 'javascript'].includes(raw)) return 'javascript';
  if (['py', 'python'].includes(raw)) return 'plaintext';
  if (['bash', 'sh', 'zsh', 'curl', 'cli', 'shell'].includes(raw)) return 'shell';
  if (['patch', 'udiff', 'git', 'git-log', 'commit-resume', 'resumen-commit', 'diff'].includes(raw)) {
    return raw === 'commit-resume' || raw === 'resumen-commit' || raw === 'commit' ? 'commit' : 'diff';
  }
  return LANG_IDS.has(raw) ? raw : 'javascript';
}

/** Estado inicial entre líneas. */
export function emptyState(): HighlightState {
  return {
    inComment: false,
    inHtmlComment: false,
    region: null,        // 'script' | 'style' | null
    quote: null,         // '"' | "'"
    template: false,
    htmlAttr: null,
    htmlAttrMode: null,
    inHtmlTag: false,
  };
}

function add(out: Token[], type: TokenType, text: string): void {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.type === type && (type === 'plain' || type === 'operator' || type === 'punctuation')) {
    last.text += text;
    return;
  }
  out.push({ type, text });
}

/** Último token "significativo" (ignora espacios planos) o null. */
function lastSignificant(out: Token[]): Token | null {
  for (let i = out.length - 1; i >= 0; i--) {
    const t = out[i]!;
    if (t.type === 'plain' && /^\s*$/.test(t.text)) continue;
    return t;
  }
  return null;
}

/** JS/TS/JSON: estado entre líneas vía st; append en `out` plano. */
function scanJsLine(line: string, st: HighlightState, out: Token[]): void {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i]!;
    const next = line[i + 1];

    if (st.template || st.quote) {
      const q = st.quote ?? '`';
      if (c === '\\' && i + 1 < len) { add(out, 'string', c + next!); i += 2; continue; }
      if (c === q) {
        if (st.quote) st.quote = null;
        else st.template = false;
        add(out, 'string', c);
        i += 1;
        continue;
      }
      add(out, 'string', c);
      i += 1;
      continue;
    }

    if (st.inComment) {
      if (c === '*' && next === '/') { add(out, 'comment', '*/'); st.inComment = false; i += 2; continue; }
      add(out, 'comment', c);
      i += 1;
      continue;
    }

    if (c === '/' && next === '/') { add(out, 'comment', line.slice(i)); break; }
    if (c === '/' && next === '*') { add(out, 'comment', '/*'); st.inComment = true; i += 2; continue; }

    if (c === '"' || c === "'") { st.quote = c as '"' | "'"; add(out, 'string', c); i += 1; continue; }
    if (c === '`') { st.template = true; add(out, 'string', c); i += 1; continue; }

    if (isDigit(c)) {
      let j = i;
      // prefijo 0x/0b/0o
      if (c === '0' && /[xXbBoO]/.test(next ?? '')) {
        j = i + 2;
        while (j < len && /[0-9a-fA-F]/.test(line[j] ?? '')) j += 1;
      } else {
        while (j < len && isDigit(line[j] ?? '')) j += 1;
        if (line[j] === '.') { j += 1; while (j < len && isDigit(line[j] ?? '')) j += 1; }
        if (line[j] === 'e' || line[j] === 'E') {
          let e = j + 1;
          if (line[e] === '+' || line[e] === '-') e += 1;
          if (isDigit(line[e] ?? '')) { j = e + 1; while (j < len && isDigit(line[j] ?? '')) j += 1; }
        }
      }
      add(out, 'number', line.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j] ?? '')) j += 1;
      const word = line.slice(i, j);
      add(out, JS_KEYWORDS.has(word) ? 'keyword'
        : /^(?:true|false|null|undefined|NaN|Infinity)$/.test(word) ? 'atom' : 'variable', word);
      i = j;
      continue;
    }

    if ('(){}[];,.:'.includes(c)) { add(out, 'punctuation', c); i += 1; continue; }
    if ('=+-*%&|!<>?~^'.includes(c)) {
      let j = i + 1;
      while (j < len && '=+-*%&|!<>?~^'.includes(line[j] ?? '')) j += 1;
      add(out, 'operator', line.slice(i, j));
      i = j;
      continue;
    }
    add(out, 'plain', c);
    i += 1;
  }
}

/** CSS/SCSS-lite. */
function scanCssLine(line: string, st: HighlightState, out: Token[]): void {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i]!;
    const next = line[i + 1];

    if (st.inComment) {
      if (c === '*' && next === '/') { add(out, 'comment', '*/'); st.inComment = false; i += 2; continue; }
      add(out, 'comment', c);
      i += 1;
      continue;
    }
    if (c === '/' && next === '*') { add(out, 'comment', '/*'); st.inComment = true; i += 2; continue; }

    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < len && line[j] !== q) j += line[j] === '\\' ? 2 : 1;
      add(out, 'string', line.slice(i, Math.min(j + 1, len)));
      i = Math.min(j + 1, len);
      continue;
    }

    if (c === '@' && isIdentStart(next ?? '')) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j] ?? '')) j += 1;
      add(out, 'keyword', line.slice(i, j));
      i = j;
      continue;
    }

    if (c === '#' && /[0-9a-fA-F]/.test(next ?? '')) {
      let j = i + 1;
      while (j < len && /[0-9a-fA-F]/.test(line[j] ?? '')) j += 1;
      add(out, 'atom', line.slice(i, j));
      i = j;
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(next ?? ''))) {
      let j = i;
      while (j < len && /[0-9.%]/.test(line[j] ?? '')) j += 1;
      add(out, 'number', line.slice(i, j));
      i = j;
      continue;
    }

    if (c === '-' && next === '-') {
      // variable CSS --x
      let j = i + 2;
      while (j < len && isIdentPart(line[j] ?? '')) j += 1;
      add(out, 'property', line.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j] ?? '')) j += 1;
      const word = line.slice(i, j);
      // ¿propiedad css? (palabra seguida de ':' tras espacios)
      let k = j;
      while (k < len && (line[k] === ' ' || line[k] === '\t')) k += 1;
      const isProp = line[k] === ':';
      const sig = lastSignificant(out);
      const afterColon = !!sig && sig.type === 'punctuation' && String(sig.text).endsWith(':');
      add(out, isProp ? 'property'
        : afterColon ? 'atom'
          : word.startsWith('@') ? 'keyword' : 'variable', word);
      i = j;
      continue;
    }

    if ('{}(),;:>+~*'.includes(c)) { add(out, 'punctuation', c); i += 1; continue; }
    add(out, 'plain', c);
    i += 1;
  }
}

const TAG_OPEN_RE = /^<\/?([a-zA-Z][\w:-]*)/;

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

/** Valor de atributo: JSON se pinta como código; el resto, string. */
function paintAttrInterior(text: string, st: HighlightState, out: Token[]): void {
  if (st.htmlAttrMode == null && text.trim()) st.htmlAttrMode = looksLikeJson(text) ? 'json' : 'text';
  if (!text) return;
  if (st.htmlAttrMode === 'json') scanJsLine(text, emptyState(), out);
  else add(out, 'string', text);
}

/** Interior del tag. Comilla sin cierre: htmlAttr y se sigue en la línea siguiente. */
function scanHtmlTagInner(line: string, from: number, st: HighlightState, out: Token[], continuing: boolean): TagInner {
  const len = line.length;
  let p = from;
  let selfClose = false;
  let closed = false;
  while (p < len) {
    const ch = line[p]!;
    if (ch === '>') { add(out, 'tagPunct', '>'); p += 1; closed = true; break; }
    if (ch === '/' && line[p + 1] === '>') { add(out, 'tagPunct', '/>'); p += 2; selfClose = true; closed = true; break; }
    if (ch === ' ' || ch === '\t') { add(out, 'plain', ch); p += 1; continue; }
    if (isIdentStart(ch) || ch === '@' || ch === ':') {
      let j = p + 1;
      while (j < len && /[A-Za-z0-9_$@:.-]/.test(line[j] ?? '')) j += 1;
      add(out, 'attribute', line.slice(p, j));
      p = j;
      let s = p;
      while (s < len && (line[s] === ' ' || line[s] === '\t')) s += 1;
      if (line[s] === '=') {
        add(out, 'operator', '=');
        p = s + 1;
        let v = p;
        while (v < len && (line[v] === ' ' || line[v] === '\t')) v += 1;
        const q = line[v];
        if (q === '"' || q === "'") {
          let e = v + 1;
          while (e < len && line[e] !== q) e += line[e] === '\\' ? 2 : 1;
          if (e >= len) {
            add(out, 'string', q);
            paintAttrInterior(line.slice(v + 1), st, out);
            st.htmlAttr = q;
            st.inHtmlTag = true;
            return { pos: len, selfClose };
          }
          add(out, 'string', line.slice(v, e + 1));
          p = e + 1;
        } else {
          let e = v;
          while (e < len && !/[\s>]/.test(line[e] ?? '')) e += 1;
          add(out, 'plain', line.slice(v, e));
          p = e;
        }
      }
      continue;
    }
    add(out, 'plain', ch);
    p += 1;
  }
  st.inHtmlTag = closed ? false : (st.htmlAttr != null || continuing);
  return { pos: p, selfClose };
}

/** < / > van en tagPunct; el nombre del tag se queda en tag. */
function emitHtmlCloser(out: Token[], chunk: string): void {
  const m = /^<(\/?)([A-Za-z][\w:-]*)?(>)?/.exec(chunk);
  if (!m) { add(out, 'tag', chunk); return; }
  add(out, 'tagPunct', '<');
  if (m[1]) add(out, 'tagPunct', '/');
  if (m[2]) add(out, 'tag', m[2]);
  if (m[3]) add(out, 'tagPunct', '>');
  const rest = chunk.slice(m[0].length);
  if (rest) add(out, 'tag', rest);
}

/** HTML: tags/atributos/strings + regiones <script>/<style> tokenizadas como js/css. */
function scanHtmlLine(line: string, st: HighlightState, out: Token[]): void {
  let i = 0;
  const len = line.length;

  if (st.htmlAttr && !st.region) {
    const q = st.htmlAttr;
    let e = 0;
    while (e < len && line[e] !== q) e += line[e] === '\\' ? 2 : 1;
    paintAttrInterior(line.slice(0, Math.min(e, len)), st, out);
    if (e >= len) return;
    add(out, 'string', q);
    st.htmlAttr = null;
    st.htmlAttrMode = null;
    i = e + 1;
  }

  if (st.inHtmlTag && !st.region) {
    const inner = scanHtmlTagInner(line, i, st, out, true);
    i = inner.pos;
    if (st.htmlAttr || st.inHtmlTag) return;
  }

  while (i < len) {
    const c = line[i]!;
    const next = line[i + 1];

    if (st.region) {
      const closeRe = st.region === 'script' ? /<\/script/i : /<\/style/i;
      const m = closeRe.exec(line.slice(i));
      if (!m) {
        const fn = st.region === 'script' ? scanJsLine : scanCssLine;
        fn(line.slice(i), st, out);
        break;
      }
      const before = line.slice(i, i + m.index);
      if (before) (st.region === 'script' ? scanJsLine : scanCssLine)(before, st, out);
      i += m.index;
      const end = line.indexOf('>', i);
      const chunk = line.slice(i, end === -1 ? len : end + 1);
      emitHtmlCloser(out, chunk);
      st.region = null;
      i += chunk.length;
      continue;
    }

    if (st.inHtmlComment) {
      const end = line.indexOf('-->', i);
      if (end === -1) { add(out, 'comment', line.slice(i)); break; }
      add(out, 'comment', line.slice(i, end + 3));
      st.inHtmlComment = false;
      i = end + 3;
      continue;
    }

    if (c === '<') {
      if (line.startsWith('<!--', i)) {
        const end = line.indexOf('-->', i + 4);
        if (end === -1) { add(out, 'comment', line.slice(i)); st.inHtmlComment = true; break; }
        add(out, 'comment', line.slice(i, end + 3));
        i = end + 3;
        continue;
      }
      if (/^<![a-zA-Z]/.test(line.slice(i)) || /^<\?/.test(line.slice(i))) {
        const end = line.indexOf('>', i);
        const chunk = line.slice(i, end === -1 ? len : end + 1);
        add(out, 'meta', chunk);
        i += chunk.length;
        continue;
      }
      const tagM = TAG_OPEN_RE.exec(line.slice(i));
      if (tagM) {
        const m0 = /^<(\/?)([a-zA-Z][\w:-]*)/.exec(line.slice(i))!;
        const isClose = m0[1] === '/';
        const tagName = m0[2]!.toLowerCase();
        add(out, 'tagPunct', '<');
        if (isClose) add(out, 'tagPunct', '/');
        add(out, 'tag', m0[2]!);
        const inner = scanHtmlTagInner(line, i + m0[0]!.length, st, out, false);
        if (!st.htmlAttr && !isClose && (tagName === 'script' || tagName === 'style') && !inner.selfClose) {
          st.region = tagName;
        }
        i = inner.pos;
        continue;
      }
      add(out, 'plain', c);
      i += 1;
      continue;
    }

    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < len && line[j] !== q) j += line[j] === '\\' ? 2 : 1;
      add(out, 'string', line.slice(i, Math.min(j + 1, len)));
      i = Math.min(j + 1, len);
      continue;
    }
    add(out, 'plain', c);
    i += 1;
  }
}

/** Shell: comentarios #, strings, $VAR/${…}, comandos al inicio. */
function scanShellLine(line: string, _st: HighlightState, out: Token[]): void {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i]!;
    if (c === '#') { add(out, 'comment', line.slice(i)); break; }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < len && line[j] !== q) j += line[j] === '\\' ? 2 : 1;
      add(out, 'string', line.slice(i, Math.min(j + 1, len)));
      i = Math.min(j + 1, len);
      continue;
    }
    if (c === '$' && (line[i + 1] === '{' || isIdentStart(line[i + 1] ?? ''))) {
      let j = i + 1;
      if (line[j] === '{') {
        const end = line.indexOf('}', j);
        j = end === -1 ? len : end + 1;
      } else {
        while (j < len && isIdentPart(line[j] ?? '')) j += 1;
      }
      add(out, 'atom', line.slice(i, j));
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j] ?? '')) j += 1;
      const word = line.slice(i, j);
      const prevText = out[out.length - 1]?.text ?? '';
      const isCmd = i === 0 || /[;&|]\s*$/.test(prevText);
      add(out, isCmd ? 'keyword' : 'plain', word);
      i = j;
      continue;
    }
    add(out, 'plain', c);
    i += 1;
  }
}

/** Clase de banda por línea de diff (la usa el renderer para el fondo). */
export function diffLineClass(line: string | null | undefined): string | null {
  const t = String(line ?? '');
  if (/^(?:diff --git|Index: |new file|deleted file|rename |similarity )/.test(t)) return 'iswc-diff-line-file';
  if (/^@@ /.test(t)) return 'iswc-diff-line-hunk';
  if (/^(?:commit [0-9a-f]{7,40}|Author:|Date:|Merge:)/.test(t)) return 'iswc-diff-line-commit';
  if (/^\+\+\+ /.test(t) || /^--- /.test(t)) return 'iswc-diff-line-file';
  if (/^\+[^+]/.test(t)) return 'iswc-diff-line-add';
  if (/^-[^-]/.test(t)) return 'iswc-diff-line-del';
  return null;
}

function scanDiffLine(line: string, lineClass: string | null): Token[] {
  const out: Token[] = [];
  const cls = lineClass ?? diffLineClass(line);
  let type: TokenType = 'plain';
  if (cls === 'iswc-diff-line-add') type = 'string';
  else if (cls === 'iswc-diff-line-del') type = 'comment';
  else if (cls === 'iswc-diff-line-file') type = 'meta';
  else if (cls === 'iswc-diff-line-hunk' || cls === 'iswc-diff-line-commit') type = 'keyword';
  add(out, type, line);
  return out;
}

/**
 * Tokeniza un documento completo.
 * @param text Texto fuente.
 * @param langId Idioma (alias tolerantes: `ts`, `bash`, etc.).
 * @param state Estado previo (multilínea) o undefined.
 */
export function tokenizeCode(text: string | null | undefined, langId?: string, state?: HighlightState): TokenizeResult {
  const lang = normalizeLang(langId);
  const src = String(text ?? '').replace(/\r\n/g, '\n');
  const st = state ? { ...state } : emptyState();
  const rawLines = src.split('\n');
  const isDiff = lang === 'diff' || lang === 'commit';
  const lines: HighlightLine[] = [];
  for (const raw of rawLines) {
    const tokens: Token[] = [];
    const lineClass = isDiff ? diffLineClass(raw) : null;
    if (lang === 'html') scanHtmlLine(raw, st, tokens);
    else if (lang === 'css') scanCssLine(raw, st, tokens);
    else if (lang === 'shell') scanShellLine(raw, st, tokens);
    else if (isDiff) {
      for (const t of scanDiffLine(raw, lineClass)) tokens.push(t);
    } else scanJsLine(raw, st, tokens);
    lines.push({ tokens, lineClass, raw });
  }
  return { lines, state: st, lang };
}

/** Token type → clase CSS (el CSS mapea .tok-* a --iswc-code-*). */
export function tokenClass(type: TokenType | null | undefined): string {
  if (!type || type === 'plain') return '';
  return `tok-${type}`;
}

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function escapeHtml(text: string | number | null | undefined): string {
  return String(text).replace(/[&<>"]/g, (c) => ESC_MAP[c] ?? c);
}

/** Línea de tokens → HTML con <span class="tok-*"> (para <pre> readonly). */
export function lineToHtml(tokens: readonly Token[] | null | undefined): string {
  let html = '';
  for (const t of tokens ?? []) {
    const cls = tokenClass(t.type);
    html += cls ? `<span class="${cls}">${escapeHtml(t.text)}</span>` : escapeHtml(t.text);
  }
  return html || ' ';
}

/** Texto plano reconstruido desde tokens (p. ej. para copiar). */
export function tokensToText(tokens: readonly Token[] | null | undefined): string {
  return (tokens ?? []).map((t) => t.text).join('');
}

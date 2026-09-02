/**
 * code-highlight.js — motor de resaltado NATIVO de <is-code> (sin CodeMirror).
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
 * Estado entre líneas (comentarios /* * /, regiones script/style, cadenas y
 * template literals multilínea) viaja en `state` para no re-escanear el
 * documento al repintar.
 *
 * El color lo pone el CSS del componente mapeando `.tok-*` a las custom
 * properties --is-code-* (code-theme.js), igual que hacía con .cm-*.
 */

const LANG_IDS = new Set([
  'javascript', 'typescript', 'jsx', 'tsx', 'json',
  'html', 'css', 'diff', 'commit', 'shell', 'plaintext',
]);

const JS_KEYWORDS = new Set([
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum',
  'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null',
  'of', 'package', 'private', 'protected', 'public', 'return', 'set', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'var', 'void', 'while', 'with', 'yield',
]);

const CSS_ATOMS = new Set([
  'auto', 'none', 'inherit', 'initial', 'unset', 'transparent', 'currentColor',
  'solid', 'dashed', 'dotted', 'hidden', 'visible', 'absolute', 'relative', 'fixed',
  'sticky', 'block', 'inline', 'flex', 'grid', 'row', 'column', 'wrap', 'nowrap',
  'center', 'start', 'end', 'left', 'right', 'top', 'bottom', 'normal', 'bold',
  'italic', 'pointer', 'default', 'cover', 'contain', 'repeat', 'no-repeat',
  'ellipsis', 'clip', 'important', 'sans-serif', 'monospace', 'serif',
]);

const isDigit = (c) => c >= '0' && c <= '9';
const isIdentStart = (c) => /[A-Za-z_$\u00c0-\u024f]/.test(c ?? '');
const isIdentPart = (c) => /[A-Za-z0-9_$\u00c0-\u024f-]/.test(c ?? '');

/** Normaliza `lang` a un id soportado (default javascript). */
export function normalizeLang(lang) {
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
export function emptyState() {
  return {
    inComment: false,
    inHtmlComment: false,
    region: null,        // 'script' | 'style' | null
    quote: null,         // '"' | "'"
    template: false,
  };
}

function add(out, type, text) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.type === type && (type === 'plain' || type === 'operator' || type === 'punctuation')) {
    last.text += text;
    return;
  }
  out.push({ type, text });
}

/** Último token "significativo" (ignora espacios planos) o null. */
function lastSignificant(out) {
  for (let i = out.length - 1; i >= 0; i--) {
    const t = out[i];
    if (t.type === 'plain' && /^\s*$/.test(t.text)) continue;
    return t;
  }
  return null;
}

/** JS/TS/JSON: estado entre líneas vía st; append en `out` plano. */
function scanJsLine(line, st, out) {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i];
    const next = line[i + 1];

    if (st.template || st.quote) {
      const q = st.quote ?? '`';
      if (c === '\\' && i + 1 < len) { add(out, 'string', c + next); i += 2; continue; }
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

    if (c === '"' || c === "'") { st.quote = c; add(out, 'string', c); i += 1; continue; }
    if (c === '`') { st.template = true; add(out, 'string', c); i += 1; continue; }

    if (isDigit(c)) {
      let j = i;
      // prefijo 0x/0b/0o
      if (c === '0' && /[xXbBoO]/.test(next ?? '')) {
        j = i + 2;
        while (j < len && /[0-9a-fA-F]/.test(line[j])) j += 1;
      } else {
        while (j < len && isDigit(line[j])) j += 1;
        if (line[j] === '.') { j += 1; while (j < len && isDigit(line[j])) j += 1; }
        if (line[j] === 'e' || line[j] === 'E') {
          let e = j + 1;
          if (line[e] === '+' || line[e] === '-') e += 1;
          if (isDigit(line[e] ?? '')) { j = e + 1; while (j < len && isDigit(line[j])) j += 1; }
        }
      }
      add(out, 'number', line.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j])) j += 1;
      const word = line.slice(i, j);
      add(out, JS_KEYWORDS.has(word) ? 'keyword'
        : /^(?:true|false|null|undefined|NaN|Infinity)$/.test(word) ? 'atom' : 'variable', word);
      i = j;
      continue;
    }

    if ('(){}[];,.:'.includes(c)) { add(out, 'punctuation', c); i += 1; continue; }
    if ('=+-*%&|!<>?~^'.includes(c)) {
      let j = i + 1;
      while (j < len && '=+-*%&|!<>?~^'.includes(line[j])) j += 1;
      add(out, 'operator', line.slice(i, j));
      i = j;
      continue;
    }
    add(out, 'plain', c);
    i += 1;
  }
}

/** CSS/SCSS-lite. */
function scanCssLine(line, st, out) {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i];
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
      while (j < len && isIdentPart(line[j])) j += 1;
      add(out, 'keyword', line.slice(i, j));
      i = j;
      continue;
    }

    if (c === '#' && /[0-9a-fA-F]/.test(next ?? '')) {
      let j = i + 1;
      while (j < len && /[0-9a-fA-F]/.test(line[j])) j += 1;
      add(out, 'atom', line.slice(i, j));
      i = j;
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(next ?? ''))) {
      let j = i;
      while (j < len && /[0-9.%]/.test(line[j])) j += 1;
      add(out, 'number', line.slice(i, j));
      i = j;
      continue;
    }

    if (c === '-' && next === '-') {
      // variable CSS --x
      let j = i + 2;
      while (j < len && isIdentPart(line[j])) j += 1;
      add(out, 'property', line.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j])) j += 1;
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

    if ('{}(),;:>+~*'.includes(c)) { add(out, c === ':' ? 'punctuation' : 'punctuation', c); i += 1; continue; }
    add(out, c === ' ' || c === '\t' ? 'plain' : 'plain', c);
    i += 1;
  }
}

const TAG_OPEN_RE = /^<\/?([a-zA-Z][\w:-]*)/;

/** HTML: tags/atributos/strings + regiones <script>/<style> tokenizadas como js/css. */
function scanHtmlLine(line, st, out) {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i];
    const next = line[i + 1];

    if (st.region) {
      const closeRe = st.region === 'script' ? /<\/script/i : /<\/style/i;
      const m = closeRe.exec(line.slice(i));
      if (!m) {
        const inner = st.region === 'script' ? [] : [];
        const fn = st.region === 'script' ? scanJsLine : scanCssLine;
        fn(line.slice(i), st, out);
        break;
      }
      const before = line.slice(i, i + m.index);
      if (before) (st.region === 'script' ? scanJsLine : scanCssLine)(before, st, out);
      i += m.index;
      const end = line.indexOf('>', i);
      const chunk = line.slice(i, end === -1 ? len : end + 1);
      add(out, 'tag', chunk);
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
        const tagName = m0[2].toLowerCase();
        let p = i + m0[0].length;
        let selfClose = false;
        add(out, 'tag', m0[0]);
        // dentro del tag: atributos (name="value") + '>'
        while (p < len) {
          const ch = line[p];
          if (ch === '>') { add(out, 'tag', '>'); p += 1; break; }
          if (ch === '/' && line[p + 1] === '>') { add(out, 'tag', '/>'); p += 2; selfClose = true; break; }
          if (ch === ' ' || ch === '\t') { add(out, 'plain', ch); p += 1; continue; }
          if (isIdentStart(ch) || ch === '@' || ch === ':') {
            let j = p + 1;
            while (j < len && /[A-Za-z0-9_$@:.-]/.test(line[j])) j += 1;
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
                add(out, 'string', line.slice(v, Math.min(e + 1, len)));
                p = Math.min(e + 1, len);
              } else {
                let e = v;
                while (e < len && !/[\s>]/.test(line[e])) e += 1;
                add(out, 'plain', line.slice(v, e));
                p = e;
              }
            }
            continue;
          }
          add(out, 'plain', ch);
          p += 1;
        }
        if (!isClose && (tagName === 'script' || tagName === 'style') && !selfClose) {
          st.region = tagName;
        }
        i = p;
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
function scanShellLine(line, st, out) {
  let i = 0;
  const len = line.length;
  while (i < len) {
    const c = line[i];
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
        while (j < len && isIdentPart(line[j])) j += 1;
      }
      add(out, 'atom', line.slice(i, j));
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < len && isIdentPart(line[j])) j += 1;
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
export function diffLineClass(line) {
  const t = String(line ?? '');
  if (/^(?:diff --git|Index: |new file|deleted file|rename |similarity )/.test(t)) return 'is-diff-line-file';
  if (/^@@ /.test(t)) return 'is-diff-line-hunk';
  if (/^(?:commit [0-9a-f]{7,40}|Author:|Date:|Merge:)/.test(t)) return 'is-diff-line-commit';
  if (/^\+\+\+ /.test(t) || /^--- /.test(t)) return 'is-diff-line-file';
  if (/^\+[^+]/.test(t)) return 'is-diff-line-add';
  if (/^-[^-]/.test(t)) return 'is-diff-line-del';
  return null;
}

function scanDiffLine(line, lineClass) {
  const out = [];
  const cls = lineClass ?? diffLineClass(line);
  let type = 'plain';
  if (cls === 'is-diff-line-add') type = 'string';
  else if (cls === 'is-diff-line-del') type = 'comment';
  else if (cls === 'is-diff-line-file') type = 'meta';
  else if (cls === 'is-diff-line-hunk' || cls === 'is-diff-line-commit') type = 'keyword';
  add(out, type, line);
  return out;
}

/**
 * Tokeniza un documento completo.
 * @param {string} text
 * @param {string} [langId]
 * @param {object} [state]  estado previo (multilínea) o undefined
 * @returns {{ lines: Array<{tokens:Array<{type,text}>, lineClass:string|null, raw:string}>, state: object, lang: string }}
 */
export function tokenizeCode(text, langId, state) {
  const lang = normalizeLang(langId);
  const src = String(text ?? '').replace(/\r\n/g, '\n');
  const st = state ? { ...state } : emptyState();
  const rawLines = src.split('\n');
  const isDiff = lang === 'diff' || lang === 'commit';
  const lines = [];
  for (const raw of rawLines) {
    const tokens = [];
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

/** Token type → clase CSS (el CSS mapea .tok-* a --is-code-*). */
export function tokenClass(type) {
  if (!type || type === 'plain') return '';
  return `tok-${type}`;
}

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ESC_MAP[c] ?? c);
}

/** Línea de tokens → HTML con <span class="tok-*"> (para <pre> readonly). */
export function lineToHtml(tokens) {
  let html = '';
  for (const t of tokens ?? []) {
    const cls = tokenClass(t.type);
    html += cls ? `<span class="${cls}">${escapeHtml(t.text)}</span>` : escapeHtml(t.text);
  }
  return html || ' ';
}

/** Texto plano reconstruido desde tokens (p. ej. para copiar). */
export function tokensToText(tokens) {
  return (tokens ?? []).map((t) => t.text).join('');
}

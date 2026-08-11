/**
 * code-text.js — utilidades de texto para código (sin CodeMirror ni editors).
 * Extraído para evitar ciclos highlight-code ↔ code ↔ code-format.
 */

/** Quita indentación común heredada del markup del preview. */
export const dedent = (text) => {
  const normalized = String(text).replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
  const lines = normalized.split('\n');
  const indents = lines
    .filter((l) => l.trim().length)
    .map((l) => {
      const m = l.match(/^[ \t]*/) || [''];
      return m[0].replace(/\t/g, '  ').length;
    });
  const min = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => {
      const expanded = l.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length));
      const lead = (expanded.match(/^ */) || [''])[0].length;
      return expanded.slice(Math.min(min, lead));
    })
    .join('\n')
    .replace(/[ \t]+$/gm, '');
};

const HAND_HL_OPEN = /<span\s+class="(?:tag|attr|val|str|kw|com)">/gi;
const HAND_HL_CLOSE = /<\/span>/gi;
const HAND_HL_PROBE = /<span\s+class="(?:tag|attr|val|str|kw|com)"/i;

export const unwrapHandHighlight = (text) => {
  const raw = String(text);
  if (!HAND_HL_PROBE.test(raw)) return raw;
  return raw.replace(HAND_HL_OPEN, '').replace(HAND_HL_CLOSE, '');
};

const VOID_HTML = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

export const prettyHtml = (text) => {
  const lines = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let depth = 0;
  const out = [];
  for (const line of lines) {
    const isClose = /^<\//.test(line);
    if (isClose) depth = Math.max(0, depth - 1);
    out.push(`${'  '.repeat(depth)}${line}`);
    const isOpen = /^<[^/!?][^>]*>$/.test(line)
      && !/\/>$/.test(line)
      && !VOID_HTML.test(line.slice(1));
    if (!isClose && isOpen) depth += 1;
  }
  return out.join('\n').replace(
    /^(\s*)(<([a-zA-Z][\w:-]*)\b[^>]*>)\n\1(<\/\3>)/gm,
    '$1$2$4',
  );
};

/**
 * Formato ligero: saltos básicos para HTML/JS compactos.
 * @param {string} text
 * @param {string} mode  htmlmixed|html|javascript|…
 */
export const softFormat = (text, mode) => {
  let t = dedent(unwrapHandHighlight(text));
  const compact = t.replace(/\s+/g, ' ').trim();
  const fewLines = t.split('\n').length <= 2;
  const inlineNest = t.split('\n').some((line) => />\s*</.test(line));

  if ((mode === 'htmlmixed' || mode === 'html') && t.includes('<') && (fewLines || inlineNest) && compact.length > 40) {
    t = prettyHtml(t);
  }

  if ((mode === 'javascript' || mode === 'js') && fewLines && /[{;]/.test(compact) && compact.length > 60) {
    t = compact
      .replace(/;\s*/g, ';\n')
      .replace(/\{\s*/g, '{\n')
      .replace(/\s*\}/g, '\n}')
      .replace(/,\s*(?=[{\[])/g, ',\n');
    let depth = 0;
    t = t.split('\n').map((raw) => {
      const line = raw.trim();
      if (!line) return '';
      if (line.startsWith('}') || line.startsWith(']')) depth = Math.max(0, depth - 1);
      const out = `${'  '.repeat(depth)}${line}`;
      if (/[{\[]$/.test(line)) depth += 1;
      return out;
    }).filter((l, i, arr) => l || (i > 0 && i < arr.length - 1)).join('\n');
  }

  return dedent(t);
};

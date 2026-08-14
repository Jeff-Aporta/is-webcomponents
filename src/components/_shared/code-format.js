/**
 * code-format.js — formateo ligero estilo Prettier para `<is-code>`.
 *
 * No es Prettier completo (sin AST de terceros). Acepta un JSON de opciones
 * compatible en espíritu y aplica reglas útiles por lenguaje:
 * indentación, ancho, comillas, punto y coma (JS), pretty HTML.
 */

import { prettyHtml, softFormat, dedent } from './code-text.js';
import { formatDiff } from './code-diff.js';

/** @typedef {object} CodeFormatConfig
 * @property {number} [tabWidth=2]
 * @property {boolean} [useTabs=false]
 * @property {number} [printWidth=100]
 * @property {boolean} [semi=true]
 * @property {boolean} [singleQuote=false]
 * @property {boolean} [trailingComma=false]
 * @property {'lf'|'crlf'|'cr'} [endOfLine='lf']
 */

export const DEFAULT_FORMAT = Object.freeze({
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: false,
  endOfLine: 'lf',
});

/** @param {unknown} raw */
export function normalizeFormatConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const tabWidth = Number(src.tabWidth);
  const printWidth = Number(src.printWidth);
  const eol = src.endOfLine;
  return {
    tabWidth: Number.isFinite(tabWidth) && tabWidth > 0 ? Math.min(8, Math.floor(tabWidth)) : 2,
    useTabs: !!src.useTabs,
    printWidth: Number.isFinite(printWidth) && printWidth >= 40 ? Math.floor(printWidth) : 100,
    semi: src.semi !== false,
    singleQuote: !!src.singleQuote,
    trailingComma: !!src.trailingComma,
    endOfLine: eol === 'crlf' || eol === 'cr' ? eol : 'lf',
  };
}

const indentUnit = (cfg) => (cfg.useTabs ? '\t' : ' '.repeat(cfg.tabWidth));

const joinEol = (lines, cfg) => {
  const eol = cfg.endOfLine === 'crlf' ? '\r\n' : cfg.endOfLine === 'cr' ? '\r' : '\n';
  return lines.join(eol);
};

/** Re-indenta un texto ya con saltos de línea según braces/tags simples. */
function reindentByBraces(text, cfg) {
  const unit = indentUnit(cfg);
  let depth = 0;
  const out = [];
  for (const raw of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      out.push('');
      continue;
    }
    if (/^[}\]\)]/.test(line)) depth = Math.max(0, depth - 1);
    out.push(unit.repeat(depth) + line);
    const opens = (line.match(/[{\[(]/g) || []).length;
    const closes = (line.match(/[}\])]/g) || []).length;
    depth = Math.max(0, depth + opens - closes);
    if (/^[}\]\)]/.test(line) && opens > closes) {
      /* ya ajustado arriba */
    }
  }
  return joinEol(out, cfg);
}

function formatJavascript(text, cfg) {
  let t = softFormat(dedent(text), 'javascript');
  // Soft-format deja indent de 2 espacios; reaplicar tabWidth / tabs.
  t = reindentByBraces(t, cfg);

  if (cfg.singleQuote) {
    t = t.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m, inner) => {
      if (/'/.test(inner)) return m;
      return `'${inner.replace(/\\"/g, '"')}'`;
    });
  } else {
    t = t.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (m, inner) => {
      if (/"/.test(inner)) return m;
      return `"${inner.replace(/\\'/g, "'")}"`;
    });
  }

  if (cfg.semi) {
    t = t.replace(/([^;\s{}])\s*\n/g, (m, ch) => {
      if (/[,:({\[]$/.test(ch)) return m;
      return `${ch};\n`;
    });
    // limpiar dobles
    t = t.replace(/;;+/g, ';');
  } else {
    t = t.replace(/;+(\s*\n)/g, '$1').replace(/;+\s*$/gm, '');
  }

  return t;
}

function formatHtml(text, cfg) {
  let t = prettyHtml(dedent(text));
  const unit = indentUnit(cfg);
  // prettyHtml usa 2 espacios; remapear
  t = t.replace(/^( +)/gm, (_, sp) => unit.repeat(Math.floor(sp.length / 2)));
  return joinEol(t.split(/\r?\n/), cfg);
}

function formatCss(text, cfg) {
  let t = dedent(text)
    .replace(/\s*\{\s*/g, ' {\n')
    .replace(/\s*\}\s*/g, '\n}\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\n{3,}/g, '\n\n');
  return reindentByBraces(t, cfg);
}

function formatPython(text, cfg) {
  // Python: respetar bloques por `:` / dedent heurístico mínimo + tabWidth.
  const unit = indentUnit(cfg);
  const lines = dedent(text).replace(/\r\n/g, '\n').split('\n');
  // Normalizar indent existente a niveles de 2/4 detectados
  const indents = lines
    .filter((l) => l.trim())
    .map((l) => (l.match(/^ */) || [''])[0].length);
  const step = indents.length
    ? Math.max(1, Math.min(...indents.filter((n) => n > 0).length ? indents.filter((n) => n > 0) : [2]))
    : 2;
  const out = lines.map((line) => {
    if (!line.trim()) return '';
    const lead = (line.match(/^ */) || [''])[0].length;
    const level = Math.round(lead / step);
    return unit.repeat(level) + line.trim();
  });
  return joinEol(out, cfg);
}

/**
 * @param {string} text
 * @param {string} langId
 * @param {CodeFormatConfig | object} [config]
 */
export function formatCode(text, langId, config) {
  const cfg = normalizeFormatConfig(config);
  const id = String(langId || 'javascript').toLowerCase();
  let out;
  // Un diff no se re-indenta ni se re-comilla: sus columnas son datos. Lo único
  // que se "formatea" es la rejilla del --stat.
  if (id === 'diff' || id === 'commit') out = formatDiff(text, { eol: cfg.endOfLine });
  else if (id === 'html' || id === 'htm' || id === 'htmlmixed') out = formatHtml(text, cfg);
  else if (id === 'css' || id === 'scss' || id === 'less') out = formatCss(text, cfg);
  else if (id === 'python' || id === 'py') out = formatPython(text, cfg);
  else if (id === 'json') {
    try {
      out = JSON.stringify(JSON.parse(String(text)), null, cfg.useTabs ? '\t' : cfg.tabWidth);
      out = joinEol(String(out).split(/\r?\n/), cfg);
    } catch {
      out = formatJavascript(text, cfg);
    }
  } else if (id === 'shell' || id === 'curl' || id === 'bash' || id === 'sh' || id === 'zsh' || id === 'cli') {
    // Un cURL no se re-indenta: las barras `\` y el orden de flags son el dato.
    out = joinEol(String(text).replace(/\r\n/g, '\n').split('\n'), cfg);
  } else {
    out = formatJavascript(text, cfg);
  }
  return out;
}

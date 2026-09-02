/**
 * code-langs.js — registro de lenguajes para `<is-code>`.
 *
 * El resaltado lo hace el motor NATIVO (code-highlight): aquí solo vive el
 * registro de ids/alias, la inferencia por texto y las clases de línea.
 * Ya no se descarga ningún modo de CodeMirror desde CDN.
 */

import { diffLineClass } from './code-diff.js';

/**
 * @typedef {object} CodeLangDef
 * @property {string} id
 * @property {string[]} [aliases]
 * @property {string | object} mode  modo CM o spec `{ name, … }`
 * @property {boolean} [heavy]
 * @property {() => Promise<void>} [load]
 * @property {(line: string) => (string | null)} [lineClass]
 *   Clase de fondo por línea. El tokenizador de CM colorea texto, no filas
 *   enteras; los lenguajes cuyo significado vive en la línea completa (un diff:
 *   esta fila entra, esta sale) la usan para pedir la banda de color.
 */

/** @type {Map<string, CodeLangDef>} */
const LANGS = new Map();
/** @type {Map<string, string>} alias → id */
const ALIASES = new Map();

/**
 * @param {CodeLangDef} def
 */
export function registerLanguage(def: CodeLangDef) {
  if (!def?.id) throw new Error('[code-langs] id obligatorio');
  LANGS.set(def.id, def);
  ALIASES.set(def.id.toLowerCase(), def.id);
  for (const a of def.aliases || []) ALIASES.set(String(a).toLowerCase(), def.id);
}

/** @param {string | null | undefined} name */
export function resolveLanguage(name: string | null | undefined) {
  if (!name) return LANGS.get('javascript');
  const key = String(name).trim().toLowerCase();
  const id = ALIASES.get(key) || key;
  return LANGS.get(id) || null;
}

/**
 * Infere lang cuando el consumidor no pasó `lang` (p. ej. snippets de demos).
 * Sin esto, HTML cae al default `javascript` y `<` se pinta como operador.
 * @param {string} text
 * @returns {string} id de lenguaje registrado
 */
export function inferLanguage(text: string) {
  const t = String(text || '').trim();
  if (!t) return 'javascript';
  if (/^(?:@|:root|[.#]?[a-z][\w-]*)\s*\{/i.test(t)
    || (/:\s*[^;]+;/m.test(t) && !/[<(]/.test(t.slice(0, 40)))) {
    if (!/\b(?:const|let|var|function|=>)\b/.test(t) && !/^</.test(t)) return 'css';
  }
  if (/^</.test(t) || /<\/?[a-z][\w:-]*[\s>]/i.test(t.slice(0, 120))) return 'html';
  if (/^\{[\s\S]*\}$/.test(t) || /^\[[\s\S]*\]$/.test(t)) {
    try {
      JSON.parse(t);
      return 'json';
    } catch { /* no json */ }
  }
  if (/\b(?:def |class |import |from |print\()/.test(t) && !/\b(?:const|let|var|function)\b/.test(t)) {
    return 'python';
  }
  if (/^(?:diff --git|Index: |--- |\+\+\+ |@@ )/.test(t) || /^[+-]{3} /m.test(t)) return 'diff';
  if (/^curl\b/i.test(t) || /^#!\s*\/(?:usr\/)?bin\/(?:ba)?sh\b/.test(t)) return 'shell';
  if (/\b(?:const|let|var|function|=>|import|export|class)\b/.test(t) || /\.\w+\s*=/.test(t)) {
    return 'javascript';
  }
  return 'javascript';
}

export function listLanguages() {
  return [...LANGS.values()].map((d) => ({
    id: d.id,
    aliases: [...(d.aliases || [])],
    heavy: !!d.heavy,
  }));
}

/** Devuelve el id y la definición del lenguaje (sin cargar modos CDN). */
export function ensureLanguage(name) {
  const def = resolveLanguage(name);
  if (!def) {
    return { id: 'plaintext', def: null };
  }
  return { id: def.id, def };
}

// —— Built-ins (no pesados: ya vienen con highlight-code / code-cm) ——

registerLanguage({
  id: 'javascript',
  aliases: ['js', 'mjs', 'cjs'],
  mode: 'javascript',
  heavy: false,
});

registerLanguage({
  id: 'typescript',
  aliases: ['ts', 'mts', 'cts'],
  mode: { name: 'javascript', typescript: true },
  heavy: false,
});

registerLanguage({
  id: 'jsx',
  aliases: ['react'],
  mode: { name: 'javascript', jsx: true },
  heavy: false,
});

registerLanguage({
  id: 'tsx',
  aliases: [],
  mode: { name: 'javascript', typescript: true, jsx: true },
  heavy: false,
});

registerLanguage({
  id: 'html',
  aliases: ['htm', 'htmlmixed'],
  mode: 'htmlmixed',
  heavy: false,
});

registerLanguage({
  id: 'css',
  aliases: ['scss', 'less'],
  mode: 'css',
  heavy: false,
});

registerLanguage({
  id: 'json',
  aliases: [],
  mode: { name: 'javascript', json: true },
  heavy: false,
});

registerLanguage({
  id: 'python',
  aliases: ['py'],
  // El motor nativo tokeniza python como plaintext (sin modos CDN).
  heavy: false,
});

/** cURL / shell: tokenizer nativo del motor (code-highlight). */
registerLanguage({
  id: 'shell',
  aliases: ['bash', 'sh', 'zsh', 'curl', 'cli'],
  heavy: false,
});

registerLanguage({
  id: 'plaintext',
  aliases: ['text', 'plain', 'txt'],
  mode: 'null',
  heavy: false,
});

// —— Diff y resumen de commit ——
// El motor nativo banda las líneas (code-highlight.diffLineClass); la clase de
// línea se conserva en el registro para quien la pida vía resolveLanguage.

registerLanguage({
  id: 'diff',
  aliases: ['patch', 'udiff', 'unified-diff'],
  mode: 'is-diff',
  heavy: false,
  lineClass: diffLineClass,
});

registerLanguage({
  id: 'commit',
  aliases: ['commit-resume', 'resumen-commit', 'git', 'git-log', 'gitlog', 'git-show'],
  mode: 'is-diff',
  heavy: false,
  lineClass: diffLineClass,
});

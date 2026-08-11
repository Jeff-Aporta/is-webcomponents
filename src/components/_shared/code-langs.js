/**
 * code-langs.js — registro de lenguajes para `<is-code>`.
 *
 * Los modos livianos (js/ts/jsx/html/css) se resuelven con lo que ya carga
 * `ensureCodeMirror`. Los pesados (python) se piden bajo demanda vía
 * `loadCodeMirrorMode`. El sistema queda abierto: `registerLanguage()`.
 */

import { loadCodeMirrorMode, ensureCodeMirrorEditor } from './code-cm.js';
import { defineDiffMode, diffLineClass } from './code-diff.js';

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
export function registerLanguage(def) {
  if (!def?.id) throw new Error('[code-langs] id obligatorio');
  LANGS.set(def.id, def);
  ALIASES.set(def.id.toLowerCase(), def.id);
  for (const a of def.aliases || []) ALIASES.set(String(a).toLowerCase(), def.id);
}

/** @param {string | null | undefined} name */
export function resolveLanguage(name) {
  if (!name) return LANGS.get('javascript');
  const key = String(name).trim().toLowerCase();
  const id = ALIASES.get(key) || key;
  return LANGS.get(id) || null;
}

export function listLanguages() {
  return [...LANGS.values()].map((d) => ({
    id: d.id,
    aliases: [...(d.aliases || [])],
    heavy: !!d.heavy,
  }));
}

/** Asegura el modo CM del lenguaje y devuelve el mode spec para fromTextArea. */
export async function ensureLanguage(name) {
  await ensureCodeMirrorEditor();
  const def = resolveLanguage(name);
  if (!def) {
    return { mode: 'null', id: 'plaintext', def: null };
  }
  if (typeof def.load === 'function') await def.load();
  return { mode: def.mode, id: def.id, def };
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
  mode: 'python',
  heavy: true,
  load: async () => {
    const CM = globalThis.CodeMirror;
    if (CM?.modes?.python) return;
    await loadCodeMirrorMode('python/python');
  },
});

registerLanguage({
  id: 'plaintext',
  aliases: ['text', 'plain', 'txt'],
  mode: 'null',
  heavy: false,
});

// —— Diff y resumen de commit ——
// El modo se define en el propio kit (no se baja de la CDN de CM): son ~40
// líneas y así el bloque colorea igual aunque el modo remoto no llegue.

registerLanguage({
  id: 'diff',
  aliases: ['patch', 'udiff', 'unified-diff'],
  mode: 'is-diff',
  heavy: false,
  lineClass: diffLineClass,
  load: async () => { defineDiffMode(globalThis.CodeMirror); },
});

registerLanguage({
  id: 'commit',
  aliases: ['commit-resume', 'resumen-commit', 'git', 'git-log', 'gitlog', 'git-show'],
  mode: 'is-diff',
  heavy: false,
  lineClass: diffLineClass,
  load: async () => { defineDiffMode(globalThis.CodeMirror); },
});

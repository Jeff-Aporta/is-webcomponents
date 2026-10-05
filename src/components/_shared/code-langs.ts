/**
 * code-langs.js — registro de lenguajes para `<iswc-code>`.
 *
 * El resaltado lo hace el motor NATIVO (code-highlight): aquí solo vive el
 * registro de ids/alias, la inferencia por texto y las clases de línea.
 * Ya no se descarga ningún modo de CodeMirror desde CDN.
 */

import { diffLineClass } from './code-diff.js';
import type { CodeLangDef, LanguageSummary, LanguageResolution } from "./code-langs.schemas.js";

/**
 * Definición de un lenguaje: id, alias, y opcionalmente una clase de fondo
 * por línea (la piden los lenguajes cuyo significado vive en la línea
 * completa, p. ej. diff: esta fila entra, esta sale).
 */

const LANGS = new Map<string, CodeLangDef>();
/** alias → id */
const ALIASES = new Map<string, string>();

/**
 * Registra un lenguaje y lo deja disponible por su `id` y por cada `aliases`.
 */
export function registerLanguage(def: CodeLangDef): void {
  if (!def?.id) throw new Error('[code-langs] id obligatorio');
  LANGS.set(def.id, def);
  ALIASES.set(def.id.toLowerCase(), def.id);
  for (const a of def.aliases || []) ALIASES.set(String(a).toLowerCase(), def.id);
}

/** Resuelve un nombre (id o alias) a la `CodeLangDef` registrada, o `null`. */
export function resolveLanguage(name: string | null | undefined): CodeLangDef | null {
  if (!name) return LANGS.get('javascript') ?? null;
  const key = String(name).trim().toLowerCase();
  const id = ALIASES.get(key) || key;
  return LANGS.get(id) || null;
}

/**
 * Infiere lang cuando el consumidor no pasó `lang` (p. ej. snippets de demos).
 * Sin esto, HTML cae al default `javascript` y `<` se pinta como operador.
 */
export function inferLanguage(text: string): string {
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

export function listLanguages(): LanguageSummary[] {
  return [...LANGS.values()].map((d) => ({
    id: d.id,
    aliases: [...(d.aliases || [])],
    heavy: !!d.heavy,
  }));
}

/** Devuelve el id y la definición del lenguaje (sin cargar modos CDN). */
export function ensureLanguage(name: string | null | undefined): LanguageResolution {
  const def = resolveLanguage(name);
  if (!def) {
    return { id: 'plaintext', def: null };
  }
  return { id: def.id, def };
}

// —— Built-ins (motor nativo code-highlight; sin modos CM) ——

registerLanguage({
  id: 'javascript',
  aliases: ['js', 'mjs', 'cjs'],
});

registerLanguage({
  id: 'typescript',
  aliases: ['ts', 'mts', 'cts'],
});

registerLanguage({
  id: 'jsx',
  aliases: ['react'],
});

registerLanguage({
  id: 'tsx',
  aliases: [],
});

registerLanguage({
  id: 'html',
  aliases: ['htm', 'htmlmixed'],
});

registerLanguage({
  id: 'css',
  aliases: ['scss', 'less'],
});

registerLanguage({
  id: 'json',
  aliases: [],
});

registerLanguage({
  id: 'python',
  aliases: ['py'],
});

/** cURL / shell: tokenizer nativo del motor (code-highlight). */
registerLanguage({
  id: 'shell',
  aliases: ['bash', 'sh', 'zsh', 'curl', 'cli'],
});

registerLanguage({
  id: 'plaintext',
  aliases: ['text', 'plain', 'txt'],
});

// —— Diff y resumen de commit ——
// El motor nativo banda las líneas (code-highlight.diffLineClass); la clase de
// línea se conserva en el registro para quien la pida vía resolveLanguage.

registerLanguage({
  id: 'diff',
  aliases: ['patch', 'udiff', 'unified-diff'],
  lineClass: diffLineClass,
});

registerLanguage({
  id: 'commit',
  aliases: ['commit-resume', 'resumen-commit', 'git', 'git-log', 'gitlog', 'git-show'],
  lineClass: diffLineClass,
});

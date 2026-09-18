/**
 * code-model.js — documento estructurado del editor (code ↔ json).
 *
 * Analogía con html2json / json2html: el texto plano es `value`; las
 * anotaciones externas (highlights de error, tooltips de docs) viven en
 * `marks[]` con offsets UTF-16 (igual que JS String).
 *
 * Schema: `is-code-doc/v1`
 *
 * {
 *   "$schema": "is-code-doc/v1",
 *   "lang": "javascript",
 *   "value": "…",
 *   "marks": [
 *     { "id": "e1", "from": 10, "to": 18, "kind": "highlight", "tone": "error",
 *       "message": "Undefined name" },
 *     { "id": "t1", "from": 20, "to": 23, "kind": "tooltip",
 *       "title": "map()", "body": "Array.prototype.map" }
 *   ],
 *   "format": { "tabWidth": 2 },
 *   "theme": { "keyword": "#c792ea" }
 * }
 */

export const CODE_DOC_SCHEMA = 'is-code-doc/v1';

export type CodeMarkKind = 'highlight' | 'tooltip' | 'message';
export type CodeMarkTone = 'error' | 'warning' | 'info' | 'success' | 'neutral';

/** Anotación externa sobre el texto (highlight / tooltip / message). */
export type CodeMark = {
  id: string;
  from: number;
  to: number;
  kind: CodeMarkKind;
  tone: CodeMarkTone;
  message?: string;
  title?: string;
  body?: string;
  className?: string;
};

/** Forma cruda (algunos campos faltantes) de un mark entrante. */
type CodeMarkInput = {
  id?: unknown;
  from?: unknown;
  to?: unknown;
  kind?: unknown;
  tone?: unknown;
  message?: unknown;
  title?: unknown;
  body?: unknown;
  className?: unknown;
};

/** Forma normalizada del documento round-trippeable. */
export type CodeDocument = {
  $schema: string;
  lang: string;
  value: string;
  marks: CodeMark[];
  format?: object;
  theme?: object;
};

/** Opciones de `code2json` (texto → documento). */
export type CodeDocOpts = {
  lang?: string;
  marks?: readonly unknown[];
  format?: object;
  theme?: object;
};

const VALID_KINDS: ReadonlySet<string> = new Set<CodeMarkKind>(['highlight', 'tooltip', 'message']);
const VALID_TONES: ReadonlySet<string> = new Set<CodeMarkTone>(['error', 'warning', 'info', 'success', 'neutral']);

let markSeq = 0;
const nextId = (): string => `m${Date.now().toString(36)}_${(++markSeq).toString(36)}`;

function isValidKind(v: unknown): v is CodeMarkKind {
  return typeof v === 'string' && (VALID_KINDS as Set<string>).has(v);
}
function isValidTone(v: unknown): v is CodeMarkTone {
  return typeof v === 'string' && (VALID_TONES as Set<string>).has(v);
}

export function normalizeMark(mark: unknown): CodeMark | null {
  if (!mark || typeof mark !== 'object') return null;
  const m = mark as CodeMarkInput;
  const from = Number(m.from);
  const to = Number(m.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  const kind: CodeMarkKind = isValidKind(m.kind) ? m.kind : 'highlight';
  const tone: CodeMarkTone = isValidTone(m.tone) ? m.tone : 'neutral';
  return {
    id: m.id ? String(m.id) : nextId(),
    from: Math.max(0, Math.floor(from)),
    to: Math.max(0, Math.floor(to)),
    kind,
    tone,
    message: m.message != null ? String(m.message) : undefined,
    title: m.title != null ? String(m.title) : undefined,
    body: m.body != null ? String(m.body) : undefined,
    className: m.className != null ? String(m.className) : undefined,
  };
}

/**
 * Texto plano → documento.
 */
export function code2json(value: string, opts: CodeDocOpts = {}): CodeDocument {
  const marks = Array.isArray(opts.marks)
    ? opts.marks.map(normalizeMark).filter((m): m is CodeMark => m !== null)
    : [];
  const doc: CodeDocument = {
    $schema: CODE_DOC_SCHEMA,
    lang: opts.lang || 'javascript',
    value: value == null ? '' : String(value),
    marks,
  };
  if (opts.format) doc.format = opts.format;
  if (opts.theme) doc.theme = opts.theme;
  return doc;
}

/**
 * Documento → texto plano (pierde marks; usar getDocument para round-trip).
 */
export function json2code(doc: CodeDocument | string | null | undefined): string {
  if (doc == null) return '';
  if (typeof doc === 'string') {
    try {
      return json2code(JSON.parse(doc) as CodeDocument);
    } catch {
      return doc;
    }
  }
  if (typeof doc === 'object' && doc.value != null) return String(doc.value);
  return '';
}

/** Forma cruda de un doc entrante (al validar JSON.parse). */
type CodeDocumentInput = {
  $schema?: unknown;
  value?: unknown;
  lang?: unknown;
  marks?: unknown;
  format?: unknown;
  theme?: unknown;
};

export function parseCodeDocument(raw: unknown): CodeDocument | null {
  if (raw == null || raw === '') return null;
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return code2json(raw);
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as CodeDocumentInput;
  // Si parece un doc
  if ('value' in o || '$schema' in o || Array.isArray(o.marks)) {
    return code2json(String(o.value ?? ''), {
      lang: typeof o.lang === 'string' ? o.lang : undefined,
      marks: Array.isArray(o.marks) ? o.marks : undefined,
      format: typeof o.format === 'object' && o.format ? o.format : undefined,
      theme: typeof o.theme === 'object' && o.theme ? o.theme : undefined,
    });
  }
  return null;
}

/**
 * Ajusta offsets de marks tras un reemplazo de texto (simple: invalida
 * marks que intersectan el rango editado; los posteriores se desplazan).
 */
export function rebaseMarks(marks: readonly CodeMark[], from: number, to: number, insertedLen: number): CodeMark[] {
  const delta = insertedLen - (to - from);
  const next: CodeMark[] = [];
  for (const m of marks) {
    if (m.to <= from) {
      next.push(m);
      continue;
    }
    if (m.from >= to) {
      next.push({ ...m, from: m.from + delta, to: m.to + delta });
      continue;
    }
    // Intersecta la edición: se descarta (el sistema externo debe reaplicar).
  }
  return next;
}

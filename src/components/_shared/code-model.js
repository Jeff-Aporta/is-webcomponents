/**
 * code-model.js — documento estructurado del editor (code ↔ json).
 *
 * Analogía con html2json / json2html: el texto plano es `value`; las
 * anotaciones externas (highlights de error, tooltips de docs) viven en
 * `marks[]` con offsets UTF-16 (igual que CodeMirror / JS String).
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

const VALID_KINDS = new Set(['highlight', 'tooltip', 'message']);
const VALID_TONES = new Set(['error', 'warning', 'info', 'success', 'neutral']);

/**
 * @typedef {object} CodeMark
 * @property {string} [id]
 * @property {number} from
 * @property {number} to
 * @property {'highlight'|'tooltip'|'message'} kind
 * @property {'error'|'warning'|'info'|'success'|'neutral'} [tone]
 * @property {string} [message]
 * @property {string} [title]
 * @property {string} [body]
 * @property {string} [className]
 */

/**
 * @typedef {object} CodeDocument
 * @property {string} [$schema]
 * @property {string} [lang]
 * @property {string} value
 * @property {CodeMark[]} [marks]
 * @property {object} [format]
 * @property {object} [theme]
 */

let markSeq = 0;
const nextId = () => `m${Date.now().toString(36)}_${(++markSeq).toString(36)}`;

/** @param {unknown} mark */
export function normalizeMark(mark) {
  if (!mark || typeof mark !== 'object') return null;
  const from = Number(mark.from);
  const to = Number(mark.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  const kind = VALID_KINDS.has(mark.kind) ? mark.kind : 'highlight';
  const tone = VALID_TONES.has(mark.tone) ? mark.tone : 'neutral';
  return {
    id: mark.id ? String(mark.id) : nextId(),
    from: Math.max(0, Math.floor(from)),
    to: Math.max(0, Math.floor(to)),
    kind,
    tone,
    message: mark.message != null ? String(mark.message) : undefined,
    title: mark.title != null ? String(mark.title) : undefined,
    body: mark.body != null ? String(mark.body) : undefined,
    className: mark.className != null ? String(mark.className) : undefined,
  };
}

/**
 * Texto plano → documento.
 * @param {string} value
 * @param {{ lang?: string, marks?: unknown[], format?: object, theme?: object }} [opts]
 * @returns {CodeDocument}
 */
export function code2json(value, opts = {}) {
  const marks = Array.isArray(opts.marks)
    ? opts.marks.map(normalizeMark).filter(Boolean)
    : [];
  return {
    $schema: CODE_DOC_SCHEMA,
    lang: opts.lang || 'javascript',
    value: value == null ? '' : String(value),
    marks,
    ...(opts.format ? { format: opts.format } : {}),
    ...(opts.theme ? { theme: opts.theme } : {}),
  };
}

/**
 * Documento → texto plano (pierde marks; usar getDocument para round-trip).
 * @param {CodeDocument | string | null | undefined} doc
 */
export function json2code(doc) {
  if (doc == null) return '';
  if (typeof doc === 'string') {
    try {
      return json2code(JSON.parse(doc));
    } catch {
      return doc;
    }
  }
  if (typeof doc === 'object' && doc.value != null) return String(doc.value);
  return '';
}

/**
 * @param {unknown} raw
 * @returns {CodeDocument | null}
 */
export function parseCodeDocument(raw) {
  if (raw == null || raw === '') return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return code2json(raw);
    }
  }
  if (typeof obj !== 'object') return null;
  // Si parece un doc
  if ('value' in obj || '$schema' in obj || Array.isArray(obj.marks)) {
    return code2json(obj.value ?? '', {
      lang: obj.lang,
      marks: obj.marks,
      format: obj.format,
      theme: obj.theme,
    });
  }
  return null;
}

/**
 * Ajusta offsets de marks tras un reemplazo de texto (simple: invalida
 * marks que intersectan el rango editado; los posteriores se desplazan).
 * @param {CodeMark[]} marks
 * @param {number} from
 * @param {number} to
 * @param {number} insertedLen
 */
export function rebaseMarks(marks, from, to, insertedLen) {
  const delta = insertedLen - (to - from);
  const next = [];
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

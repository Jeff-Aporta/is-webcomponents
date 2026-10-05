// scripts/w35-add-titles.mjs — Auditor + aplicador de title a accionables en demos.
//
// Acción: para cada <button>, <a>, <input>, <select>, <textarea> y <iswc-*>
// SIN atributo title, agregar uno apropiado basado en:
//   - texto del elemento,
//   - aria-label,
//   - atributos del iswc-* (label, value, href, etc.),
//   - contexto del componente.
//
// Uso:
//   node scripts/w35-add-titles.mjs           # solo reporte
//   node scripts/w35-add-titles.mjs --apply   # aplica cambios
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('demos');
const APPLY = process.argv.includes('--apply');

/** @type {{file: string, line: number, tag: string, current: string, proposed: string}[]} */
const findings = [];

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.isFile() && ent.name.endsWith('.html')) yield p;
  }
}

const ACTIONABLE_TAGS = new Set([
  'button', 'a', 'input', 'select', 'textarea',
  // Custom elements iswc-* se detectan por prefijo.
]);
const ISWC_PREFIX = 'iswc-';

const VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);
/** Tags con contenido RAWTEXT (no se buscan tags dentro). */
const RAWTEXT_TAGS = new Set(['script', 'style']);
/** Tags con contenido RCDATA (no se buscan tags dentro; <textarea> es RCDATA). */
const RCDATA_TAGS = new Set(['title', 'textarea']);

/**
 * @typedef {{start: number, end: number, tag: string, attrs: Map<string, string>,
 *            raw: string, selfClosing: boolean}} TagInfo
 */

/**
 * Encuentra el siguiente tag HTML en `src` desde `startFrom`. Ignora comments,
 * CDATA, doctype y bloques <script>/<style>.
 *
 * @param {string} src
 * @param {number} startFrom
 * @returns {TagInfo | null}
 */
function matchTagAt(src, startFrom) {
  let i = startFrom;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) return null;
    // Comment
    if (src.startsWith('<!--', lt)) {
      const close = src.indexOf('-->', lt + 4);
      if (close < 0) return null;
      i = close + 3;
      continue;
    }
    // Doctype/CDATA/processing
    if (src[lt + 1] === '!' || src[lt + 1] === '?') {
      const gt = src.indexOf('>', lt);
      if (gt < 0) return null;
      i = gt + 1;
      continue;
    }
    // Posible tag de apertura o cierre.
    const tagStart = lt + 1;
    if (src[tagStart] === '/') {
      // Closing tag — saltar
      const gt = src.indexOf('>', tagStart);
      if (gt < 0) return null;
      i = gt + 1;
      continue;
    }
    // Tag name
    let j = tagStart;
    while (j < src.length && /[A-Za-z0-9-]/.test(src[j])) j++;
    const tagName = src.slice(tagStart, j).toLowerCase();
    if (!tagName) {
      i = lt + 1;
      continue;
    }
    // Find closing `>` of opening tag.
    let k = j;
    let selfClosing = false;
    while (k < src.length && src[k] !== '>') {
      // Skip quoted attribute values: respect quoting to find the REAL closing `>`.
      const ch = src[k];
      if (ch === '"' || ch === "'") {
        const endQuote = src.indexOf(ch, k + 1);
        if (endQuote < 0) return null;
        k = endQuote + 1;
        continue;
      }
      if (ch === '/' && src[k + 1] === '>') {
        selfClosing = true;
        k++;
        break;
      }
      k++;
    }
    if (k >= src.length) return null;
    const attrs = parseAttrs(src.slice(j, k));
    return {
      start: lt,
      end: k + 1,
      tag: tagName,
      attrs,
      selfClosing,
      raw: src.slice(lt, k + 1),
    };
  }
  return null;
}

/** Parse attributes from a slice of `tag …` (without leading `<` and trailing `>`). */
function parseAttrs(slice) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const re = /([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;
  let m;
  while ((m = re.exec(slice))) {
    const name = m[1].toLowerCase();
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    map.set(name, value);
  }
  return map;
}

function isActionableTag(tag) {
  if (ACTIONABLE_TAGS.has(tag)) return true;
  if (!tag.startsWith(ISWC_PREFIX)) return false;
  const name = tag.slice(ISWC_PREFIX.length);
  if (isContainerLike(name)) return false;
  return isButtonLike(name) || isFormControlLike(name);
}

/** Extract element inner text content (excluding `<script>`/`<style>` and tags). */
function extractText(src, start, end, tag) {
  if (VOID_TAGS.has(tag)) return '';
  const inner = src.slice(start, end);
  return inner
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Localiza el cierre del matching de `<tag>` a partir de `from`. Maneja
 * anidamiento simple y elementos void.
 *
 * @returns {number} posición del `<` del closing tag, o `from` si no se encuentra
 *                   (en cuyo caso extractText devolverá '').
 */
function findClosingStart(src, tag, from) {
  if (VOID_TAGS.has(tag)) return from;
  const openRe = new RegExp(`<${tag}\\b`, 'i');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
  let depth = 1;
  let i = from;
  while (i < src.length) {
    const slice = src.slice(i);
    const oi = slice.search(openRe);
    const ci = slice.search(closeRe);
    if (ci < 0) return from;
    if (oi >= 0 && oi < ci) {
      depth++;
      i = i + oi + 1;
    } else {
      depth--;
      if (depth === 0) return i + ci;
      i = i + ci + 1;
    }
  }
  return from;
}

/**
 * @param {string} tag tag name
 * @param {Map<string,string>} attrs
 * @param {string} text text content inside the element (empty for void)
 * @returns {string|null} a proposed title, or null if can't be safely inferred.
 */
function proposeTitle(tag, attrs, text) {
  const ariaLabel = attrs.get('aria-label');

  if (tag === 'input') {
    const type = attrs.get('type') || 'text';
    const placeholder = attrs.get('placeholder');
    const name = attrs.get('name');
    const value = attrs.get('value');
    const label = attrs.get('aria-label') || attrs.get('label');
    if (label) return label;
    if (placeholder) return placeholder;
    if (value) return value;
    if (name) return `Campo ${name} (${type})`;
    return `Campo de tipo ${type}`;
  }

  if (tag === 'a') {
    const href = attrs.get('href');
    if (text) return text;
    if (ariaLabel) return ariaLabel;
    if (href) return `Abrir enlace: ${href}`;
    return 'Enlace';
  }

  if (tag === 'button') {
    if (text) return text;
    if (ariaLabel) return ariaLabel;
    const name = attrs.get('name');
    const value = attrs.get('value');
    if (name) return `Botón ${name}`;
    if (value) return `Botón ${value}`;
    return 'Botón';
  }

  if (tag === 'select') {
    if (ariaLabel) return ariaLabel;
    const name = attrs.get('name');
    return name ? `Selector ${name}` : 'Selector';
  }
  if (tag === 'textarea') {
    if (ariaLabel) return ariaLabel;
    const placeholder = attrs.get('placeholder');
    if (placeholder) return placeholder;
    const name = attrs.get('name');
    return name ? `Área de texto ${name}` : 'Área de texto';
  }

  if (tag.startsWith(ISWC_PREFIX)) {
    const componentName = tag.slice(ISWC_PREFIX.length);
    // Ya filtramos en isActionableTag para quedarnos solo con button-like
    // o form-control-like. Aquí derivamos el texto del título.
    const explicitLabel = attrs.get('label');
    const placeholder = attrs.get('placeholder');
    const href = attrs.get('href');
    const value = attrs.get('value');
    const intent = attrs.get('intent') || attrs.get('color') || attrs.get('variant');
    const copyLabel = attrs.get('copy-label');
    // Si ya trae `label` (típico de form-controls), úsalo.
    if (explicitLabel) return explicitLabel;
    if (placeholder) return placeholder;
    // Botones.
    if (isButtonLike(componentName)) {
      if (text) return text;
      if (ariaLabel) return ariaLabel;
      if (copyLabel) return copyLabel;
      if (href) return `${componentName} → ${href}`;
      if (intent) return `${componentName} (${intent})`;
      if (value) return value;
      return componentName.replace(/-/g, ' ');
    }
    // Form controls.
    if (isFormControlLike(componentName)) {
      if (ariaLabel) return ariaLabel;
      if (placeholder) return placeholder;
      if (text) return text;
      if (value) return value;
      return componentName.replace(/-/g, ' ');
    }
    return null;
  }

  return null;
}

const BUTTON_LIKE = new Set([
  'button', 'fab', 'copy-button', 'check-icon-button',
  'share-button', 'dropdown-item',
  'theme-toggle', 'palette-selector',
  'breadcrumb-item', 'tab', 'pagination', 'stepper', 'command-palette',
  'prefs-clear', 'confirm-delete', 'speed-dial-action',
]);
const FORM_CONTROL_LIKE = new Set([
  'input', 'checkbox', 'radio', 'switch', 'select',
  'option', 'textarea', 'combobox', 'date-picker', 'date-input',
  'date-field', 'date-range-picker', 'date-range-input', 'date-time-field',
  'date-time-input', 'time-picker', 'time-input', 'time-field', 'time-clock',
  'digital-clock', 'masked-input', 'pin-input', 'rating', 'mention',
  'signature', 'slider', 'dropzone', 'doc-editor', 'rte', 'inline-edit',
  'file-input', 'color-picker', 'month-calendar', 'year-calendar',
  'full-calendar', 'duration-picker',
]);
/** Componentes que NO son accionables en sí mismos (containers/wrappers/overlays). */
const CONTAINER_LIKE = new Set([
  'button-group', 'dropdown', 'context-menu', 'tab-group',
  'tab-panel', 'radio-group', 'breadcrumb', 'tooltip',
  // Overlays que se abren, no se clickean directamente.
  'confirm-modal', 'popconfirm', 'dialog', 'drawer',
  'lightbox', 'modal-verificacion', 'window', 'loading-overlay',
]);
function isButtonLike(name) { return BUTTON_LIKE.has(name); }
function isFormControlLike(name) { return FORM_CONTROL_LIKE.has(name); }
function isContainerLike(name) { return CONTAINER_LIKE.has(name); }

/** Build a `title="…"` insertion respecting indentation. */
function buildTitleAttr(value) {
  const safe = String(value).replace(/"/g, '&quot;');
  return `title="${safe}"`;
}

function applyToFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  let pos = 0;
  let count = 0;
  while (pos < src.length) {
    const m = matchTagAt(src, pos);
    if (!m) {
      out.push(src.slice(pos));
      break;
    }
    // Copyear todo desde `pos` hasta el final del tag actual (incluye texto
    // entre el tag anterior y este, más el tag mismo).
    if (RAWTEXT_TAGS.has(m.tag) || RCDATA_TAGS.has(m.tag)) {
      // Para rawtext/rcdata, también copiamos el contenido literal hasta el
      // closing tag (no se buscan tags adentro).
      out.push(src.slice(pos, m.end));
      pos = m.end;
      const closeRe = new RegExp(`</${m.tag}\\s*>`, 'i');
      const slice = src.slice(pos);
      const ci = slice.search(closeRe);
      if (ci >= 0) {
        const closeEnd = pos + slice.indexOf('>', ci) + 1;
        out.push(src.slice(pos, closeEnd));
        pos = closeEnd;
      }
      continue;
    }
    if (!isActionableTag(m.tag) || m.attrs.has('title')) {
      // Tag normal no accionable: copiar todo desde `pos` hasta el final del tag.
      out.push(src.slice(pos, m.end));
      pos = m.end;
      continue;
    }
    // Tag accionable: extraer contenido para proponer un título.
    const closingStart = findClosingStart(src, m.tag, m.end);
    const text = extractText(src, m.end, closingStart, m.tag);
    const proposed = proposeTitle(m.tag, m.attrs, text);
    // Copiar todo desde `pos` hasta el final del tag (texto antes + tag).
    out.push(src.slice(pos, m.end));
    pos = m.end;
    if (!proposed) continue;
    // Reemplazar el último push (el tag completo) por `<tag title="…" …resto>`.
    const fullTag = out.pop();
    // `fullTag` puede tener texto/indentación previa al `<` del tag (es el
    // slice desde `pos` hasta `m.end`). Encontrar el `<` real para calcular
    // dónde insertar el atributo title.
    const ltIdx = fullTag.indexOf(`<${m.tag}`);
    const tagNameEnd = ltIdx + 1 + m.tag.length;
    out.push(fullTag.slice(0, tagNameEnd));
    out.push(' ');
    out.push(buildTitleAttr(proposed));
    out.push(fullTag.slice(tagNameEnd));
    findings.push({
      file,
      line: lineOf(src, m.start),
      tag: m.tag,
      current: text || '(sin texto)',
      proposed,
    });
    count++;
  }
  if (APPLY && count > 0) {
    fs.writeFileSync(file, out.join(''), 'utf8');
  }
  return count;
}

function lineOf(src, pos) {
  let line = 1;
  for (let i = 0; i < pos; i++) if (src[i] === '\n') line++;
  return line;
}

let totalFixed = 0;
let totalFiles = 0;
for (const file of walk(ROOT)) {
  const c = applyToFile(file);
  if (c > 0) {
    totalFixed += c;
    totalFiles++;
  }
}

const summary = {
  mode: APPLY ? 'apply' : 'report',
  totalFiles,
  totalFixed,
  totalFindings: findings.length,
};
console.log(JSON.stringify(summary, null, 2));
if (findings.length > 0) {
  console.log('\n— Detalle —');
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}  <${f.tag}>  →  title="${f.proposed}"`);
  }
}
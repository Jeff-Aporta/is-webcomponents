import { mdToHtml } from '../helpers/md-lite.js';

/**
 * prompt-md.js — Variables {{nombre}} + render MD/HTML híbrido para
 * `<is-md-render>` / `<is-md-editor>`. Port de PatyIA (`core/promptVariables.ts` +
 * `ui/promptMdEditorHtml.ts`) a vanilla JS, sin dependencias npm.
 */

// ---- variables {{nombre}} --------------------------------------------

export const PROMPT_VAR_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/** `{{nombre}` sin la segunda `}` de cierre (typo histórico). */
export const MALFORMED_PROMPT_VAR_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}(?!\})/g;

export function isValidVarName(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name ?? '').trim());
}

/** Segmentos `{ type: 'text'|'var', value|name }` en orden de aparición. */
export function splitBodyWithVars(text) {
  const src = String(text ?? '');
  if (!src) return [];
  const out = [];
  const re = new RegExp(PROMPT_VAR_PATTERN.source, 'g');
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ type: 'text', value: src.slice(last, m.index) });
    out.push({ type: 'var', name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ type: 'text', value: src.slice(last) });
  return out;
}

/** Lista única de variables presentes (orden de primera aparición). */
export function extractPromptVariables(text) {
  const seen = new Set();
  const out = [];
  for (const seg of splitBodyWithVars(text)) {
    if (seg.type !== 'var' || seen.has(seg.name)) continue;
    seen.add(seg.name);
    out.push(seg.name);
  }
  return out;
}

/** Tono (hue 0–359) determinista a partir del nombre de la variable. */
export function varNameToHue(name) {
  let h = 2166136261;
  const s = String(name ?? '').trim().toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
    h ^= Math.imul(i + 1, 0x9e3779b1);
  }
  return (Math.imul(h >>> 0, 137) >>> 0) % 360;
}

/** Valor del atributo `style` con `--var-tone-h` para chips/badges. */
export function varToneStyleAttr(name) {
  return `--var-tone-h:${varNameToHue(name)}`;
}

function varReplaceRe(name) {
  return new RegExp(`\\{\\{\\s*${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
}

export function renamePromptVariable(text, oldName, newName) {
  const next = String(newName ?? '').trim();
  if (!isValidVarName(next)) return text;
  return String(text ?? '').replace(varReplaceRe(oldName), `{{${next}}}`);
}

export function deletePromptVariable(text, name) {
  return String(text ?? '').replace(varReplaceRe(name), '');
}

export function insertPromptVariable(text, offset, name) {
  const token = `{{${name}}}`;
  const pos = Math.max(0, Math.min(offset, text.length));
  return text.slice(0, pos) + token + text.slice(pos);
}

/** Corrige `{{var}` → `{{var}}` antes de renderizar o guardar. */
export function repairPromptVarBraces(text) {
  return String(text ?? '').replace(MALFORMED_PROMPT_VAR_PATTERN, (_m, name) => `{{${name}}}`);
}

// ---- render MD/HTML híbrido + chips de variable -----------------------

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** HTML de un chip `{{nombre}}` con tono determinista por nombre. */
export function varChipHtml(name) {
  return (
    `<span class="prompt-var-chip" contenteditable="false" data-var="${escAttr(name)}" style="${varToneStyleAttr(name)}" title="${escAttr(name)}">`
    + `<span class="prompt-var-chip__label">{{${escAttr(name)}}}</span></span>`
  );
}

/** Sustituye {{vars}} por tokens, renderiza MD+HTML una vez y reemplaza por chips. */
function renderBodyWithVarChips(body) {
  const src = repairPromptVarBraces(String(body ?? ''));
  if (!src) return '';

  const placeholders = [];
  let idx = 0;
  const mdSrc = src.replace(PROMPT_VAR_PATTERN, (_m, name) => {
    const token = `\uE000PV${idx}\uE001`;
    idx += 1;
    placeholders.push({ token, name });
    return token;
  });

  let html = mdToHtml(mdSrc);
  for (const { token, name } of placeholders) {
    html = html.split(token).join(varChipHtml(name));
  }
  return html;
}

/** Vista previa de solo lectura: markdown + HTML + chips de variable inline. */
export function bodyPreviewHtml(body) {
  const src = String(body ?? '');
  if (!src) return '';
  return renderBodyWithVarChips(src);
}

/** HTML editable para contenteditable (mismo render, chips no editables inline). */
export function bodyToEditorHtml(body) {
  const html = renderBodyWithVarChips(body);
  return html || '<p><br></p>';
}

const MD_BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'pre', 'blockquote', 'hr']);
const MD_INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'code', 'a', 'br', 'img']);

function preserveHtml(el) {
  return el.outerHTML;
}

function varChipSource(el) {
  return el.dataset.var ? `{{${el.dataset.var}}}` : '';
}

function tableCellSource(td) {
  if (td.classList?.contains('prompt-var-chip')) return varChipSource(td);
  return [...td.childNodes].map((n) => inlineMd(n)).join('').trim();
}

function tableHtmlToGfm(table) {
  const rowEls = [...table.querySelectorAll('tr')];
  if (!rowEls.length) return preserveHtml(table);
  const lines = [];
  const firstCells = [...rowEls[0].querySelectorAll('th,td')].map(tableCellSource);
  lines.push(`| ${firstCells.join(' | ')} |`);
  lines.push(`| ${firstCells.map(() => '---').join(' | ')} |`);
  for (let i = 1; i < rowEls.length; i += 1) {
    const cells = [...rowEls[i].querySelectorAll('th,td')].map(tableCellSource);
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

function inlineMd(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node;
  if (el.classList?.contains('prompt-var-chip')) return varChipSource(el);

  const tag = el.tagName.toLowerCase();
  const inner = () => [...el.childNodes].map(inlineMd).join('');

  if (!MD_INLINE_TAGS.has(tag)) return preserveHtml(el);

  switch (tag) {
    case 'strong':
    case 'b':
      return `**${inner()}**`;
    case 'em':
    case 'i':
      return `*${inner()}*`;
    case 'code':
      return `\`${inner()}\``;
    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = inner();
      return href ? `[${text || href}](${href})` : text;
    }
    case 'img': {
      const alt = el.getAttribute('alt') || 'imagen';
      const src = el.getAttribute('src') || '';
      return src ? `![${alt}](${src})` : '';
    }
    case 'br':
      return '\n';
    default:
      return preserveHtml(el);
  }
}

function blockMd(el) {
  const tag = el.tagName.toLowerCase();
  const inner = () => [...el.childNodes].map((n) => inlineMd(n)).join('');

  if (el.classList?.contains('prompt-var-chip')) return varChipSource(el);

  if (!MD_BLOCK_TAGS.has(tag)) {
    if (tag === 'div' && el.classList.contains('md-table-wrap')) {
      const table = el.querySelector(':scope > table');
      if (table) return `${tableHtmlToGfm(table)}\n\n`;
    }
    if (tag === 'table') return `${tableHtmlToGfm(el)}\n\n`;
    return `${preserveHtml(el)}\n\n`;
  }

  switch (tag) {
    case 'h1': return `# ${inner().trim()}\n\n`;
    case 'h2': return `## ${inner().trim()}\n\n`;
    case 'h3': return `### ${inner().trim()}\n\n`;
    case 'h4': return `#### ${inner().trim()}\n\n`;
    case 'h5': return `##### ${inner().trim()}\n\n`;
    case 'h6': return `###### ${inner().trim()}\n\n`;
    case 'p': return `${inner()}\n\n`;
    case 'li': {
      const parent = el.parentElement?.tagName.toLowerCase();
      const bullet = parent === 'ol' ? '1.' : '-';
      return `${bullet} ${inner().trimStart()}\n`;
    }
    case 'ul':
    case 'ol':
      return [...el.children].map((c) => blockMd(c)).join('') + '\n';
    case 'pre': {
      const code = el.querySelector('code');
      const text = code?.textContent ?? el.textContent ?? '';
      return `\`\`\`\n${text}\n\`\`\`\n\n`;
    }
    case 'blockquote':
      return inner()
        .split('\n')
        .filter(Boolean)
        .map((l) => `> ${l}`)
        .join('\n') + '\n\n';
    case 'hr':
      return '---\n\n';
    case 'div': {
      const children = [...el.children];
      if (
        el.attributes.length > 0
        || el.classList.length > 0
        || children.some((c) => !MD_BLOCK_TAGS.has(c.tagName.toLowerCase()))
      ) {
        return `${preserveHtml(el)}\n\n`;
      }
      return children.map((c) => blockMd(c)).join('');
    }
    default:
      return `${preserveHtml(el)}\n\n`;
  }
}

/** Serializa el contenteditable → markdown/HTML fuente con {{variables}}. */
export function editorHtmlToBody(root) {
  let out = '';
  for (const node of root.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) out += blockMd(node);
    else if (node.nodeType === Node.TEXT_NODE) out += node.textContent || '';
  }
  return out.replace(/\n{3,}/g, '\n\n').trimEnd();
}

const RAW_VAR_IN_TEXT = /\{\{\s*[A-Za-z_]\w*\s*\}\}/;

/** true si hay `{{var}}` en texto plano del surface aún sin convertir a chip. */
export function surfaceHasRawVarTokens(root) {
  if (!root) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (!node.parentElement?.closest('.prompt-var-chip') && RAW_VAR_IN_TEXT.test(node.textContent ?? '')) return true;
    node = walker.nextNode();
  }
  return false;
}

import { escapeHtml } from '../_shared/dom-utils.js';

/**
 * md-lite.js — Markdown → HTML minimalista, sin dependencias npm.
 *
 * Cubre el subconjunto que necesita `<is-md-editor>`: encabezados ATX,
 * párrafos (con hard-break de dos espacios + salto), listas simples (ul/ol),
 * blockquote, hr, bloque de código con fence, tablas GFM, negrita/cursiva/
 * código inline, enlaces e imágenes — y conserva sin tocar cualquier bloque
 * que ya empiece por una etiqueta HTML (`<div>`, `<table>`, …), porque ese
 * HTML viene de una serialización previa (ver `_shared/prompt-md.js`) y debe
 * sobrevivir intacto al round-trip.
 *
 * No es CommonMark completo: no hay listas anidadas por indentación, ni
 * referencias de enlace, ni HTML inline mezclado con texto en la misma
 * línea. Para el editor de instrucciones (MD + HTML por bloques + chips de
 * variable) es suficiente.
 */

const ATX_HEADING = /^(#{1,6})\s+(.*)$/;
const HR_LINE = /^([-*_])\1{2,}\s*$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
const FENCE_LINE = /^\s*```/;
const BLOCKQUOTE_LINE = /^\s*>/;
const RAW_HTML_LINE = /^\s*</;
/** Apertura de etiqueta HTML (no comentario / doctype). Captura el nombre. */
const HTML_OPEN_TAG = /^\s*<([A-Za-z][\w:.-]*)\b[^>]*>/;
const HTML_SELF_CLOSE = /^\s*<([A-Za-z][\w:.-]*)\b[^>]*\/>\s*$/;
const HTML_COMMENT_OPEN = /^\s*<!--/;

function isSpecialLine(line) {
  return ATX_HEADING.test(line)
    || HR_LINE.test(line.trim())
    || FENCE_LINE.test(line)
    || BLOCKQUOTE_LINE.test(line)
    || UL_ITEM.test(line)
    || OL_ITEM.test(line)
    || RAW_HTML_LINE.test(line);
}

/**
 * Consume un bloque HTML embebido.
 *
 * Antes se cortaba en la primera línea en blanco: eso partía `<is-flowchart>`
 * / `<is-code>` con JSON o código multilínea. Ahora, si hay etiqueta de
 * apertura, se lee hasta el `</tag>` que cierra (con profundidad); si no,
 * se mantiene el fallback “hasta línea vacía”.
 */
function consumeRawHtmlBlock(lines, start) {
  const first = lines[start];

  if (HTML_COMMENT_OPEN.test(first)) {
    const buf = [first];
    let i = start + 1;
    if (!first.includes('-->')) {
      while (i < lines.length) {
        buf.push(lines[i]);
        if (lines[i].includes('-->')) { i += 1; break; }
        i += 1;
      }
    }
    return { html: buf.join('\n'), next: first.includes('-->') ? start + 1 : i };
  }

  if (HTML_SELF_CLOSE.test(first)) {
    return { html: first, next: start + 1 };
  }

  const open = first.match(HTML_OPEN_TAG);
  if (!open) {
    const buf = [];
    let i = start;
    while (i < lines.length && lines[i].trim() !== '') { buf.push(lines[i]); i += 1; }
    return { html: buf.join('\n'), next: i };
  }

  const tag = open[1];
  const tokenRe = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
  const buf = [];
  let depth = 0;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    buf.push(line);
    for (const tok of line.match(tokenRe) || []) {
      if (/^<\//.test(tok)) depth -= 1;
      else if (!/\/>$/.test(tok)) depth += 1;
    }
    i += 1;
    if (depth <= 0) break;
  }

  return { html: buf.join('\n'), next: i };
}

/** Formato inline: código, imagen, enlace, negrita, cursiva (en ese orden,
 *  para que el contenido de un código no se reprocese como otro formato). */
function inline(text) {
  let s = escapeHtml(text);
  const codeSpans = [];
  s = s.replace(/`([^`]+)`/g, (_m, code) => {
    const token = `\u0000C${codeSpans.length}\u0000`;
    codeSpans.push(code);
    return token;
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/(?<![\w])_([^_]+)_(?![\w])/g, '<em>$1</em>');
  s = s.replace(/\u0000C(\d+)\u0000/g, (_m, i) => `<code>${codeSpans[Number(i)]}</code>`);
  return s;
}

/** Une líneas de un párrafo: salto simple → `<br>`; "  \n" también hard-break. */
function joinParagraphLines(lines) {
  let out = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    out += inline(line.replace(/ {2}$/, '').trimEnd());
    if (i < lines.length - 1) out += '<br>';
  }
  return out;
}

function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function parseAligns(sepLine) {
  return splitTableRow(sepLine).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });
}

function renderTable(header, aligns, rows) {
  const cell = (tag, c, idx) => {
    const align = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : '';
    return `<${tag}${align}>${inline(c)}</${tag}>`;
  };
  const thead = `<tr>${header.map((c, idx) => cell('th', c, idx)).join('')}</tr>`;
  const tbody = rows.map((r) => `<tr>${r.map((c, idx) => cell('td', c, idx)).join('')}</tr>`).join('');
  return `<div class="md-table-wrap"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

function parseList(lines, start) {
  const ordered = OL_ITEM.test(lines[start]);
  const itemRe = ordered ? OL_ITEM : UL_ITEM;
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(itemRe);
    if (!m) break;
    items.push(inline(m[1].trim()));
    i += 1;
  }
  const tag = ordered ? 'ol' : 'ul';
  return { html: `<${tag}>${items.map((it) => `<li>${it}</li>`).join('')}</${tag}>`, next: i };
}

/**
 * Convierte markdown (+ HTML embebido) a HTML.
 * @param {string} src
 * @returns {string}
 */
export function mdToHtml(src) {
  const text = String(src ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) return '';
  const lines = text.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    if (RAW_HTML_LINE.test(line)) {
      const { html, next } = consumeRawHtmlBlock(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    if (FENCE_LINE.test(line)) {
      const buf = [];
      i += 1;
      while (i < lines.length && !FENCE_LINE.test(lines[i])) { buf.push(lines[i]); i += 1; }
      i += 1;
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(ATX_HEADING);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (HR_LINE.test(line.trim())) { out.push('<hr>'); i += 1; continue; }

    if (line.includes('|') && lines[i + 1] != null && TABLE_SEP.test(lines[i + 1])) {
      const header = splitTableRow(line);
      const aligns = parseAligns(lines[i + 1]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      out.push(renderTable(header, aligns, rows));
      continue;
    }

    if (BLOCKQUOTE_LINE.test(line)) {
      const buf = [];
      while (i < lines.length && BLOCKQUOTE_LINE.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${mdToHtml(buf.join('\n'))}</blockquote>`);
      continue;
    }

    if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
      const { html, next } = parseList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    {
      const buf = [];
      while (i < lines.length && lines[i].trim() !== '' && !isSpecialLine(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      out.push(`<p>${joinParagraphLines(buf)}</p>`);
    }
  }

  return out.join('\n');
}

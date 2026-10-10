import { escapeHtml } from '../_shared/dom-utils.js';
import { escapeJsonForScript, resolveIswcFenceTag } from './md-iswc-fences.js';
import type { DatosCalloutMd, DatosHeadingMd, DatosPorTipoMd, ItemListaMd, OpcionesMdLite, RendererMd, RenderersMd, TabImagenMd, TipoElementoMd } from './md-lite.schemas.js';

export type * from './md-lite.schemas.js';

/**
 * md-lite.js — Markdown → HTML minimalista, sin dependencias npm.
 *
 * Cubre el subconjunto que necesita `<iswc-md-editor>` / `<iswc-md-render>`:
 * encabezados ATX, párrafos, listas, blockquote, hr, fences (código e
 * `iswc-*` → diagrama), tablas GFM, negrita/cursiva/código inline, enlaces
 * e imágenes. Conserva bloques HTML crudos (`<is-*>`, `<div>`, …).
 *
 * Los renders por defecto montan componentes del kit (`iswc-code`, `iswc-callout`,
 * `iswc-scroller`, `iswc-divider`, `iswc-theme-img`, `iswc-checkbox`, diagramas `iswc-*`)
 * con su contenido legible dentro mientras el tag no está definido. Quién los carga
 * es `<iswc-md-render>` (vía `md-hydrate`), y solo los que aparecen.
 */

const ATX_HEADING = /^(#{1,6})\s+(.*)$/;
const HR_LINE = /^([-*_])\1{2,}\s*$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
const FENCE_LINE = /^\s*```/;
const FENCE_OPEN = /^\s*```([\w:.#+-]*)\s*$/;
const BLOCKQUOTE_LINE = /^\s*>/;
const RAW_HTML_LINE = /^\s*</;
/** Apertura de etiqueta HTML (no comentario / doctype). Captura el nombre. */
const HTML_OPEN_TAG = /^\s*<([A-Za-z][\w:.-]*)\b[^>]*>/;
const HTML_SELF_CLOSE = /^\s*<([A-Za-z][\w:.-]*)\b[^>]*\/>\s*$/;
const HTML_COMMENT_OPEN = /^\s*<!--/;
/** Línea que solo trae una imagen: `![alt](src "título")`. */
const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;

function isSpecialLine(line: string) {
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
 * Antes se cortaba en la primera línea en blanco: eso partía `<iswc-flowchart>`
 * / `<iswc-code>` con JSON o código multilínea. Ahora, si hay etiqueta de
 * apertura, se lee hasta el `</tag>` que cierra (con profundidad); si no,
 * se mantiene el fallback “hasta línea vacía”.
 */
function consumeRawHtmlBlock(lines: string[], start: number): { html: string; next: number } {
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

/* ───────────────────────── hooks de render ───────────────────────── */

const NIVELES: ReadonlyArray<DatosHeadingMd['level']> = [1, 2, 3, 4, 5, 6];

/** Opciones del mdToHtml en curso (un blockquote/aviso convierte su interior con las mismas). */
let renderersActivos: RenderersMd = {};
let componentesActivos = true;
let tagsActivos: Set<string> | null = null;

/**
 * Pasa el elemento por su renderer: HTML propio o el estándar. `tags`: componentes del kit
 * que mete el estándar; se anotan solo si el estándar se usa (el hook puede envolverlo).
 */
function aplicar<K extends TipoElementoMd>(
  tipo: K,
  datos: DatosPorTipoMd[K],
  estandar: () => string,
  tags: () => readonly string[] = () => [],
): string {
  const porDefecto = (): string => {
    if (tagsActivos) for (const t of tags()) tagsActivos.add(t);
    return estandar();
  };
  const fn = renderersActivos[tipo] as RendererMd<K> | undefined;
  if (!fn) return porDefecto();
  try {
    const propio = fn(datos, porDefecto);
    return propio == null ? porDefecto() : String(propio);
  } catch (e) {
    console.warn(`[md-lite] renderer "${tipo}" falló; se usa el estándar`, e);
    return porDefecto();
  }
}

/** Tags del kit que trae un render estándar (ninguno si sale en HTML plano). */
const conKit = (...tags: string[]) => (): readonly string[] => (componentesActivos ? tags : []);

/** Tags `iswc-*` escritos a mano en un bloque HTML del markdown. */
function tagsEnHtml(html: string): string[] {
  return [...html.matchAll(/<(iswc-[a-z0-9-]+)/gi)].map((m) => m[1]!.toLowerCase());
}

/** Texto plano de un fragmento HTML (para `text` de los datos). */
function textoDe(html: string): string {
  return unescapeHtml(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function unescapeHtml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** Id de ancla estable para un encabezado (minúsculas, sin acentos, guiones). */
export function slugMd(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

/** Formato inline: código, imagen, enlace, tachado, negrita, cursiva (en ese orden,
 *  para que el contenido de un código no se reprocese como otro formato). */
function inline(text: string): string {
  let s = escapeHtml(text);
  const tokens: string[] = [];
  const guardar = (html: string) => { tokens.push(html); return `\u0000T${tokens.length - 1}\u0000`; };
  // `code` llega escapado: sirve tal cual como atributo y como texto de respaldo.
  s = s.replace(/`([^`]+)`/g, (_m: string, code: string) => guardar(aplicar('code', { tipo: 'code', code: unescapeHtml(code) },
    () => (componentesActivos
      ? `<iswc-code class="md-code md-code--inline" mode="inline" theme="brand-mono" readonly value="${code}">${code}</iswc-code>`
      : `<code class="md-iswc-code" data-mode="inline">${code}</code>`),
    conKit('iswc-code'))));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m: string, alt: string, src: string, title = '') => guardar(aplicar('image',
    { tipo: 'image', src: unescapeHtml(src), alt: unescapeHtml(alt), title: unescapeHtml(title) },
    () => {
      const img = `<img alt="${alt}" src="${src}"${title ? ` title="${title}"` : ''} loading="lazy">`;
      return componentesActivos
        ? `<iswc-theme-img class="md-img" src-dark="${src}" src-light="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} fit="contain" loading="lazy">${img}</iswc-theme-img>`
        : img;
    },
    conKit('iswc-theme-img'))));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m: string, label: string, href: string, title = '') => {
    const external = /^https?:/i.test(unescapeHtml(href));
    return guardar(aplicar('link', { tipo: 'link', href: unescapeHtml(href), text: textoDe(label), html: label, title: unescapeHtml(title), external },
      () => `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`));
  });
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/(?<![\w])_([^_]+)_(?![\w])/g, '<em>$1</em>');
  // Los tokens pueden anidarse (imagen dentro de un enlace): se restauran hasta agotar.
  for (let n = 0; n < 4 && s.includes('\u0000T'); n += 1) {
    s = s.replace(/\u0000T(\d+)\u0000/g, (_m: string, i: string) => tokens[Number(i)]);
  }
  return s;
}

/** Une líneas de un párrafo: salto simple → `<br>`; "  \n" también hard-break. */
function joinParagraphLines(lines: string[]): string {
  let out = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    out += inline(line.replace(/ {2}$/, '').trimEnd());
    if (i < lines.length - 1) out += '<br>';
  }
  return out;
}

/** Celdas de una fila GFM: `\|` y los `|` dentro de `código` no separan columnas. */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const celdas: string[] = [];
  let actual = '';
  let enCodigo = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { actual += '|'; i += 1; continue; }
    if (c === '`') enCodigo = !enCodigo;
    if (c === '|' && !enCodigo) { celdas.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  celdas.push(actual.trim());
  return celdas;
}

function parseAligns(sepLine: string): string[] {
  return splitTableRow(sepLine).map((c: string) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });
}

function renderTable(header: string[], aligns: string[], rows: string[][]): string {
  const headerHtml = header.map((c) => inline(c));
  const rowsHtml = rows.map((r) => r.map((c) => inline(c)));
  return aplicar('table', { tipo: 'table', header, rows, aligns, headerHtml, rowsHtml }, () => {
    // Columnas de prosa (alguna celda larga): piden más ancho mínimo para no partirse
    // en una palabra por línea en pantallas angostas; la tabla gana scroll horizontal.
    const prosa = new Set(header.map((_, idx) => idx).filter((idx) => rows.some((r) => (r[idx] ?? '').length > 60)));
    const cell = (tag: string, html: string, idx: number): string => {
      const align = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : '';
      const clase = prosa.has(idx) ? ' class="md-col-prosa"' : '';
      return `<${tag}${clase}${align}>${html}</${tag}>`;
    };
    const thead = `<tr>${headerHtml.map((c, idx) => cell('th', c, idx)).join('')}</tr>`;
    const tbody = rowsHtml.map((r) => `<tr>${r.map((c, idx) => cell('td', c, idx)).join('')}</tr>`).join('');
    const tabla = `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    return componentesActivos
      ? `<iswc-scroller class="md-table-wrap" label="Tabla" without-scroll-buttons>${tabla}</iswc-scroller>`
      : `<div class="md-table-wrap">${tabla}</div>`;
  }, conKit('iswc-scroller'));
}

function parseList(lines: string[], start: number): { html: string; next: number } {
  const ordered = OL_ITEM.test(lines[start]);
  const itemRe = ordered ? OL_ITEM : UL_ITEM;
  const inicio = ordered ? Number((lines[start].match(/^\s*(\d+)/) ?? [])[1] ?? 1) : 1;
  const items: ItemListaMd[] = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(itemRe);
    if (!m) break;
    const tarea = m[1].trim().match(/^\[([ xX])\]\s+(.*)$/);
    const html = inline(tarea ? tarea[2] : m[1].trim());
    items.push({ html, text: textoDe(html), checked: tarea ? tarea[1].toLowerCase() === 'x' : null });
    i += 1;
  }
  const tareas = items.some((it) => it.checked !== null);
  const html = aplicar('list', { tipo: 'list', ordered, start: inicio, items }, () => {
    const tag = ordered ? 'ol' : 'ul';
    const startAttr = ordered && inicio !== 1 ? ` start="${inicio}"` : '';
    // La casilla lleva el texto como etiqueta: sigue siendo texto seleccionable del documento.
    const tarea = (it: ItemListaMd) => (componentesActivos
      ? `<li class="md-task"><iswc-checkbox class="md-check" readonly${it.checked ? ' checked' : ''}>${it.html}</iswc-checkbox></li>`
      : `<li class="md-task"><input type="checkbox" disabled${it.checked ? ' checked' : ''}> ${it.html}</li>`);
    const li = (it: ItemListaMd) => (it.checked === null ? `<li>${it.html}</li>` : tarea(it));
    return `<${tag}${startAttr}${tareas ? ' class="md-task-list"' : ''}>${items.map(li).join('')}</${tag}>`;
  }, tareas ? conKit('iswc-checkbox') : undefined);
  return { html, next: i };
}

function renderFence(langRaw: string, body: string): string {
  const lang = String(langRaw || '').trim();
  const iswcTag = resolveIswcFenceTag(lang);
  if (iswcTag) {
    const json = body.trim();
    return aplicar('diagram', { tipo: 'diagram', tag: iswcTag, json },
      () => `<${iswcTag} class="md-iswc-diagram" color="viewer"><script type="application/json">${escapeJsonForScript(json)}</script></${iswcTag}>`,
      () => [iswcTag]);
  }
  return aplicar('codeblock', { tipo: 'codeblock', lang, code: body }, () => {
    const safeLang = escapeHtml(lang || 'plaintext');
    const texto = escapeHtml(body);
    const pre = `<pre class="md-iswc-code" data-lang="${safeLang}" data-mode="block"><code>${texto}</code></pre>`;
    if (!componentesActivos) return pre;
    // El <pre> queda dentro como respaldo legible hasta que iswc-code se define.
    const langAttr = lang ? ` lang="${safeLang}"` : '';
    return `<div class="md-codeblock"><iswc-code class="md-code" readonly compact wrap line-numbers="false"${langAttr} value="${texto}">${pre}</iswc-code>`
      + `<iswc-copy-button class="md-copy" value="${texto}" copy-label="Copiar código" success-label="Copiado"></iswc-copy-button></div>`;
  }, conKit('iswc-code', 'iswc-copy-button'));
}

const CALLOUT = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i;
const KIND_CALLOUT: Record<string, DatosCalloutMd['kind']> = { note: 'note', tip: 'tip', important: 'important', warning: 'warning', caution: 'caution' };
const TITULO_CALLOUT: Record<DatosCalloutMd['kind'], string> = { note: 'Nota', tip: 'Consejo', important: 'Importante', warning: 'Advertencia', caution: 'Precaución' };
/** Color e ícono de `iswc-callout` por tipo de aviso. */
const KIT_CALLOUT: Record<DatosCalloutMd['kind'], { color: string; icon: string }> = {
  note: { color: 'brand', icon: 'mdi:information-outline' },
  tip: { color: 'success', icon: 'mdi:lightbulb-on-outline' },
  important: { color: 'brand', icon: 'mdi:alert-decagram-outline' },
  warning: { color: 'warning', icon: 'mdi:alert-outline' },
  caution: { color: 'danger', icon: 'mdi:alert-octagon-outline' },
};

function renderBlockquote(buf: string[]): string {
  const aviso = buf[0]?.match(CALLOUT);
  if (aviso) {
    const kind = KIND_CALLOUT[aviso[1].toLowerCase()] ?? 'note';
    const title = aviso[2].trim() || TITULO_CALLOUT[kind];
    const html = convertir(buf.slice(1).join('\n'));
    return aplicar('callout', { tipo: 'callout', kind, title, text: textoDe(html), html }, () => {
      const cuerpo = `<p class="md-callout__title">${escapeHtml(title)}</p>${html}`;
      if (!componentesActivos) return `<div class="md-callout md-callout--${kind}" role="note">${cuerpo}</div>`;
      const { color, icon } = KIT_CALLOUT[kind];
      return `<iswc-callout class="md-callout md-callout--${kind}" color="${color}" variant="accent" icon="${icon}" role="note">${cuerpo}</iswc-callout>`;
    }, conKit('iswc-callout'));
  }
  const html = convertir(buf.join('\n'));
  return aplicar('blockquote', { tipo: 'blockquote', text: textoDe(html), html }, () => `<blockquote>${html}</blockquote>`);
}

/**
 * Bloque de tabs de imágenes que abre el `---` de la línea `i`: hasta el siguiente `---`, solo líneas
 * de imagen (y vacías), al menos dos. Devuelve las pestañas y la línea que sigue al `---` de cierre.
 */
function tabsDeImagenes(lines: string[], i: number): { tabs: TabImagenMd[]; next: number } | null {
  const tabs: TabImagenMd[] = [];
  for (let k = i + 1; k < lines.length; k++) {
    const l = lines[k];
    if (!l.trim()) continue;
    if (HR_LINE.test(l.trim())) return tabs.length >= 2 ? { tabs, next: k + 1 } : null;
    const m = l.match(IMAGE_LINE);
    if (!m) return null;
    tabs.push({ label: m[1].trim() || `Imagen ${tabs.length + 1}`, src: m[2], title: m[3] ?? '', html: inline(l.trim()) });
  }
  return null;
}

let tabsN = 0;

function renderTabs(tabs: TabImagenMd[]): string {
  return aplicar('tabs', { tipo: 'tabs', tabs }, () => {
    if (!componentesActivos) {
      return `<div class="md-tabs">${tabs.map((t) => `<figure class="md-tabs__panel"><figcaption>${escapeHtml(t.label)}</figcaption>${t.html}</figure>`).join('')}</div>`;
    }
    const base = `md-tab-${++tabsN}`;
    const nav = tabs.map((t, k) => `<iswc-tab slot="nav" panel="${base}-${k}">${escapeHtml(t.label)}</iswc-tab>`).join('');
    const panels = tabs.map((t, k) => `<iswc-tab-panel name="${base}-${k}">${t.html}</iswc-tab-panel>`).join('');
    return `<iswc-tab-group class="md-tabs" active="${base}-0">${nav}${panels}</iswc-tab-group>`;
  }, conKit('iswc-tab-group', 'iswc-tab', 'iswc-tab-panel'));
}

/**
 * Convierte markdown (+ HTML embebido) a HTML. Con `renderers`, cada elemento
 * pasa por su hook (ver `md-lite.schemas.ts`).
 */
export function mdToHtml(src: string, opts: OpcionesMdLite = {}): string {
  const previos = { renderers: renderersActivos, componentes: componentesActivos, tags: tagsActivos };
  renderersActivos = opts.renderers ?? {};
  componentesActivos = opts.componentes !== false;
  tagsActivos = opts.tags ?? null;
  try {
    return convertir(src);
  } finally {
    renderersActivos = previos.renderers;
    componentesActivos = previos.componentes;
    tagsActivos = previos.tags;
  }
}

function convertir(src: string): string {
  const text = String(src ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) return '';
  const lines = text.split('\n');
  const out: string[] = [];
  const idsUsados = new Map<string, number>();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    if (RAW_HTML_LINE.test(line)) {
      const { html, next } = consumeRawHtmlBlock(lines, i);
      out.push(aplicar('html', { tipo: 'html', html }, () => html, () => tagsEnHtml(html)));
      i = next;
      continue;
    }

    const fenceOpen = line.match(FENCE_OPEN);
    if (fenceOpen || FENCE_LINE.test(line)) {
      const lang = fenceOpen ? (fenceOpen[1] || '') : '';
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_LINE.test(lines[i])) { buf.push(lines[i]); i += 1; }
      i += 1;
      out.push(renderFence(lang, buf.join('\n')));
      continue;
    }

    const heading = line.match(ATX_HEADING);
    if (heading) {
      const level = NIVELES[heading[1].length - 1] ?? 6;
      const html = inline(heading[2].trim());
      const text = textoDe(html);
      const base = slugMd(text) || `seccion-${out.length + 1}`;
      const n = idsUsados.get(base) ?? 0;
      idsUsados.set(base, n + 1);
      const id = n ? `${base}-${n + 1}` : base;
      out.push(aplicar('heading', { tipo: 'heading', level, text, html, id }, () => `<h${level} id="${escapeHtml(id)}">${html}</h${level}>`));
      i += 1;
      continue;
    }

    if (HR_LINE.test(line.trim())) {
      const tabs = tabsDeImagenes(lines, i);
      if (tabs) {
        out.push(renderTabs(tabs.tabs));
        i = tabs.next;
        continue;
      }
      out.push(aplicar('hr', { tipo: 'hr' },
        () => (componentesActivos ? '<iswc-divider class="md-hr" color="brand"></iswc-divider>' : '<hr>'),
        conKit('iswc-divider')));
      i += 1;
      continue;
    }

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
      out.push(renderBlockquote(buf));
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
      const html = joinParagraphLines(buf);
      out.push(aplicar('paragraph', { tipo: 'paragraph', text: textoDe(html), html }, () => `<p>${html}</p>`));
    }
  }

  return out.join('\n');
}

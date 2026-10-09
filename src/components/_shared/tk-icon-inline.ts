/**
 * Iconos inline en MD/HTML TK. El SVG lo resuelve el sistema propio de
 * iconos (_shared/icon-loader.js); no hay dependencia de terceros.
 *
 * Sintaxis del token:
 * - {{mdi:icon-name}} o alias {{thumb-up}}
 * - {{icon: {icon: "mdi:account", hue: 239}}}   (canonica)
 * - {{iconify: {...}}}                          (alias legacy, aun soportado)
 * - {{"iswc-icon": {icon: "mdi:key", color: "#e11"}}}  (attrs del componente)
 *
 * Se procesa en segmentos de texto plano (tk-rich-text / inlineMd).
 */

import { normalizeTkHue, tkHueToCss, tkHueToHex } from './tk-hue.js';
import { resolveIconRaw } from './icon-loader.js';
import type { ResolvedIconToken, SvgIconBadgeOpts, SvgIconGroupOpts, IconInlineOpts, IconHtmlRender, IconRun, LeadingIcon } from "./tk-icon-inline.schemas.js";

/** Simple {{ … }} (sin objeto sugar) — compat tests / búsqueda rápida. */
export const TK_ICON_TOKEN_RE = /\{\{([^}#][^}]*)\}\}/g;

const ALIASES = {
  like: 'mdi:thumb-up',
  'thumb-up': 'mdi:thumb-up',
  'thumbs-up': 'mdi:thumb-up',
  dislike: 'mdi:thumb-down',
  'thumb-down': 'mdi:thumb-down',
  'thumbs-down': 'mdi:thumb-down',
};

const ICON_ID_RE = /^[a-z0-9][\w.-]*(?::|\/)[\w./-]+$/i;
// Sugar del token: `{{icon: {...}}}` es la forma canonica. `{{iconify: ...}}`
// se mantiene como alias por compatibilidad con specs ya escritos.
const SUGAR_PREFIXES = ['icon:', 'iconify:'];
/** Devuelve el prefijo sugar con el que arranca el token, o null. */
function sugarPrefixOf(token: string) {
  const lower = token.toLowerCase();
  return SUGAR_PREFIXES.find((p) => lower.startsWith(p)) || null;
}

export function iconAssetPath(iconId: string | null | undefined): string {
  const id = String(iconId ?? '').trim();
  if (id.includes(':')) return id.replace(':', '/');
  if (id.includes('/')) return id;
  return `mdi/${id}`;
}

/** Resuelve token interno simple {{…}} a id Iconify canónico (mdi:foo). */
export function resolveIconId(raw: string | null | undefined): string | null {
  const token = String(raw ?? '').trim();
  if (!token) return null;
  const alias = ALIASES[token.toLowerCase() as keyof typeof ALIASES];
  if (alias) return alias;
  if (ICON_ID_RE.test(token)) return token;
  return null;
}

/** Objeto JSON o estilo JS `{icon: mdi:key, color: #e11}`. Valores sueltos admiten `:`. */
function parseLooseObject(objRaw: string): Record<string, string> | null {
  const s = objRaw.trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;
  try {
    const parsed: unknown = JSON.parse(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v == null) continue;
        out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
      return Object.keys(out).length ? out : null;
    }
  } catch { /* sigue el lector suelto */ }
  const body = s.slice(1, -1);
  const out: Record<string, string> = {};
  let i = 0;
  const skip = () => { while (i < body.length && /\s/.test(body[i]!)) i++; };
  while (i < body.length) {
    skip();
    if (i >= body.length) break;
    if (body[i] === ',') { i++; continue; }
    let key = '';
    const q0 = body[i];
    if (q0 === '"' || q0 === "'") {
      i++;
      while (i < body.length && body[i] !== q0) key += body[i++];
      i++;
    } else {
      while (i < body.length && body[i] !== ':' && !/\s/.test(body[i]!)) key += body[i++];
    }
    skip();
    if (body[i] !== ':') break;
    i++;
    skip();
    let val = '';
    const q1 = body[i];
    if (q1 === '"' || q1 === "'") {
      i++;
      while (i < body.length && body[i] !== q1) val += body[i++];
      i++;
    } else if (q1 === '{') {
      let depth = 0;
      const start = i;
      for (; i < body.length; i++) {
        if (body[i] === '{') depth++;
        else if (body[i] === '}') { depth--; if (depth === 0) { i++; break; } }
      }
      val = body.slice(start, i);
    } else {
      while (i < body.length && body[i] !== ',' && body[i] !== '}') val += body[i++];
      val = val.trim();
    }
    if (key) out[key] = val;
  }
  return Object.keys(out).length ? out : null;
}

function tokenFromAttrs(obj: Record<string, string>): ResolvedIconToken | null {
  const name = obj.name?.trim() ?? '';
  const iconRaw = obj.icon?.trim()
    || (name ? (name.includes(':') || name.includes('/') ? name : `${obj.library || 'mdi'}:${name}`) : '');
  const iconId = resolveIconId(iconRaw);
  if (!iconId) return null;
  const hueNum = obj.hue != null && obj.hue !== '' ? Number(obj.hue) : NaN;
  const hue = Number.isFinite(hueNum) ? normalizeTkHue(hueNum) ?? undefined : undefined;
  const sizeRaw = obj.size ?? '';
  const sizeNum = sizeRaw && !/em|%|rem/i.test(sizeRaw) ? parseFloat(sizeRaw) : NaN;
  const size = Number.isFinite(sizeNum) && sizeNum > 0 ? sizeNum : undefined;
  const color = obj.color?.trim() || undefined;
  return { iconId, hue, size, color, attrs: { ...obj, icon: iconId } };
}

/** Resuelve contenido interno de {{…}} (id simple, sugar o componente iswc-icon). */
export function resolveIconToken(raw: string | null | undefined): ResolvedIconToken | null {
  const token = String(raw ?? '').trim();
  if (!token) return null;

  const comp = /^(?:"iswc-icon"|'iswc-icon'|iswc-icon)\s*:\s*/i.exec(token);
  if (comp) {
    const obj = parseLooseObject(token.slice(comp[0].length).trim());
    return obj ? tokenFromAttrs(obj) : null;
  }

  const sugar = sugarPrefixOf(token);
  if (sugar) {
    const obj = parseLooseObject(token.slice(sugar.length).trim());
    return obj ? tokenFromAttrs(obj) : null;
  }

  const iconId = resolveIconId(token);
  return iconId ? { iconId, attrs: { icon: iconId } } : null;
}

/** Etiqueta con icono embebido vía sugar JSON (diagramas de secuencia). */
export function hasIconJsonSugar(raw: string) {
  const text = String(raw ?? '');
  return text.includes('{{icon:') || text.includes('{{iconify:') || /\{\{\s*["']?iswc-icon["']?\s*:/i.test(text);
}

function scanIconTemplateTokens(text: string, onToken: (start: number, end: number, inner: string) => void): void {
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{{', i);
    if (open === -1) break;

    const tail = text.slice(open);
    const sugarHead = /^\{\{\s*(?:"iswc-icon"|'iswc-icon'|iswc-icon|icon|iconify)\s*:\s*\{/i.exec(tail);
    if (sugarHead) {
      const jsonStart = open + sugarHead[0].length - 1;
      if (text[jsonStart] !== '{') {
        i = open + 2;
        continue;
      }
      let depth = 0;
      let j = jsonStart;
      for (; j < text.length; j++) {
        const c = text[j];
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            j++;
            if (text.startsWith('}}', j)) {
              onToken(open, j + 2, text.slice(open + 2, j));
              i = j + 2;
              break;
            }
            i = open + 2;
            break;
          }
        }
      }
      if (j >= text.length) break;
      continue;
    }

    const close = text.indexOf('}}', open + 2);
    if (close === -1) break;
    onToken(open, close + 2, text.slice(open + 2, close));
    i = close + 2;
  }
}

/**
 * Inserta un icono como <svg> anidado dentro de un SVG (diagramas).
 *
 * Devuelve un <g> vacio que se rellena cuando el SVG del icono llega desde
 * el sistema propio de iconos (assets/icons -> dist/assets/icons). Antes
 * esto era un <image href="https://api.iconify.design/...?color=">: dependia
 * de un tercero en runtime y no se podia teñir sin query params.
 *
 * @param {string} iconId  "mdi:home"
 * @param {{x:number, y:number, size?:number, hue?:number}} opts
 * @returns {SVGGElement}
 */
/** Icono de reemplazo cuando el pedido no existe en los assets del kit. */
const ICONO_FALLBACK = 'mdi:shape-outline';

export function svgIconGroup(iconId: string, opts: SvgIconGroupOpts = {}): SVGGElement {
  const { x = 0, y = 0, size = 16, hue, color, fallback = ICONO_FALLBACK } = opts;
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'tk-svg-icon');
  g.setAttribute('aria-hidden', 'true');
  const tint = color || (hue != null ? tkHueToHex(hue as number) : undefined);
  if (tint) g.setAttribute('fill', tint);

  const path = iconAssetPath(iconId);
  const sep = path.indexOf('/');
  if (sep <= 0) return g;
  const prefix = path.slice(0, sep);
  const name = path.slice(sep + 1);

  // Un icono que no existe dejaba el avatar VACÍO — un hueco que se lee como
  // error, no como ausencia. Se cae al genérico antes de rendirse.
  const conFallback = async (): Promise<string | null> => {
    const raw = await resolveIconRaw(prefix, name, undefined);
    if (raw) return raw;
    if (!fallback || fallback === iconId) return null;
    const alt = iconAssetPath(fallback);
    const corte = alt.indexOf('/');
    if (corte <= 0) return null;
    return resolveIconRaw(alt.slice(0, corte), alt.slice(corte + 1), undefined);
  };

  conFallback().then((raw) => {
    if (!raw || !g.isConnected) return;
    const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
    const svg = doc.querySelector<HTMLElement>('svg');
    if (!svg) return;
    const inner = document.importNode(svg, true);
    inner.setAttribute('x', String(x));
    inner.setAttribute('y', String(y));
    inner.setAttribute('width', String(size));
    inner.setAttribute('height', String(size));
    // El fill del <g> gobierna: los paths con color propio se neutralizan.
    if (tint) {
      for (const el of inner.querySelectorAll<HTMLElement>('[fill]')) {
        if (el.getAttribute('fill') !== 'none') el.removeAttribute('fill');
      }
    }
    g.appendChild(inner);
  }).catch(() => { /* icono inexistente: el diagrama sigue legible sin el */ });

  return g;
}

/**
 * Icono con fondo (insignia). Mismo contrato para todos los diagramas: el
 * fondo puede ser `circle` | `rect` | `round` | `none`, con color propio o
 * el del icono, sólido (`bgAlpha: 1`) o translúcido (default 0.18), y
 * `size` escala fondo e icono juntos.
 */
export function svgIconBadge(iconId: string, opts: SvgIconBadgeOpts): SVGGElement {
  const { cx, cy, size = 18, color, hue, bg = 'circle', bgColor, bgAlpha = 0.18, fallback } = opts;
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'tk-svg-badge');
  const tint = color || (hue != null ? tkHueToHex(hue as number) : undefined) || 'currentColor';
  const fondo = bgColor || tint;
  if (bg !== 'none') {
    const shape = bg === 'circle'
      ? document.createElementNS(NS, 'circle')
      : document.createElementNS(NS, 'rect');
    if (bg === 'circle') {
      shape.setAttribute('cx', String(cx));
      shape.setAttribute('cy', String(cy));
      shape.setAttribute('r', String(size / 2));
    } else {
      shape.setAttribute('x', String(cx - size / 2));
      shape.setAttribute('y', String(cy - size / 2));
      shape.setAttribute('width', String(size));
      shape.setAttribute('height', String(size));
      if (bg === 'round') shape.setAttribute('rx', String(Math.round(size * 0.22)));
    }
    shape.setAttribute('fill', fondo);
    shape.setAttribute('fill-opacity', String(bgAlpha));
    g.appendChild(shape);
  }
  const inner = Math.round(size * 0.62);
  g.appendChild(svgIconGroup(iconId, { x: cx - inner / 2, y: cy - inner / 2, size: inner, color: tint, fallback }));
  return g;
}

function escAttr(v: string): string {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Cada key del objeto queda como atributo. color y size tambien van al style para que pinten. */
export function iconAttrsHtml(iconId: string, opts: IconInlineOpts = {}): string {
  const attrs: Record<string, string> = { ...(opts.attrs ?? {}) };
  attrs.icon = iconId;
  if (!attrs.class) attrs.class = opts.className ?? 'tk-inline-icon';
  if (!attrs['aria-hidden'] && !attrs['aria-label']) attrs['aria-hidden'] = 'true';
  const size = String(opts.size ?? attrs.size ?? '1.1em');
  const color = attrs.color || (opts.hue != null ? tkHueToCss(opts.hue) : undefined);
  const style = [`font-size:${size}`];
  if (color) style.push(`color:${color}`);
  if (attrs.style) style.push(attrs.style);
  attrs.style = style.join(';');
  return Object.entries(attrs)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escAttr(v)}"`)
    .join(' ');
}

/** HTML web — `<iswc-icon key="value">`, la unica API de iconos del kit. */
export function iconInlineHtmlWeb(iconId: string, opts: IconInlineOpts = {}): IconHtmlRender {
  return `<iswc-icon ${iconAttrsHtml(iconId, opts)}></iswc-icon>`;
}

/**
 * HTML email-safe — `<img>` contra la API de Iconify: el correo se abre fuera de la app (sin sus
 * `assets/`) y la API sirve cualquier set. Antes apuntaba al repo por `@main` (ref mutable y sin los
 * sets que ya no viajan en el kit).
 */
export function iconInlineHtmlEmail(iconId: string, opts: IconInlineOpts = {}): IconHtmlRender {
  const px = typeof opts.size === 'number' ? opts.size : 16;
  const path = iconAssetPath(iconId);
  const url = `https://api.iconify.design/${path}.svg`;
  return `<img src="${url}" width="${px}" height="${px}" alt="" class="tk-inline-icon-img" style="display:inline-block;vertical-align:-0.2em;border:0;"/>`;
}

function replaceIconTokens(
  raw: string,
  transformPlain: (text: string) => string,
  renderIcon: (tok: ResolvedIconToken) => string,
): string {
  if (!raw.includes('{{')) return transformPlain(raw);
  let out = '';
  let last = 0;
  scanIconTemplateTokens(raw, (start: number, end: number, inner: string) => {
    if (start > last) out += transformPlain(raw.slice(last, start));
    const tok = resolveIconToken(inner);
    out += tok ? renderIcon(tok) : transformPlain(raw.slice(start, end));
    last = end;
  });
  if (last < raw.length) out += transformPlain(raw.slice(last));
  return out;
}

export function replaceIconTokensWeb(raw: string, transformPlain: (t: string) => string, opts: IconInlineOpts): string {
  return replaceIconTokens(raw, transformPlain, (tok) =>
    iconInlineHtmlWeb(tok.iconId, { ...opts, hue: tok.hue ?? opts?.hue, size: tok.size ?? opts?.size, attrs: tok.attrs }),
  );
}

export function replaceIconTokensEmail(raw: string, transformPlain: (t: string) => string, opts: IconInlineOpts): string {
  return replaceIconTokens(raw, transformPlain, (tok) =>
    iconInlineHtmlEmail(tok.iconId, { ...opts, hue: tok.hue ?? opts?.hue, size: tok.size ?? opts?.size }),
  );
}

/** Parte el texto en tramos planos y tokens de icono resueltos. */
export function splitIconRuns(raw: string | null | undefined): IconRun[] {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return [{ kind: 'text', text }];
  const runs: IconRun[] = [];
  let last = 0;
  let any = false;
  scanIconTemplateTokens(text, (start, end, inner) => {
    const tok = resolveIconToken(inner);
    if (!tok) return;
    if (start > last) runs.push({ kind: 'text', text: text.slice(last, start) });
    runs.push({ kind: 'icon', token: tok });
    last = end;
    any = true;
  });
  if (!any) return [{ kind: 'text', text }];
  if (last < text.length) runs.push({ kind: 'text', text: text.slice(last) });
  return runs;
}

/** Texto plano — quita markup de iconos para tooltips/búsqueda. */
export function stripIconTokensPlain(raw: string | null | undefined): string {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return text;
  let out = '';
  let last = 0;
  scanIconTemplateTokens(text, (start: number, end: number, inner: string) => {
    if (start > last) out += text.slice(last, start);
    out += resolveIconToken(inner) ? ' ' : text.slice(start, end);
    last = end;
  });
  if (last < text.length) out += text.slice(last);
  return out;
}

/** Primer token de icono al inicio del texto (p. ej. label de actor). */

export function extractLeadingIconToken(raw: string | null | undefined): LeadingIcon | null {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return null;
  const offset = (text.match(/^\s*/)?.[0].length) ?? 0;
  let result: LeadingIcon | null = null;
  let done = false;
  scanIconTemplateTokens(text, (start: number, end: number, inner: string) => {
    if (done) return;
    done = true;
    if (start !== offset) return;
    const tok = resolveIconToken(inner);
    if (tok) {
      result = { iconId: tok.iconId, hue: tok.hue, rest: text.slice(end).trim() };
      if (tok.color) result.color = tok.color;
      if (tok.size != null) result.size = tok.size;
    }
  });
  return result;
}

export function countIconTokens(raw: string | null | undefined): number {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return 0;
  let n = 0;
  scanIconTemplateTokens(text, (_s: number, _e: number, inner: string) => {
    if (resolveIconToken(inner)) n++;
  });
  return n;
}

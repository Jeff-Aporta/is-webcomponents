/**
 * Iconos inline en MD/HTML TK. El SVG lo resuelve el sistema propio de
 * iconos (_shared/icon-loader.js); no hay dependencia de terceros.
 *
 * Sintaxis del token:
 * - {{mdi:icon-name}} o alias {{thumb-up}}
 * - {{icon: {icon: "mdi:account", hue: 239}}}   (canonica)
 * - {{iconify: {...}}}                          (alias legacy, aun soportado)
 *
 * Se procesa en segmentos de texto plano (tk-rich-text / inlineMd).
 */

import { normalizeTkHue, tkHueToCss, tkHueToHex } from './tk-hue.js';
import { resolveIconRaw } from './icon-loader.js';

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

function parseSugarObject(objRaw: string): { icon?: string; hue?: number } | null {
  const s = objRaw.trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;
  try {
    const parsed: unknown = JSON.parse(s);
    if (parsed && typeof parsed === 'object') {
      const p = parsed as { icon?: unknown; hue?: unknown };
      const hueNum = typeof p.hue === 'number' ? p.hue : Number(p.hue);
      return {
        icon: p.icon != null ? String(p.icon) : undefined,
        hue: Number.isFinite(hueNum) ? normalizeTkHue(hueNum) ?? undefined : undefined,
      };
    }
  } catch {
    // JS-like: {icon: "mdi:foo", hue: 239}
  }
  const iconM = /\bicon\s*:\s*(?:"([^"]*)"|'([^']*)')/i.exec(s);
  const hueM = /\bhue\s*:\s*(\d+(?:\.\d+)?)/i.exec(s);
  const icon = iconM?.[1] ?? iconM?.[2];
  const hueNum = hueM?.[1] != null ? Number(hueM[1]) : NaN;
  const hue = Number.isFinite(hueNum) ? normalizeTkHue(hueNum) ?? undefined : undefined;
  if (!icon) return null;
  return { icon, hue };
}

export type ResolvedIconToken = { iconId: string; hue?: number };

/** Resuelve contenido interno de {{…}} (simple o sugar con objeto). */
export function resolveIconToken(raw: string | null | undefined): ResolvedIconToken | null {
  const token = String(raw ?? '').trim();
  if (!token) return null;

  const sugar = sugarPrefixOf(token);
  if (sugar) {
    const parsed = parseSugarObject(token.slice(sugar.length).trim());
    if (!parsed?.icon) return null;
    const iconId = resolveIconId(parsed.icon);
    if (!iconId) return null;
    return { iconId, hue: parsed.hue };
  }

  const iconId = resolveIconId(token);
  return iconId ? { iconId } : null;
}

/** Etiqueta con icono embebido vía sugar JSON (diagramas de secuencia). */
export function hasIconJsonSugar(raw: string) {
  const text = String(raw ?? '');
  return text.includes('{{icon:') || text.includes('{{iconify:');
}

function scanIconTemplateTokens(text: string, onToken: (start: number, end: number, inner: string) => void): void {
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{{', i);
    if (open === -1) break;

    const tail = text.slice(open);
    const sugarHead = /^\{\{(?:icon|iconify):\s*/i.exec(tail);
    if (sugarHead) {
      const jsonStart = open + sugarHead[0].length;
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

export type SvgIconGroupOpts = {
  x?: number;
  y?: number;
  size?: number;
  hue?: number;
  fallback?: string;
};

export function svgIconGroup(iconId: string, opts: SvgIconGroupOpts = {}): SVGGElement {
  const { x = 0, y = 0, size = 16, hue, fallback = ICONO_FALLBACK } = opts;
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'tk-svg-icon');
  g.setAttribute('aria-hidden', 'true');
  if (hue != null) {
    const fill = tkHueToHex(hue as number);
    if (fill) g.setAttribute('fill', fill);
  }

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
    if (hue != null) {
      for (const el of inner.querySelectorAll<HTMLElement>('[fill]')) {
        if (el.getAttribute('fill') !== 'none') el.removeAttribute('fill');
      }
    }
    g.appendChild(inner);
  }).catch(() => { /* icono inexistente: el diagrama sigue legible sin el */ });

  return g;
}

export type IconInlineOpts = {
  size?: string | number;
  className?: string;
  hue?: number;
};

export type IconHtmlRender = string;

/** HTML web — `<is-icon>`, la unica API de iconos del kit. */
export function iconInlineHtmlWeb(iconId: string, opts: IconInlineOpts = {}): IconHtmlRender {
  const size = opts.size ?? '1.1em';
  const cls = opts.className ?? 'tk-inline-icon';
  const css = opts.hue != null ? tkHueToCss(opts.hue) : undefined;
  const style = `font-size:${size}${css ? `;color:${css}` : ''}`;
  return `<is-icon class="${cls}" icon="${iconId}" style="${style}" aria-hidden="true"></is-icon>`;
}

/** HTML email-safe — img contra el CDN publico del repo (no api.iconify). */
export function iconInlineHtmlEmail(iconId: string, opts: IconInlineOpts = {}): IconHtmlRender {
  const px = typeof opts.size === 'number' ? opts.size : 16;
  const path = iconAssetPath(iconId);
  const url = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/assets/icons/${path}.svg`;
  return `<img src="${url}" width="${px}" height="${px}" alt="" class="tk-inline-icon-img" style="display:inline-block;vertical-align:-0.2em;border:0;"/>`;
}

function replaceIconTokens(
  raw: string,
  transformPlain: (text: string) => string,
  renderIcon: (iconId: string, hue: number | undefined) => string,
): string {
  if (!raw.includes('{{')) return transformPlain(raw);
  let out = '';
  let last = 0;
  scanIconTemplateTokens(raw, (start: number, end: number, inner: string) => {
    if (start > last) out += transformPlain(raw.slice(last, start));
    const tok = resolveIconToken(inner);
    out += tok ? renderIcon(tok.iconId, tok.hue) : transformPlain(raw.slice(start, end));
    last = end;
  });
  if (last < raw.length) out += transformPlain(raw.slice(last));
  return out;
}

export function replaceIconTokensWeb(raw: string, transformPlain: (t: string) => string, opts: IconInlineOpts): string {
  return replaceIconTokens(raw, transformPlain, (id, hue) =>
    iconInlineHtmlWeb(id, { ...opts, hue: hue ?? opts?.hue }),
  );
}

export function replaceIconTokensEmail(raw: string, transformPlain: (t: string) => string, opts: IconInlineOpts): string {
  return replaceIconTokens(raw, transformPlain, (id, hue) =>
    iconInlineHtmlEmail(id, { ...opts, hue: hue ?? opts?.hue }),
  );
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
export type LeadingIcon = { iconId: string; hue: number | undefined; rest: string };

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
    if (tok) result = { iconId: tok.iconId, hue: tok.hue, rest: text.slice(end).trim() };
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

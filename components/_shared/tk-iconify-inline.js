/**
 * Iconos Iconify inline en MD/HTML TK:
 * - {{mdi:icon-name}} o alias {{thumb-up}}
 * - {{iconify: {icon: "mdi:account", hue: 239}}}
 * Se procesa en segmentos de texto plano (tk-rich-text / inlineMd).
 */

import { normalizeTkHue, tkHueToCss, tkHueToHex } from './tk-hue.js';

/** Simple {{ … }} (sin objeto iconify) — compat tests / búsqueda rápida. */
export const TK_ICONIFY_TOKEN_RE = /\{\{([^}#][^}]*)\}\}/g;

const ALIASES = {
  like: 'mdi:thumb-up',
  'thumb-up': 'mdi:thumb-up',
  'thumbs-up': 'mdi:thumb-up',
  dislike: 'mdi:thumb-down',
  'thumb-down': 'mdi:thumb-down',
  'thumbs-down': 'mdi:thumb-down',
};

const ICON_ID_RE = /^[a-z0-9][\w.-]*(?::|\/)[\w./-]+$/i;
const ICONIFY_SUGAR_PREFIX = 'iconify:';

export function iconifyApiPath(iconId) {
  const id = String(iconId ?? '').trim();
  if (id.includes(':')) return id.replace(':', '/');
  if (id.includes('/')) return id;
  return `mdi/${id}`;
}

/** Resuelve token interno simple {{…}} a id Iconify canónico (mdi:foo). */
export function resolveIconifyIconId(raw) {
  const token = String(raw ?? '').trim();
  if (!token) return null;
  const alias = ALIASES[token.toLowerCase()];
  if (alias) return alias;
  if (ICON_ID_RE.test(token)) return token;
  return null;
}

function parseIconifySugarObject(objRaw) {
  const s = objRaw.trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object') {
      return {
        icon: parsed.icon != null ? String(parsed.icon) : undefined,
        hue: normalizeTkHue(parsed.hue) ?? undefined,
      };
    }
  } catch {
    // JS-like: {icon: "mdi:foo", hue: 239}
  }
  const iconM = /\bicon\s*:\s*(?:"([^"]*)"|'([^']*)')/i.exec(s);
  const hueM = /\bhue\s*:\s*(\d+(?:\.\d+)?)/i.exec(s);
  const icon = iconM?.[1] ?? iconM?.[2];
  const hue = normalizeTkHue(hueM?.[1]);
  if (!icon) return null;
  return { icon, hue: hue ?? undefined };
}

/** Resuelve contenido interno de {{…}} (simple o sugar iconify). */
export function resolveIconifyToken(raw) {
  const token = String(raw ?? '').trim();
  if (!token) return null;

  if (token.toLowerCase().startsWith(ICONIFY_SUGAR_PREFIX)) {
    const parsed = parseIconifySugarObject(token.slice(ICONIFY_SUGAR_PREFIX.length).trim());
    if (!parsed?.icon) return null;
    const iconId = resolveIconifyIconId(parsed.icon);
    if (!iconId) return null;
    return { iconId, hue: parsed.hue };
  }

  const iconId = resolveIconifyIconId(token);
  return iconId ? { iconId } : null;
}

/** Etiqueta con icono embebido vía sugar JSON (diagramas de secuencia). */
export function hasIconifyJsonSugar(raw) {
  return String(raw ?? '').includes('{{iconify:');
}

function scanIconifyTemplateTokens(text, onToken) {
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{{', i);
    if (open === -1) break;

    const tail = text.slice(open);
    const iconifyHead = /^\{\{iconify:\s*/i.exec(tail);
    if (iconifyHead) {
      const jsonStart = open + iconifyHead[0].length;
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

/** URL Iconify — `hue` 0–360 (el query CDN sigue llamándose color internamente). */
export function iconifyApiUrl(iconId, hue, size = 16) {
  const path = iconifyApiPath(iconId);
  const params = new URLSearchParams();
  const hex = hue != null ? tkHueToHex(hue) : undefined;
  if (hex) params.set('color', hex);
  params.set('width', String(size));
  params.set('height', String(size));
  return `https://api.iconify.design/${path}.svg?${params}`;
}

/** HTML web — `<iconify-icon>` (script global en index.html). */
export function iconifyInlineHtmlWeb(iconId, opts = {}) {
  const size = opts.size ?? '1.1em';
  const cls = opts.className ?? 'tk-inline-iconify';
  const css = opts.hue != null ? tkHueToCss(opts.hue) : undefined;
  const styleAttr = css ? ` style="color:${css}"` : '';
  return `<iconify-icon class="${cls}" icon="${iconId}" width="${size}" height="${size}" aria-hidden="true"${styleAttr}></iconify-icon>`;
}

/** HTML email-safe — img desde api.iconify.design. */
export function iconifyInlineHtmlEmail(iconId, opts = {}) {
  const px = typeof opts.size === 'number' ? opts.size : 16;
  const url = iconifyApiUrl(iconId, opts.hue, px);
  return `<img src="${url}" width="${px}" height="${px}" alt="" class="tk-inline-iconify-img" style="display:inline-block;vertical-align:-0.2em;border:0;"/>`;
}

function replaceIconifyTokens(raw, transformPlain, renderIcon) {
  if (!raw.includes('{{')) return transformPlain(raw);
  let out = '';
  let last = 0;
  scanIconifyTemplateTokens(raw, (start, end, inner) => {
    if (start > last) out += transformPlain(raw.slice(last, start));
    const tok = resolveIconifyToken(inner);
    out += tok ? renderIcon(tok.iconId, tok.hue) : transformPlain(raw.slice(start, end));
    last = end;
  });
  if (last < raw.length) out += transformPlain(raw.slice(last));
  return out;
}

export function replaceIconifyTokensWeb(raw, transformPlain, opts) {
  return replaceIconifyTokens(raw, transformPlain, (id, hue) =>
    iconifyInlineHtmlWeb(id, { ...opts, hue: hue ?? opts?.hue }),
  );
}

export function replaceIconifyTokensEmail(raw, transformPlain, opts) {
  return replaceIconifyTokens(raw, transformPlain, (id, hue) =>
    iconifyInlineHtmlEmail(id, { ...opts, hue: hue ?? opts?.hue }),
  );
}

/** Texto plano — quita markup de iconos para tooltips/búsqueda. */
export function stripIconifyTokensPlain(raw) {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return text;
  let out = '';
  let last = 0;
  scanIconifyTemplateTokens(text, (start, end, inner) => {
    if (start > last) out += text.slice(last, start);
    out += resolveIconifyToken(inner) ? ' ' : text.slice(start, end);
    last = end;
  });
  if (last < text.length) out += text.slice(last);
  return out;
}

/** Primer token iconify al inicio del texto (p. ej. label de actor). */
export function extractLeadingIconifyToken(raw) {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return null;
  const offset = (text.match(/^\s*/)?.[0].length) ?? 0;
  let result = null;
  let done = false;
  scanIconifyTemplateTokens(text, (start, end, inner) => {
    if (done) return;
    done = true;
    if (start !== offset) return;
    const tok = resolveIconifyToken(inner);
    if (tok) result = { iconId: tok.iconId, hue: tok.hue, rest: text.slice(end).trim() };
  });
  return result;
}

export function countIconifyTokens(raw) {
  const text = String(raw ?? '');
  if (!text.includes('{{')) return 0;
  let n = 0;
  scanIconifyTemplateTokens(text, (_s, _e, inner) => {
    if (resolveIconifyToken(inner)) n++;
  });
  return n;
}

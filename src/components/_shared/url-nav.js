/**
 * url-nav.js — memoria de navegación solo en `?s=` (b64url JSON).
 *
 * Opt-in: el consumidor pasa una key (`url-key="docs"`). Sin key no se lee
 * ni se escribe nada. No toca storage del navegador.
 *
 * Contrato
 *   ?s=<b64url({ …, [urlKey]: value })>
 *   Nunca crea query params sueltos (`?docs=…`, `?cdnTab=…`).
 *   Al escribir, limpia esos params legado si existieran.
 */

const STATE_PARAM = 's';

/** Keys reservadas de la galería / preview; url-nav no las borra al patch. */
export const URL_STATE_RESERVED = Object.freeze([
  'component', 'theme', 'palette', 'embed',
]);

/**
 * @param {string} input
 * @returns {string}
 */
export function b64urlEncode(input) {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} input
 * @returns {string}
 */
export function b64urlDecode(input) {
  let pad = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (pad.length % 4) pad += '=';
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Lee el objeto de estado de `?s=`. Si falta o es inválido → `{}`.
 * @returns {Record<string, unknown>}
 */
export function readUrlState() {
  if (typeof globalThis.location === 'undefined') return {};
  try {
    const raw = new URL(globalThis.location.href).searchParams.get(STATE_PARAM);
    if (!raw) return {};
    const parsed = JSON.parse(b64urlDecode(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Reemplaza `?s=` con el objeto dado (serializado). Conserva otros search params
 * (p. ej. `tag` en shells) salvo los legado sueltos listados en `dropLoose`.
 * @param {Record<string, unknown>} state
 * @param {string[]} [dropLoose]
 */
export function writeUrlState(state, dropLoose = []) {
  if (typeof globalThis.history === 'undefined' || typeof globalThis.location === 'undefined') {
    return;
  }
  try {
    const url = new URL(globalThis.location.href);
    const clean = {};
    for (const [k, v] of Object.entries(state || {})) {
      if (v == null || v === '') continue;
      clean[k] = v;
    }
    const encoded = b64urlEncode(JSON.stringify(clean));
    const prev = url.searchParams.get(STATE_PARAM);
    let changed = prev !== encoded;
    url.searchParams.set(STATE_PARAM, encoded);
    for (const loose of dropLoose) {
      if (!loose || loose === STATE_PARAM) continue;
      if (url.searchParams.has(loose)) {
        url.searchParams.delete(loose);
        changed = true;
      }
    }
    if (!changed) return;
    globalThis.history.replaceState(globalThis.history.state, '', url);
  } catch {
    /* ignore */
  }
}

/**
 * Merge patch sobre `?s=`. `null`/`''` borra la key.
 * @param {Record<string, unknown>} patch
 */
export function patchUrlState(patch) {
  const next = { ...readUrlState() };
  const dropLoose = [];
  for (const [k, v] of Object.entries(patch || {})) {
    dropLoose.push(k);
    if (v == null || v === '') delete next[k];
    else next[k] = v;
  }
  writeUrlState(next, dropLoose);
}

/**
 * @param {string} key — valor de `url-key` (p. ej. `"docs"`)
 * @returns {string | null}
 */
export function readUrlNav(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  const v = readUrlState()[k];
  if (v == null || v === '') return null;
  return String(v);
}

/**
 * @param {string} key
 * @param {string | null | undefined} value  vacío/null → borra la key en `?s=`
 */
export function writeUrlNav(key, value) {
  const k = String(key || '').trim();
  if (!k) return;
  const next = value == null || value === '' ? null : String(value);
  patchUrlState({ [k]: next });
}

/**
 * doc-demo-estado.ts — estado de los exploradores `iswc-doc-demo`, compartido por la galería del kit y la de las apps:
 * el `?s=` (JSON en b64url) y la preferencia de compactar paneles.
 */
import { getComponentPrefs, removeComponentPrefs, setComponentPrefs } from '../../../core/prefs.js';

const PANELS_TTL_MS = 3_600_000;
const SHELL_PREFS_TAG = 'iswc-gallery';
const SHELL_PREFS_KEY = 'shell';

export const b64urlEncode = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const b64urlDecode = (input: string): string => {
  let pad = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (pad.length % 4) pad += '=';
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

/** Estado del `?s=` de la URL actual; `null` si falta o está corrupto. */
export function leerEstado<T>(): T | null {
  const raw = new URLSearchParams(location.search).get('s');
  if (!raw) return null;
  try {
    return JSON.parse(b64urlDecode(raw)) as T;
  } catch {
    return null;
  }
}

export const codificarEstado = (estado: unknown): string => b64urlEncode(JSON.stringify(estado));

export function readPanelsCompactPref(): boolean {
  const saved = getComponentPrefs(SHELL_PREFS_TAG, SHELL_PREFS_KEY);
  if (!saved) return false;
  const savedAt = Number((saved as { savedAt?: unknown }).savedAt);
  if (!Number.isFinite(savedAt) || savedAt <= 0 || Date.now() - savedAt > PANELS_TTL_MS) {
    removeComponentPrefs(SHELL_PREFS_TAG, SHELL_PREFS_KEY);
    return false;
  }
  return (saved as { panelsCompact?: unknown }).panelsCompact === true;
}

export function writePanelsCompactPref(compact: boolean): void {
  setComponentPrefs(SHELL_PREFS_TAG, SHELL_PREFS_KEY, { panelsCompact: compact, savedAt: Date.now() });
}

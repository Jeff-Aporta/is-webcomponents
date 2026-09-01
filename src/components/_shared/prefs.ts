/**
 * Preferencias compartidas de Web Components (un solo JSON en localStorage).
 *
 * Forma:
 * {
 *   "is-split-panel": { "gallery-nav": { "positionInPixels": 200 } },
 *   "is-main": { "docs-is-button": { "top": 420, "savedAt": 1710000000000 } },
 *   "is-ag-grid": { "mi-tabla": { … snapshot del grid … } }
 * }
 *
 * ROOT_KEY = "is-webcomponents". `is-components` es SOLO legacy: se lee una
 * vez para migrar y se borra; nunca se escribe.
 */

const ROOT_KEY = 'is-webcomponents';
const LEGACY_ROOT_KEY = 'is-components';

function parseRoot(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function readRoot() {
  try {
    const current = parseRoot(localStorage.getItem(ROOT_KEY));
    if (current) return current;
    // Migración desde el root legacy: se copia tal cual y se retira el viejo,
    // así la siguiente lectura ya sale por el camino corto.
    const legacy = parseRoot(localStorage.getItem(LEGACY_ROOT_KEY));
    if (legacy) {
      writeRoot(legacy);
      try { localStorage.removeItem(LEGACY_ROOT_KEY); } catch { /* noop */ }
      return legacy;
    }
    return {};
  } catch {
    return {};
  }
}

function writeRoot(data) {
  try {
    localStorage.setItem(ROOT_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/** @returns {object | null} */
export function getComponentPrefs(tag, key) {
  if (!tag || !key) return null;
  const root = readRoot();
  const bucket = root[tag];
  if (!bucket || typeof bucket !== 'object') return null;
  const entry = bucket[key];
  return entry && typeof entry === 'object' ? entry : null;
}

/** Merge shallow de `patch` en la entrada tag/key. */
export function setComponentPrefs(tag, key, patch) {
  if (!tag || !key || !patch || typeof patch !== 'object') return;
  const root = readRoot();
  const bucket = root[tag] && typeof root[tag] === 'object' ? { ...root[tag] } : {};
  bucket[key] = { ...(bucket[key] && typeof bucket[key] === 'object' ? bucket[key] : {}), ...patch };
  root[tag] = bucket;
  writeRoot(root);
}

/** Reemplaza la entrada completa: sin merge, para snapshots que deben quedar
 *  exactamente como se guardan (estado de grid, donde un merge dejaría
 *  columnas o filtros viejos que ya no existen). */
export function replaceComponentPrefs(tag, key, value) {
  if (!tag || !key || !value || typeof value !== 'object') return;
  const root = readRoot();
  const bucket = root[tag] && typeof root[tag] === 'object' ? { ...root[tag] } : {};
  bucket[key] = value;
  root[tag] = bucket;
  writeRoot(root);
}

/** Borra la entrada tag/key (y el bucket si queda vacío). */
export function removeComponentPrefs(tag, key) {
  if (!tag || !key) return;
  const root = readRoot();
  const bucket = root[tag];
  if (!bucket || typeof bucket !== 'object' || !(key in bucket)) return;
  const next = { ...bucket };
  delete next[key];
  if (Object.keys(next).length) root[tag] = next;
  else delete root[tag];
  writeRoot(root);
}

/** Snapshot del root (solo lectura; para auditoría). */
export function peekComponentPrefsRoot() {
  return readRoot();
}

/**
 * Limpia TODA la memoria de componentes (`is-webcomponents` + legacy).
 * Splits, scrolls, grids, etc. Vuelve a los defaults del markup.
 * @returns {{ cleared: boolean, tags: string[] }}
 */
export function clearAllComponentPrefs() {
  const before = readRoot();
  const tags = Object.keys(before || {});
  try {
    localStorage.removeItem(ROOT_KEY);
    localStorage.removeItem(LEGACY_ROOT_KEY);
  } catch {
    /* quota / private */
  }
  return { cleared: true, tags };
}

export function getPrefsRootKey() {
  return ROOT_KEY;
}

export function getLegacyPrefsRootKey() {
  return LEGACY_ROOT_KEY;
}

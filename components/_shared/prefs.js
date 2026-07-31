/**
 * Preferencias compartidas de Web Components (un solo JSON en localStorage).
 *
 * Forma:
 * {
 *   "is-split-panel": { "gallery-nav": { "positionInPixels": 200 } },
 *   "is-main": { "docs-is-button": { "top": 420, "savedAt": 1710000000000 } }
 * }
 *
 * ROOT_KEY = "is-components"
 */

const ROOT_KEY = 'is-components';

function readRoot() {
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
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

export function getPrefsRootKey() {
  return ROOT_KEY;
}

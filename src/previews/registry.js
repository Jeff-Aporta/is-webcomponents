/**
 * Registry de previews: JSON homogéneo (is-preview/v1) + behavior opcional.
 * No hay HTML por componente — solo `_shell.html` para fullscreen.
 *
 * El servidor de docs manda `Cache-Control: no-store` (serve.mjs) para que los
 * módulos no queden congelados al editar. Sin caché en memoria, cada cambio de
 * vista volvería a fetchear el JSON (40–90 KB) y la UI anterior se quedaría
 * visible hasta que resolviera — se siente como delay al navegar.
 */
import catalog from './catalog.js';
import { JsonPreview } from './_kit/JsonPreview.js';
import { loadDefinitionJson } from './_kit/load-json.js';

/** @type {Map<string, import('./_kit/types.d.ts').PreviewDefinition>} */
const definitionCache = new Map();

/** @type {Map<string, import('./_kit/types.d.ts').PreviewBehaviorModule>} */
const behaviorCache = new Map();

/**
 * @param {string} tag
 * @returns {boolean}
 */
export function hasControlledPreview(tag) {
  return Object.prototype.hasOwnProperty.call(catalog, tag);
}

/**
 * @returns {string[]}
 */
export function controlledPreviewTags() {
  return Object.keys(catalog);
}

/**
 * @param {string} tag
 * @returns {boolean}
 */
export function hasCachedPreview(tag) {
  return definitionCache.has(tag);
}

/**
 * @param {string} tag
 * @returns {Promise<import('./_kit/types.d.ts').ISComponentPreviewLike | null>}
 */
export async function loadPreview(tag) {
  const entry = catalog[tag];
  if (!entry) return null;

  let definition = definitionCache.get(tag);
  if (!definition) {
    const jsonUrl = new URL(entry.json, import.meta.url);
    definition = await loadDefinitionJson(jsonUrl);
    definitionCache.set(tag, definition);
  }

  /** @type {import('./_kit/types.d.ts').PreviewBehaviorModule | null} */
  let behavior = null;
  if (entry.behavior || definition.hasBehavior) {
    const behPath = entry.behavior || `./behaviors/${tag}.js`;
    const behKey = behPath;
    if (behaviorCache.has(behKey)) {
      behavior = behaviorCache.get(behKey);
    } else {
      try {
        behavior = await import(new URL(behPath, import.meta.url).href);
        behaviorCache.set(behKey, behavior);
      } catch (err) {
        console.warn(`[registry] behavior missing for ${tag}:`, err.message);
      }
    }
  }

  return new JsonPreview(definition, behavior);
}

/** Vacía la caché de definiciones (tests / HMR manual). */
export function clearPreviewCache() {
  definitionCache.clear();
  behaviorCache.clear();
}

export function previewCatalogEntry(tag) {
  return catalog[tag] || null;
}

export { catalog };
export default catalog;

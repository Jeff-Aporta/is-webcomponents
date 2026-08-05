/**
 * Registry de previews: JSON homogéneo (is-preview/v1) + behavior opcional.
 * No hay HTML por componente — solo `_shell.html` para fullscreen.
 */
import catalog from './catalog.js';
import { JsonPreview } from './_kit/JsonPreview.js';
import { loadDefinitionJson } from './_kit/load-json.js';

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
 * @returns {Promise<import('./_kit/types.d.ts').ISComponentPreviewLike | null>}
 */
export async function loadPreview(tag) {
  const entry = catalog[tag];
  if (!entry) return null;

  const jsonUrl = new URL(entry.json, import.meta.url);
  const definition = await loadDefinitionJson(jsonUrl);

  /** @type {import('./_kit/types.d.ts').PreviewBehaviorModule | null} */
  let behavior = null;
  if (entry.behavior || definition.hasBehavior) {
    const behPath = entry.behavior || `./behaviors/${tag}.js`;
    try {
      behavior = await import(new URL(behPath, import.meta.url).href);
    } catch (err) {
      console.warn(`[registry] behavior missing for ${tag}:`, err.message);
    }
  }

  return new JsonPreview(definition, behavior);
}

export function previewCatalogEntry(tag) {
  return catalog[tag] || null;
}

export { catalog };
export default catalog;

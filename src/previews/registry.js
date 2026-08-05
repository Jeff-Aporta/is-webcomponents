/**
 * Registry de previews controlados (ISComponentPreview).
 * Tags ausentes → el shell usa iframe al HTML legado.
 */

/** @type {Record<string, () => Promise<{ default: new () => import('./_kit/types.d.ts').ISComponentPreviewLike }>>} */
const LOADERS = {
  'is-button-group': () => import('./actions/is-button-group.preview.js'),
};

/**
 * @param {string} tag
 * @returns {boolean}
 */
export function hasControlledPreview(tag) {
  return Object.prototype.hasOwnProperty.call(LOADERS, tag);
}

/**
 * @param {string} tag
 * @returns {Promise<import('./_kit/types.d.ts').ISComponentPreviewLike | null>}
 */
export async function loadPreview(tag) {
  const load = LOADERS[tag];
  if (!load) return null;
  const mod = await load();
  const Ctor = mod.default;
  return new Ctor();
}

/**
 * Lista de tags ya migrados al sistema controlado.
 * @returns {string[]}
 */
export function controlledPreviewTags() {
  return Object.keys(LOADERS);
}

export { LOADERS };

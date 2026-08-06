/**
 * cdn-sources.js — de dónde salen las URLs de los snippets.
 *
 * Primario: jsDelivr sobre el repo (`@<ref>/dist/cdn`).
 * Espejo: GitHub Pages (`jeff-aporta.github.io/.../dist/cdn`).
 * Ver `src/components/_shared/cdn-ref.js` → `MIRRORS`.
 */
import {
  resolveRef,
  resolvedBase,
  jsdelivrBase,
  pagesBase,
  MIRRORS,
  fallbackBases,
} from '../src/components/_shared/cdn-ref.js';

const GH_REPO = 'Jeff-Aporta/is-webcomponents';
const RAW = (ref = 'main') => `https://raw.githubusercontent.com/${GH_REPO}/${ref}`;

export const baseFor = (ref) => jsdelivrBase(ref);
export const docsBase = (ref) => RAW(ref);

export { resolveRef, resolvedBase, jsdelivrBase, pagesBase, MIRRORS, fallbackBases };

/** Orígenes ofrecibles en la UI. */
export const listSources = (ref = 'main') =>
  MIRRORS.map((m) => ({
    id: m.id,
    label: m.label,
    hint: m.hint,
    base: m.base(ref),
    pin: m.pin,
  }));

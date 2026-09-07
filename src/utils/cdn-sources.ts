/**
 * src/utils/cdn-sources.ts — de dónde salen las URLs de los snippets.
 *
 * Migrado de `scripts/cdn-sources.js` (2026-09-07): S-DEP-FUERA exige que
 * `src/` no dependa de `scripts/`.
 *
 * Primario: jsDelivr sobre el repo (`@<ref>/dist/cdn`).
 * Espejo: GitHub Pages (`jeff-aporta.github.io/.../dist/cdn`).
 * Ver `src/components/_shared/cdn-ref.ts` → `MIRRORS`.
 */
import {
  resolveRef,
  resolvedBase,
  jsdelivrBase,
  pagesBase,
  MIRRORS,
  fallbackBases,
} from '../components/_shared/cdn-ref.js';

const GH_REPO = 'Jeff-Aporta/is-webcomponents';
const RAW = (ref: string = 'main') => `https://raw.githubusercontent.com/${GH_REPO}/${ref}`;

export const baseFor = (ref: string) => jsdelivrBase(ref);
export const docsBase = (ref: string = 'main') => RAW(ref);

export { resolveRef, resolvedBase, jsdelivrBase, pagesBase, MIRRORS, fallbackBases };

/** Orígenes ofrecibles en la UI. */
export const listSources = (ref: string = 'main') =>
  MIRRORS.map((m) => ({
    id: m.id,
    label: m.label,
    hint: m.hint,
    base: m.base(ref),
    pin: m.pin,
  }));
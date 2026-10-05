/**
 * Tras pintar el HTML del MD: lazy-load de is-* y upgrade de marcadores
 * `.md-iswc-code` a `<iswc-code>` (solo si hace falta iswc-code).
 */

import type { LoaderLike } from "./md-hydrate.schemas.js";
function loader(): LoaderLike | null {
  const L = (globalThis as { ISWebComponentsLoader?: LoaderLike }).ISWebComponentsLoader;
  return L && typeof L.ensure === 'function' ? L : null;
}

/** Tags is-* presentes en el árbol (marcadores de código cuentan como iswc-code). */
export function collectNeededTags(root: ParentNode): string[] {
  const tags = new Set<string>();
  if (root.querySelector?.('.md-iswc-code')) tags.add('iswc-code');
  const all = root.querySelectorAll?.('*') ?? [];
  for (const el of all) {
    const name = el.localName;
    if (name?.startsWith('iswc-')) tags.add(name);
  }
  return [...tags].sort();
}

/** Carga solo lo que el contenido pide. El loader no repite si ya está. */
export async function ensureNeededTags(root: ParentNode): Promise<string[]> {
  const L = loader();
  const needed = collectNeededTags(root);
  if (!L || !needed.length) return [];
  const loaded: string[] = [];
  for (const tag of needed) {
    if (L.has?.(tag)) continue;
    try {
      const ok = await L.ensure!(tag);
      if (ok) loaded.push(tag);
    } catch (err) {
      console.warn('[iswc-md-render] ensure', tag, err);
    }
  }
  return loaded;
}

/**
 * Sustituye `.md-iswc-code` por `<iswc-code>`.
 * Inline → brand-mono sin fondo (fluye en el texto).
 * Bloque (```lang) → theme completo del preset dark/light.
 */
export function upgradeCodeMarkers(root: ParentNode): number {
  const nodes = [...(root.querySelectorAll?.('.md-iswc-code') ?? [])];
  if (!nodes.length) return 0;
  let n = 0;
  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    const mode = el.getAttribute('data-mode') === 'inline' ? 'inline' : 'block';
    const lang = el.getAttribute('data-lang') || '';
    const text = el.tagName === 'PRE'
      ? (el.querySelector('code')?.textContent ?? el.textContent ?? '')
      : (el.textContent ?? '');
    const ed = document.createElement('iswc-code');
    ed.className = mode === 'inline' ? 'md-code md-code--inline' : 'md-code';
    ed.setAttribute('readonly', '');
    if (mode === 'inline') {
      ed.setAttribute('mode', 'inline');
      ed.setAttribute('theme', 'brand-mono');
    } else {
      ed.setAttribute('compact', '');
      ed.setAttribute('wrap', '');
      ed.setAttribute('line-numbers', 'false');
    }
    if (lang) ed.setAttribute('lang', lang);
    ed.setAttribute('value', text);
    el.replaceWith(ed);
    n += 1;
  }
  return n;
}

/** ensure + upgrade en un solo paso. */
export async function hydrateMdEmbeds(root: ParentNode): Promise<void> {
  await ensureNeededTags(root);
  upgradeCodeMarkers(root);
}

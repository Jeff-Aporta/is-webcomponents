/**
 * cdn-ref.js — resuelve la rama `main` al SHA del último commit.
 *
 * Los snippets deben salir CONGELADOS: `@main` cambia bajo los pies de quien
 * pegó el snippet, mientras que `@<sha>` no y jsDelivr lo cachea de forma
 * inmutable.
 *
 * Se pide UNA vez por pestaña (promesa cacheada + sessionStorage) porque la API
 * pública de GitHub va a 60 peticiones/hora por IP. Si falla —sin red o cuota
 * agotada— se cae a `main`: preferimos un snippet vivo a uno roto.
 */
export const GH_REPO = 'Jeff-Aporta/is-webcomponents';

const REF_KEY = 'is-wc:cdn-ref';
let refPromise = null;

export const resolveRef = () => {
  if (refPromise) return refPromise;
  let cached = null;
  try { cached = globalThis.sessionStorage?.getItem(REF_KEY); } catch { /* modo privado */ }
  if (cached) { refPromise = Promise.resolve(cached); return refPromise; }
  refPromise = fetch(`https://api.github.com/repos/${GH_REPO}/commits/main`, {
    headers: { Accept: 'application/vnd.github.sha' },
  })
    .then((r) => (r.ok ? r.text() : ''))
    .then((sha) => {
      const ref = /^[0-9a-f]{40}$/i.test(sha.trim()) ? sha.trim() : 'main';
      try { globalThis.sessionStorage?.setItem(REF_KEY, ref); } catch { /* modo privado */ }
      return ref;
    })
    .catch(() => 'main');
  return refPromise;
};

export const jsdelivrBase = (ref = 'main') => `https://cdn.jsdelivr.net/gh/${GH_REPO}@${ref}/dist/cdn`;

/** Base ya congelada al último commit. */
export const resolvedBase = async () => jsdelivrBase(await resolveRef());

// demo-code.js es un IIFE clásico (no módulo) y no puede importar: lee esto.
if (typeof window !== 'undefined') {
  window.__IS_CDN_REF__ = { resolveRef, jsdelivrBase, resolvedBase, GH_REPO };
}

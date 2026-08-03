/**
 * cdn-sources.js — de dónde salen las URLs de los snippets.
 *
 * Hay tres orígenes posibles y NO son intercambiables a ciegas:
 *
 *   cf-latest  https://is-webcomponents.pages.dev            — siempre el último build
 *   cf-pinned  https://<id8>.is-webcomponents.pages.dev      — deployment inmutable
 *   jsdelivr   https://cdn.jsdelivr.net/gh/…@<ref>/dist/cdn  — por rama o commit
 *
 * El id de un deployment de Pages lo asigna Cloudflare y no se deriva del
 * commit, así que la lista de versiones fijas se lee de `versions.json`
 * (lo genera scripts/sync-cf-versions.mjs desde la API tras cada deploy) y
 * ya viene verificada: los deployments que no responden no se listan.
 *
 * `window.__IS_CDN_SOURCES__` queda expuesto para el chrome de los demos.
 */
const GH_REPO = 'Jeff-Aporta/is-webcomponents';
const CF_PROJECT = 'is-webcomponents';
const CF_LATEST = `https://${CF_PROJECT}.pages.dev`;
const JSDELIVR = (ref) => `https://cdn.jsdelivr.net/gh/${GH_REPO}@${ref}/dist/cdn`;

/** versions.json se sirve junto al resto del bundle: se pide una vez. */
let versionsPromise = null;
export const loadVersions = () => {
  versionsPromise ??= fetch(`${CF_LATEST}/versions.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return versionsPromise;
};

/** Base de URLs para un origen dado. `ref` es el id8 (cf) o el commit/rama
 *  (jsdelivr); se ignora en los orígenes que no lo usan. */
export const baseFor = (source, ref) => {
  if (source === 'cf-pinned' && ref) return `https://${ref}.${CF_PROJECT}.pages.dev`;
  if (source === 'jsdelivr') return JSDELIVR(ref || 'main');
  return CF_LATEST;
};

/** Opciones que se pueden ofrecer en la UI, ya filtradas por disponibilidad.
 *  Sin versions.json sólo quedan los orígenes que no dependen de él. */
export const listSources = async () => {
  const data = await loadVersions();
  const out = [
    { id: 'cf-latest', label: 'Cloudflare · último', base: CF_LATEST },
  ];
  for (const v of data?.versions || []) {
    out.push({
      id: `cf-pinned:${v.id}`,
      label: `Cloudflare · ${v.id}`,
      base: baseFor('cf-pinned', v.id),
      commit: v.commit,
      created: v.created,
    });
  }
  out.push({ id: 'jsdelivr', label: 'jsDelivr · main', base: JSDELIVR('main') });
  return out;
};

if (typeof window !== 'undefined') {
  window.__IS_CDN_SOURCES__ = { loadVersions, baseFor, listSources, CF_LATEST, JSDELIVR };
}

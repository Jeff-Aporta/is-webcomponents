/**
 * cdn-sources.js — de dónde salen las URLs de los snippets.
 *
 * Todo se sirve por jsDelivr sobre el repo, que ya publica cualquier ruta del
 * árbol sin build ni despliegue aparte:
 *
 *   https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<ref>/dist/cdn
 *
 * `ref` puede ser una rama (`main`, siempre lo último) o un commit completo,
 * que jsDelivr cachea de forma inmutable: eso es el "fijar una versión". No
 * hace falta un JSON de mapeo — a diferencia de Cloudflare Pages, donde el id
 * del deployment lo asignaba Cloudflare y no se derivaba del commit.
 */
const GH_REPO = 'Jeff-Aporta/is-webcomponents';
const JSDELIVR = (ref = 'main') => `https://cdn.jsdelivr.net/gh/${GH_REPO}@${ref}/dist/cdn`;
/** Los .md se leen del fuente, sin copia en dist. raw.githubusercontent es la
 *  única ruta que los devuelve como `text/plain` (jsDelivr y GitHub Pages los
 *  mandan como `text/markdown` y el navegador los descarga). */
const RAW = (ref = 'main') => `https://raw.githubusercontent.com/${GH_REPO}/${ref}`;

export const baseFor = (ref) => JSDELIVR(ref);
export const docsBase = (ref) => RAW(ref);

/**
 * Resuelve `main` al SHA del último commit para que los snippets salgan
 * CONGELADOS: `@main` cambia bajo los pies de quien pegó el snippet, `@<sha>`
 * no, y jsDelivr cachea un commit de forma inmutable.
 *
 * Se pide una vez por pestaña (promesa cacheada + sessionStorage) porque la
 * API pública de GitHub va a 60 peticiones/hora por IP. Si falla —sin red, o
 * cuota agotada— se cae a `main`, que sigue funcionando: preferimos un
 * snippet vivo a uno roto.
 */
import { resolveRef, resolvedBase } from '../src/components/_shared/cdn-ref.js';

export { resolveRef, resolvedBase };

/** Orígenes ofrecibles en la UI. `ref` vacío = rama por defecto. */
export const listSources = () => ([
  { id: 'main', label: 'jsDelivr · main', base: JSDELIVR('main') },
]);

/**
 * iswcLoader — núcleo (capa 1) del loader CDN del kit (plan D7, fase F4).
 *
 * Capa 1 (este archivo, `core/loader.min.mjs`): catálogo, host/pin, `load`/`ensure`/`has`/`getLoaded`, registro
 * anti-redundancia (`load-plan`), `registerApp`, inferencia por extensión (D2: `.mjs`/sin extensión → `import()`,
 * `.js` → `<script src>` clásico, `.css` → `<link>`) y precarga del cierre: al primer `load()` pide `deps.json`
 * una vez e inyecta `<link rel="modulepreload">` por cada módulo del cierre del lote (una ráfaga, no una por nivel).
 *
 * Capa 2 (`import()` solo al primer uso; cada una recibe el contexto `ctx` del núcleo):
 *   loader-sheets   sheets.* (Cache Storage + adoptedStyleSheets) y loadPageStyles
 *   loader-store    asset-store (IndexedDB) y syncHashMemory; nunca en el arranque
 *   loader-mirrors  fallback jsDelivr → githack → Pages, stickyBase y reintentos; en el camino feliz no se carga
 *   loader-pages    loadPageModules (módulos de página de la galería)
 *   loader-ref      resolveRef (API de GitHub): solo sin pin y con espejos que lo necesiten
 *   loader-hashes   `asset-hashes.json` en diferido: `?v=` solo en orígenes mutables (Pages/local)
 *
 * Docs: ./loader.md (también en dist/cdn/core/loader.md)
 * Build sustituye __IS_LOADER_CATALOG__, __IS_ASSET_HASHES__ y __IS_BUILD_SHA__.
 */
import {
  jsdelivrBase,
  githackBase,
  pagesBase,
  MIRRORS as DEFAULT_MIRRORS,
  mirrorById,
  GH_REPO,
  fillHostTemplate,
  esOrigenCdn,
  conBarra,
  raizYCore,
} from '@jeff-aporta/iswc-base/core/cdn-ref.js';
import { createRegistry, planLoads, commitLoads, resolveTagId, isTagCovered } from './load-plan.js';
import { type Catalog } from './schemas/load-plan.schemas.js';
import type { LoadJob } from "./schemas/load-plan.schemas.js";
import type { SheetCacheApi } from './schemas/sheet-cache.schemas.js';
import { ensureElement, isElementReady } from './ensure-element.js';
import { ASSET_HASH_PARAM, ASSET_HASH_PARAM_LEGADO, esUrlInmutable, lookupHash, withAssetHash } from './build/asset-url.js';
import type { DepsLoader, LoaderCtx } from './schemas/loader-capas.schemas.js';

import {
  type AppComponentEntry,
  type ConfigureOpts,
  type iswcLoaderShape,
  type LoadedSnapshot,
  type LoadResult,
  type LoaderSheets,
  type LoaderState,
  type Mirror,
  type PageModuleKind,
  type PageModuleSpec,
} from './schemas/loader.schemas.js';

declare const __IS_LOADER_CATALOG__: Catalog;
declare const __IS_ASSET_HASHES__: Record<string, string>;
declare const __IS_BUILD_SHA__: string;

/** Capa 2 memorizada: un `import()` por módulo; si falla (red), el siguiente uso reintenta. */
function capa<T>(cargar: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => (p ??= cargar().catch((e: unknown) => {
    p = null;
    throw e;
  }));
}
const hojas = capa(() => import('@jeff-aporta/iswc-base/cdn/loader-sheets.js'));
const almacen = capa(() => import('@jeff-aporta/iswc-base/cdn/loader-store.js'));
const espejos = capa(() => import('@jeff-aporta/iswc-base/cdn/loader-mirrors.js'));
const paginas = capa(() => import('@jeff-aporta/iswc-base/cdn/loader-pages.js'));
const refGithub = capa(() => import('@jeff-aporta/iswc-base/cdn/loader-ref.js'));
const hashesDiferidos = capa(() => import('@jeff-aporta/iswc-base/cdn/loader-hashes.js'));

/**
 * SHA del script que se está ejecutando (`@abc…` en jsDelivr) o null.
 * Si el consumidor pincha el loader en un commit, ese pin manda sobre el
 * SHA quemado en build (por si alguien sirve un bundle renombrado).
 */
function shaFromImportUrl(href: string): string | null {
  try {
    // Los tres nombres del repo (ver ALIAS de pin-update): el real hoy en GitHub, `iswc-base` (canónico, tras el
    // rename) y el histórico: un loader pineado con cualquiera vale igual.
    const m = String(href).match(/(?:iswc-base|is-webcomponents|iswc-root)@([0-9a-f]{7,40})\b/i);
    return m ? m[1]!.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * El catálogo viaja compacto (`aliases` + `categories`): cada tag del kit es `iswc-<file>` y también se pide por
 * `<file>`, así que `tags` se reconstruye aquí. Si el build manda `tags` (vendor, tests), se usa tal cual.
 */
function expandirCatalogo(c: Partial<Catalog>): Catalog {
  const categories = c.categories ?? {};
  if (c.tags) return { aliases: c.aliases ?? {}, categories, tags: c.tags };
  const tags: Catalog['tags'] = {};
  for (const [category, files] of Object.entries(categories)) {
    for (const file of files) {
      tags[`iswc-${file}`] = { category, file };
      tags[file] = { category, file };
    }
  }
  return { aliases: c.aliases ?? {}, categories, tags };
}

const CATALOG: Catalog = expandirCatalogo(__IS_LOADER_CATALOG__);
/** Mapa de hashes vivo: el embebido en build (vendor) + `deps.json`/`asset-hashes.json` en orígenes mutables. */
const HASHES: Record<string, string> = { ...__IS_ASSET_HASHES__ };

/** Plantilla del host. configure({ sha }) sustituye {{cdnUrl}} y {{sha}}. */
const HOST_DEFAULT = '{{cdnUrl}}@{{sha}}/dist/cdn';
// El repo sale de la URL del propio loader (ver repoDeUrl en cdn-ref): sirve con el nombre viejo o el nuevo.
const CDN_URL_DEFAULT = `https://cdn.jsdelivr.net/gh/${GH_REPO}`;
/**
 * Pin por defecto de ESTE loader:
 * 1) SHA de la URL (`@abc…/loader.min.mjs`) si viene pinneada
 * 2) `__IS_BUILD_SHA__` quemado en el build (HEAD al publicar)
 */
const SHA_FROM_URL = shaFromImportUrl(import.meta.url);
const SHA_DEFAULT: string = SHA_FROM_URL || __IS_BUILD_SHA__;

const SELF_BASE = new URL('./', import.meta.url).href.replace(/\/?$/, '/');

/** Raíz del CDN (`dist/cdn/`); este módulo vive en `core/`. */
const CDN_ROOT = /\/core\/$/i.test(SELF_BASE)
  ? new URL('../', SELF_BASE).href.replace(/\/?$/, '/')
  : SELF_BASE;

const slash = conBarra;

/** Host CDN armado con el pin de este loader (jsDelivr @sha). */
function hostFromSha(sha: string, cdnUrl: string = CDN_URL_DEFAULT): string {
  return slash(fillHostTemplate(HOST_DEFAULT, { cdnUrl, sha }));
}

/**
 * Pin + host de arranque.
 * - Loader servido desde jsDelivr o githack: host = jsDelivr@shaDefault.
 * - Cualquier otro origen (Pages, localhost, file:, vendor copiado en otra app): sin host
 *   (preferSelf → CDN_ROOT, su propia carpeta). Así Pages nunca depende de que el SHA
 *   quemado exista en jsDelivr; la cadena de espejos queda como fallback (capa 2).
 * El pin (`ref`) evita que los espejos resuelvan el tip de main por API.
 */
const BOOT_PIN = SHA_DEFAULT !== 'main' && SHA_DEFAULT !== '' ? SHA_DEFAULT : null;
const BOOT_HOST = (esOrigenCdn(import.meta.url) && BOOT_PIN)
  ? hostFromSha(BOOT_PIN)
  : null;

/** D2: la extensión declara el tipo. `.js` (no `.mjs`) → clásico; `.mjs`, `.ts` o sin extensión → módulo. */
function tipoDe(href: string): PageModuleKind {
  const ruta = String(href).split(/[?#]/)[0]!;
  return /\.js$/i.test(ruta) && !/\.mjs$/i.test(ruta) ? 'classic' : 'module';
}

/** `classic:` / `module:` son overrides explícitos; sin prefijo manda la extensión. */
function asPageModuleSpec(input: string | PageModuleSpec): PageModuleSpec {
  if (typeof input === 'string') {
    const raw = input.trim();
    if (raw.startsWith('classic:')) return { href: raw.slice('classic:'.length), type: 'classic' };
    if (raw.startsWith('module:')) return { href: raw.slice('module:'.length), type: 'module' };
    return { href: raw, type: tipoDe(raw) };
  }
  const href = String(input.href || '').trim();
  if (!href) throw new TypeError('PageModuleSpec.href required');
  return { href, type: input.type === 'classic' ? 'classic' : 'module' };
}

const state: LoaderState = {
  ref: BOOT_PIN,
  mirrors: DEFAULT_MIRRORS.map((m) => ({ ...m })),
  mirrorsExplicit: false,
  preferSelf: true,
  host: BOOT_HOST,
  sha: BOOT_PIN,
  cdnUrl: null,
  query: {},
  pageModules: new Map<string, PageModuleSpec>([
    ['highlight-pre',        { href: 'cdn:../scripts/highlight-pre.min.js', type: 'module' }],
    ['demo-code',            { href: 'cdn:../scripts/demo-code.min.js', type: 'module' }],
    ['docs-chrome',          { href: 'cdn:../scripts/docs-chrome.min.js', type: 'module' }],
    ['cdn-panel',            { href: 'cdn:../scripts/cdn-panel.min.js', type: 'module' }],
    ['view-sources',         { href: 'cdn:../scripts/view-sources.min.js', type: 'module' }],
    ['demo-file-meta',       { href: 'cdn:../scripts/demo-file-meta.min.js', type: 'module' }],
    // IIFE sin export → classic (import() fallaría).
    ['dev-reload',           { href: 'scripts/dev-reload.js', type: 'classic' }],
    // Theme/palette del shell doc (ESM; lo importa el host vía loader).
    ['iswc-doc-demo-boot',   { href: 'cdn:preview/doc-demo-boot.min.mjs', type: 'module' }],
    ['iswc-doc-demo-host',   { href: 'cdn:preview/doc-demo-host.min.mjs', type: 'module' }],
    // SPA de la galería (fuera de dist/cdn/; relativo a la página).
    ['iswc-gallery-app',     { href: 'dist/gallery-app.min.js', type: 'module' }],
    // Tema ER InSoft (json2css + resolveErTheme). Sin CE nuevo.
    ['iswc-diagram-theme',   { href: 'cdn:diagrams/theme.min.mjs', type: 'module' }],
  ]),
  pageStyles: new Map<string, string>([
    // Kit CDN (respeta host/local/`?v=`). Reemplaza la antigua API de palettes.
    ['iswc-palettes-default', 'cdn:palettes.min.css'],
    ['iswc-doc-shell', 'cdn:preview/doc-shell.min.css'],
    ['iswc-doc-presentation', 'cdn:preview/doc-presentation.min.css'],
  ]),
};

/** Registro de lo ya cargado en esta página (anti-redundancia). */
const registry = createRegistry();

/** Tags de la app consumidora (fuera del catálogo del kit). */
const appComponents = new Map<string, AppComponentEntry>();
/** Cierre de módulos por tag de la app (`registerApp`/`configure({ deps })`), para la precarga. */
const appDeps = new Map<string, string[]>();
/** Caché de hojas que pidió `registerApp` (se instala en segundo plano, capa 2). */
let hojasApp: Promise<unknown> | null = null;

const cssDone = new Set<string>();
const jsDone = new Map<string, Promise<void>>();

const docBase = (): string => (typeof location !== 'undefined' ? location.href : SELF_BASE);

function normalizeQuery(input: unknown): Record<string, string> {
  if (input == null || input === '') return {};
  if (typeof input === 'string') {
    const out: Record<string, string> = {};
    for (const [k, val] of new URLSearchParams(input.replace(/^\?/, ''))) if (k) out[k] = val;
    return out;
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(input as Record<string, unknown>)) {
      if (val == null || val === '') continue;
      out[k] = String(val);
    }
    return out;
  }
  return {};
}

/** Añade `state.query` (`v`, etc.) sin pisar params ya presentes en el href. */
function withQuery(href: string): string {
  const entries = Object.entries(state.query);
  if (!entries.length) return href;
  const u = new URL(href);
  for (const [k, val] of entries) {
    if (!u.searchParams.has(k)) u.searchParams.set(k, val);
  }
  return u.href;
}

/** Ruta publicada + `?v=` del mapa. Si no hay hash, o la URL es un pin SHA de jsDelivr/githack (inmutable), deja el href. */
function routeHref(href: string): string {
  if (!href) return href;
  let abs = href;
  try {
    abs = new URL(href, docBase()).href;
  } catch { /* href raro: se busca igual en el mapa */ }
  if (esUrlInmutable(abs)) return href;
  const hash = lookupHash(HASHES, abs) || lookupHash(HASHES, href);
  if (!hash) return href;
  if (/^https?:/i.test(href) || href.startsWith('//')) {
    const u = new URL(abs);
    if (u.searchParams.get(ASSET_HASH_PARAM) === hash && !u.searchParams.has(ASSET_HASH_PARAM_LEGADO)) return u.href;
    u.searchParams.delete(ASSET_HASH_PARAM_LEGADO);
    u.searchParams.set(ASSET_HASH_PARAM, hash);
    return u.href;
  }
  return withAssetHash(href, hash);
}

function assetHref(base: string, rel: string): string {
  return routeHref(withQuery(new URL(rel.replace(/^\//, ''), slash(base)).href));
}

/** Raíz del camino feliz: `host` del consumidor o la carpeta propia (`self`). `null` → solo espejos (capa 2). */
function raizPrimaria(): string | null {
  if (state.host) return raizYCore(state.host)[0]!;
  return state.preferSelf ? CDN_ROOT : null;
}

/** Pin para los espejos; sin `state.ref` consulta la API de GitHub (capa 2, `loader-ref`). */
async function refActual(): Promise<string> {
  return state.ref ?? (await refGithub()).resolverRef();
}

const sinQuery = (href: string): string => href.split(/[?#]/)[0]!;

/**
 * ¿Ya hay un `<link>` a esa hoja (con o sin `?v=`), p. ej. puesto por la app en el HTML? Cuenta también la hoja no
 * bloqueante `<link rel="preload" as="style" onload="this.rel='stylesheet'">` (F7, 0.4): no se duplica.
 */
function yaEnlazada(href: string): boolean {
  if (typeof document === 'undefined') return false;
  const ruta = sinQuery(href);
  return [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href], link[rel="preload"][as="style"][href]')].some((l) => sinQuery(l.href) === ruta);
}

function injectStylesheet(href: string): Promise<void> {
  if (cssDone.has(href)) return Promise.resolve();
  if (typeof document === 'undefined' || yaEnlazada(href)) {
    cssDone.add(href);
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-is-cdn-css', href);
    link.onload = () => {
      cssDone.add(href);
      resolve();
    };
    link.onerror = () => {
      link.remove();
      reject(new Error(`CSS falló: ${href}`));
    };
    document.head.appendChild(link);
  });
}

/** Hoja del kit por `<link>` (sin fetch ni IndexedDB). Si la raíz primaria falla, prueba los espejos (capa 2). */
async function injectCdnStylesheet(rel: string): Promise<string> {
  const raiz = raizPrimaria();
  const href = raiz ? assetHref(raiz, rel) : null;
  if (href) {
    try {
      await injectStylesheet(href);
      return href;
    } catch { /* espejos */ }
  }
  return (await espejos()).cssConEspejos(ctx, rel, href);
}

function loadClassicOnce(href: string): Promise<void> {
  const key = `classic:${href}`;
  let p = jsDone.get(key);
  if (p) return p;
  p = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    if ([...document.querySelectorAll<HTMLScriptElement>('script[src]')].some((el) => el.dataset.isPageJs === href || el.src === href)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = href;
    s.async = false;
    s.dataset.isPageJs = href;
    s.onload = () => resolve();
    s.onerror = () => {
      jsDone.delete(key);
      reject(new Error(`iswcLoader: script clásico falló ${href}`));
    };
    document.head.appendChild(s);
  });
  jsDone.set(key, p);
  return p;
}

function importOnce(href: string): Promise<void> {
  let p = jsDone.get(href);
  if (p) return p;
  // Solo dedupe + import(): sin fetch previo a Cache Storage (pedía cada módulo dos veces en
  // frío). La caché HTTP (jsDelivr `immutable`, `?v=` en orígenes mutables) cubre la revisita.
  p = import(/* @vite-ignore */ href).then(() => undefined, (err: unknown) => {
    jsDone.delete(href);
    throw err;
  });
  jsDone.set(href, p);
  return p;
}

/** Carga un href por su extensión (D2): `.js` → `<script src>` clásico; lo demás → `import()`. */
function cargarHref(href: string, tipo?: PageModuleKind): Promise<void> {
  const abs = routeHref(new URL(href, docBase()).href);
  return (tipo ?? tipoDe(abs)) === 'classic' ? loadClassicOnce(abs) : importOnce(abs);
}

let hashesListos: Promise<void> | null = null;
/** `asset-hashes.json` en diferido (capa 2): solo en orígenes mutables, nunca sobre un pin SHA. */
function cargarHashes(): Promise<void> {
  const raiz = raizPrimaria() ?? CDN_ROOT;
  if (esUrlInmutable(raiz) || typeof fetch !== 'function' || typeof document === 'undefined') return Promise.resolve();
  return (hashesListos ??= hashesDiferidos().then((m) => m.cargar(ctx), () => undefined));
}

// ── Precarga del cierre (D7): deps.json → <link rel="modulepreload"> ─────────────────────────────

const depsPorRaiz = new Map<string, Promise<DepsLoader | null>>();
/**
 * `deps/<cat>.json` de una raíz, una vez por categoría (F7: `deps.json` es solo el índice; cada parte pesa 1–15 KB).
 * Sobre un pin SHA va con `force-cache`; en orígenes mutables revalida.
 */
function depsDe(raiz: string, cat: string): Promise<DepsLoader | null> {
  const clave = `${raiz}|${cat}`;
  let p = depsPorRaiz.get(clave);
  if (p) return p;
  const inmutable = esUrlInmutable(raiz);
  p = fetch(new URL(`deps/${cat}.json`, raiz).href, { cache: inmutable ? 'force-cache' : 'no-cache' })
    .then((r) => (r.ok ? r.json() as Promise<DepsLoader> : null))
    .then((d) => {
      // `v`: hash de cada entrada. Solo se usa en orígenes mutables (routeHref ignora los inmutables).
      if (d?.v && !inmutable) for (const [ruta, h] of Object.entries(d.v)) HASHES[ruta] ??= h;
      return d;
    })
    .catch(() => null);
  depsPorRaiz.set(clave, p);
  return p;
}

let precargados: Set<string> | null = null;
/** `<link rel="modulepreload">` una vez por href; respeta los que la app ya puso en el HTML y lo ya importado. */
function precargar(href: string): void {
  if (typeof document === 'undefined') return;
  precargados ??= new Set([...document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"][href]')].map((l) => l.href));
  if (precargados.has(href) || jsDone.has(href)) return;
  precargados.add(href);
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = href;
  link.setAttribute('data-iswc-precarga', '');
  document.head.appendChild(link);
}

/**
 * ¿El HTML (no el loader) ya precargó la entrada? Devuelve el href exacto del `<link rel="modulepreload">` (con su
 * `?v=` si lo trae) o null. Si la app lo hizo, su build emitió el cierre entero desde `deps`: no hace falta pedir
 * `deps/<cat>.json` (F7, 0.1). `<meta name="iswc-precargado" content="<sha>">` (lo emite el build del consumidor)
 * avisa de qué pin salió esa precarga: si no coincide con el pin de la raíz, se ignora y se pide `deps`.
 */
function precargadaEnHtml(href: string, raiz: string): string | null {
  if (typeof document === 'undefined') return null;
  const marca = document.querySelector<HTMLMetaElement>('meta[name="iswc-precargado"]')?.content.trim().toLowerCase();
  const pin = shaFromImportUrl(raiz);
  if (marca && pin && !pin.startsWith(marca) && !marca.startsWith(pin)) return null;
  const ruta = sinQuery(href);
  for (const l of document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"][href]:not([data-iswc-precarga])')) {
    if (sinQuery(l.href) === ruta) return l.href;
  }
  return null;
}

/**
 * Cierre del lote: cada módulo del cierre de cada tag. Los chunks (`_chunks/`, nombre con hash) van tal cual: así
 * los piden sus importadores. Las entradas pasan por `assetHref`, igual que el `import()` del núcleo.
 */
function precargarCierre(jobs: readonly LoadJob[], raiz: string, deps: DepsLoader | null): void {
  if (!deps?.tags) return;
  for (const job of jobs) {
    const file = job.path.slice(job.path.indexOf('/') + 1).replace(/\.min\.mjs$/, '');
    for (const ruta of deps.tags[`iswc-${file}`] ?? []) {
      precargar(ruta.startsWith('_chunks/') ? new URL(ruta, raiz).href : assetHref(raiz, ruta));
    }
  }
}

async function importCdn(rel: string, exacto?: string): Promise<string> {
  const raiz = raizPrimaria();
  if (raiz) {
    const href = exacto ?? assetHref(raiz, rel);
    try {
      await importOnce(href);
      return href;
    } catch (e: unknown) {
      return (await espejos()).importarConEspejos(ctx, rel, href, e);
    }
  }
  return (await espejos()).importarConEspejos(ctx, rel, null, null);
}

/**
 * Lote del kit: precarga el cierre e importa las entradas en paralelo. Una entrada que el HTML ya precargó se importa
 * con ese mismo href y no pide `deps` (F7). Las demás piden `deps/<cat>.json` de su categoría: en un origen mutable
 * (Pages/local) se espera (trae los `?v=` de las entradas: sin ellos un HTML cacheado pediría chunks que ya no
 * existen); sobre un pin SHA no: llega en paralelo con el primer `import()` y precarga lo que falte.
 */
async function cargarKit(jobs: readonly LoadJob[]): Promise<void> {
  const raiz = raizPrimaria();
  const exactos = new Map<LoadJob, string>();
  if (raiz && typeof document !== 'undefined' && typeof fetch === 'function') {
    const porCat = new Map<string, LoadJob[]>();
    for (const job of jobs) {
      const html = precargadaEnHtml(new URL(job.path, raiz).href, raiz);
      if (html) exactos.set(job, html);
      else {
        const cat = job.path.slice(0, job.path.indexOf('/'));
        porCat.set(cat, [...(porCat.get(cat) ?? []), job]);
      }
    }
    const inmutable = esUrlInmutable(raiz);
    const esperas = [...porCat].map(([cat, js]) => depsDe(raiz, cat).then((d) => precargarCierre(js, raiz, d)));
    if (!inmutable) await Promise.all(esperas);
  }
  await Promise.all(jobs.map((j: LoadJob) => importCdn(j.path, exactos.get(j))));
}

/** Tag de la app: precarga su entrada (si es módulo) y el cierre que la app declaró en `deps`. */
function cargarApp(tag: string, entry: AppComponentEntry): Promise<unknown> {
  const tipo = entry.type ?? tipoDe(entry.href);
  if (tipo === 'module') {
    precargar(routeHref(entry.href));
    for (const href of appDeps.get(tag) ?? []) if (tipoDe(href) === 'module') precargar(routeHref(href));
  }
  const css = hojasApp ? hojasApp.then(() => hojas()).then((m) => m.calentarEntrada(ctx, entry)).catch(() => undefined) : null;
  return Promise.all([css, cargarHref(entry.href, tipo)]);
}

function parseArgs(...args: (string | Record<string, unknown>)[]): {
  ids: string[];
  opts: Record<string, unknown>;
} {
  const ids: string[] = [];
  let opts: Record<string, unknown> = {};
  for (const a of args) {
    if (a && typeof a === 'object' && !Array.isArray(a)) {
      opts = a;
    } else if (typeof a === 'string' && a.trim()) {
      ids.push(a.trim());
    }
  }
  return { ids, opts };
}

/** Un id de `load()` que es ruta o URL (no tag ni categoría): `…/x.mjs`, `./y.js`, `https://…`. */
const esHref = (id: string): boolean => /[/\\:]/.test(id) || /\.m?js(?:[?#]|$)/i.test(id);

function normalizeMirrors(input: string | Mirror | (string | Mirror)[]): Mirror[] {
  const list = Array.isArray(input) ? input : [input];
  const out: Mirror[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      if (item === 'jsdelivr') {
        out.push({ id: 'jsdelivr', label: 'jsDelivr', pin: true, base: (ref = 'main') => jsdelivrBase(ref) });
      } else if (item === 'githack') {
        out.push({ id: 'githack', label: 'raw.githack', pin: true, base: (ref = 'main') => githackBase(ref) });
      } else if (item === 'pages') {
        out.push({ id: 'pages', label: 'GitHub Pages', pin: false, base: () => pagesBase() });
      } else if (/^https?:\/\//i.test(item)) {
        const base = slash(item);
        out.push({ id: base, label: base, pin: false, base: () => base });
      } else {
        out.push({ ...mirrorById(item) });
      }
    } else if (item && typeof item.base === 'function') {
      out.push(item);
    }
  }
  // `[]` explícito = sin espejos (modo local). No rellenar con DEFAULT.
  return out;
}

/**
 * Resuelve `host` del consumidor a una URL absoluta con slash final.
 * - `'self'` | `'./'` | `'.'` → raíz del kit junto al loader (`dist/cdn/`)
 * - ruta relativa → contra `location` (app montada), nunca localhost quemado
 * - `http(s)://…` → tal cual
 */
function resolveHostInput(raw: string): string {
  const h = String(raw).trim();
  if (!h || h === 'self' || h === './' || h === '.') return CDN_ROOT;
  if (/^https?:\/\//i.test(h) || h.startsWith('file:')) return slash(h);
  const base = typeof location !== 'undefined' ? location.href : CDN_ROOT;
  return slash(new URL(h, base).href);
}

function normTag(id: string): string {
  return String(id || '').trim().toLowerCase();
}

function setDeps(map: Record<string, string[]> | undefined): void {
  for (const [raw, hrefs] of Object.entries(map ?? {})) {
    const tag = normTag(raw);
    if (tag && Array.isArray(hrefs)) appDeps.set(tag, hrefs.map((h) => new URL(h, docBase()).href));
  }
}

/** API global de la caché de hojas, si alguien la instaló (`sheet-cache` publica en `globalThis`). */
function hojasGlobales(): SheetCacheApi | null {
  const g = globalThis as Record<string, unknown>;
  return (g.__isSheetCache ?? g.__patyHojas ?? null) as SheetCacheApi | null;
}

/** Contexto que reciben las funciones de capa 2. */
const ctx: LoaderCtx = {
  state,
  selfBase: SELF_BASE,
  cdnRoot: CDN_ROOT,
  mirrorsDefault: DEFAULT_MIRRORS,
  hashes: HASHES,
  raizPrimaria,
  ref: refActual,
  assetHref,
  routeHref,
  importOnce,
  loadClassicOnce,
  injectStylesheet,
  injectCdnStylesheet,
  tipoDe,
  cargarHashes,
};

export const iswcLoader: iswcLoaderShape = {
  get catalog(): Catalog { return CATALOG; },
  /** Mapa de hashes vivo (`ruta` → 6 caracteres): embebido + diferido en orígenes mutables. */
  get hashes(): Record<string, string> { return HASHES; },
  /** Pega `?v=` si la ruta esta en el mapa (orígenes mutables). Lo usan adoptCss y las apps. */
  assetUrl(href: string): string {
    void cargarHashes();
    return routeHref(href);
  },
  get repo(): string { return GH_REPO; },
  get mirrors(): Mirror[] { return state.mirrors.slice(); },
  get selfBase(): string { return SELF_BASE; },
  /** Raíz CDN: configure({ host }) o host de arranque (jsDelivr@shaDefault). */
  get host(): string | null { return state.host; },
  hostDefault: HOST_DEFAULT,
  shaDefault: SHA_DEFAULT,
  /** SHA leído de la URL del loader (`@abc…`), si venía pinneada. */
  shaFromUrl: SHA_FROM_URL,
  cdnUrlDefault: CDN_URL_DEFAULT,
  /** Query de bust activa (`{ v: '2' }` → `?v=2`). */
  get query(): Record<string, string> { return { ...state.query }; },

  /** Caché de hojas (adoptedStyleSheets + Cache Storage), capa 2: `install`/`warm*` cargan `loader-sheets`. */
  sheets: {
    install(opts: { cacheName?: string } = {}) {
      return hojas().then((m) => m.instalar(opts));
    },
    get() {
      return hojasGlobales();
    },
    warm(hrefs: string[]) {
      return hojas().then((m) => m.calentar(hrefs));
    },
    warmFromCache() {
      return hojas().then((m) => m.calentarDesdeCache());
    },
    warmFromManifest(url: string, opts: { base?: string; key?: string } = {}) {
      return hojas().then((m) => m.calentarDesdeManifiesto(url, opts));
    },
  } satisfies LoaderSheets,

  async baseUrl(): Promise<string> {
    return raizPrimaria() ?? (await espejos()).cdnBases(ctx).then((b) => b[0]!);
  },

  configure(opts: ConfigureOpts = {}) {
    setDeps(opts.deps);
    if (opts.local === true) {
      state.preferSelf = true;
      state.host = resolveHostInput(opts.host == null || opts.host === '' ? 'self' : String(opts.host));
      state.mirrors = [];
      state.mirrorsExplicit = true;
      state.sha = null;
      state.ref = null;
      state.cdnUrl = null;
      if ('query' in opts) {
        state.query = opts.query == null ? {} : normalizeQuery(opts.query);
      }
      if ('v' in opts) {
        if (opts.v == null || opts.v === '') delete state.query.v;
        else state.query = { ...state.query, v: String(opts.v) };
      }
      return this;
    }
    if ('ref' in opts) state.ref = opts.ref == null || opts.ref === '' ? null : String(opts.ref);
    if ('mirrors' in opts && opts.mirrors != null) {
      state.mirrors = normalizeMirrors(opts.mirrors);
      state.mirrorsExplicit = true;
    }
    if (typeof opts.preferSelf === 'boolean') state.preferSelf = opts.preferSelf;
    if ('cdnUrl' in opts) {
      state.cdnUrl = opts.cdnUrl == null || opts.cdnUrl === '' ? null : String(opts.cdnUrl);
    }
    if ('sha' in opts) {
      state.sha = opts.sha == null || opts.sha === '' ? null : String(opts.sha);
      if (!('ref' in opts)) state.ref = state.sha ?? SHA_DEFAULT;
    }
    if ('host' in opts) {
      state.host = opts.host == null || opts.host === '' ? null : resolveHostInput(String(opts.host));
    } else if ('sha' in opts || 'cdnUrl' in opts) {
      const pin = state.sha || SHA_DEFAULT;
      state.host = pin && pin !== 'main'
        ? hostFromSha(pin, state.cdnUrl || CDN_URL_DEFAULT)
        : null;
    }
    if ('query' in opts) {
      state.query = opts.query == null ? {} : normalizeQuery(opts.query);
    }
    // Atajo cache-bust: L.configure({ v: 2 }) → ?v=2 en cada asset.
    if ('v' in opts) {
      if (opts.v == null || opts.v === '') delete state.query.v;
      else state.query = { ...state.query, v: String(opts.v) };
    }
    return this;
  },

  pin(ref: string) {
    if (!ref) throw new Error('iswcLoader.pin: ref requerido');
    state.ref = String(ref);
    return this;
  },

  unpin() {
    state.ref = null;
    return this;
  },

  resolvePin(): Promise<string> {
    return refActual();
  },

  async listBases(): Promise<string[]> {
    return (await espejos()).cdnBases(ctx);
  },

  async fallbackBases(): Promise<string[]> {
    const ref = await refActual();
    return (await espejos()).basesDeRespaldo(ref);
  },

  /**
   * Registra tags de la app (fuera del catálogo del kit). Luego `load('mi-tag')` importa su `href` (por extensión:
   * `.mjs` → `import()`, `.js` → clásico, salvo `type`), lo precarga con su `deps` y calienta su CSS vía sheet-cache.
   */
  registerApp(
    map: Record<string, string | AppComponentEntry>,
    opts: { cacheName?: string; installSheets?: boolean; deps?: Record<string, string[]> } = {},
  ) {
    if (opts.installSheets !== false || opts.cacheName) {
      const cacheName = opts.cacheName || 'is-sheets-v1';
      hojasApp = hojas().then((m) => m.instalar({ cacheName }));
      hojasApp.catch(() => undefined);
    }
    const baseDoc = docBase();
    for (const [raw, value] of Object.entries(map || {})) {
      const tag = normTag(raw);
      if (!tag) continue;
      const entry: AppComponentEntry = typeof value === 'string'
        ? { href: new URL(value, baseDoc).href }
        : {
            href: new URL(value.href, baseDoc).href,
            css: value.css
              ? (Array.isArray(value.css) ? value.css : [value.css]).map((c: string) => new URL(c, baseDoc).href)
              : undefined,
            ...(value.type ? { type: value.type } : {}),
          };
      appComponents.set(tag, entry);
    }
    setDeps(opts.deps);
    return this;
  },

  /** Tags registrados por la app. */
  getAppComponents(): Record<string, AppComponentEntry> {
    return Object.fromEntries([...appComponents.entries()].map(([k, v]) => [k, { ...v }]));
  },

  /**
   * ¿Ya está cubierto (por tag, su categoría, `all`, o app registry cargado)?
   */
  has(id: string): boolean {
    if (id === 'all' || id === '*') return registry.all;
    const raw = normTag(id);
    const aliased = CATALOG.aliases[raw] || raw;
    if (CATALOG.categories[aliased]) {
      return registry.all || registry.cats.has(aliased);
    }
    if (appComponents.has(raw) && registry.tags.has(raw)) return true;
    const tag = resolveTagId(id, CATALOG);
    return tag ? isTagCovered(tag, registry) : false;
  },

  /** Snapshot del registro anti-redundancia. */
  getLoaded(): LoadedSnapshot {
    return {
      all: registry.all,
      categories: [...registry.cats].sort(),
      tags: [...registry.tags].sort(),
      app: [...appComponents.keys()].filter((t) => registry.tags.has(t)).sort(),
    };
  },

  /** Solo tests / HMR: vacía el registro (no descarga de nuevo lo ya en memoria del navegador). */
  resetLoaded() {
    registry.all = false;
    registry.cats.clear();
    registry.tags.clear();
    return this;
  },

  /** Hojas de página por alias o ruta (capa 2, `loader-sheets`): `<link rel=stylesheet>`, sin fetch ni IndexedDB. */
  async loadPageStyles(hrefs: string[]) {
    const [m] = await Promise.all([hojas(), cargarHashes()]);
    await m.cargarEstilos(ctx, hrefs || []);
  },

  /** Módulos de página por alias o ruta (capa 2, `loader-pages`); el tipo sale de la extensión salvo override. */
  async loadPageModules(hrefs: string[]) {
    const [m] = await Promise.all([paginas(), cargarHashes()]);
    await m.cargarModulos(ctx, hrefs || []);
  },

  /**
   * Registra o reemplaza un alias para `loadPageModules`.
   *
   * @param alias Nombre estable (sin `/`, sin extensión `.js`).
   * @param href Ruta relativa al host, `cdn:…` del kit, o `classic:…` / `module:…`.
   * @param opts.type `module` | `classic`; sin él manda la extensión (`.js` → clásico).
   */
  registerPageModule(alias: string, href: string, opts?: { type?: PageModuleKind }) {
    if (typeof alias !== 'string' || alias === '') throw new TypeError('registerPageModule: alias required');
    if (typeof href !== 'string' || href === '') throw new TypeError('registerPageModule: href required');
    state.pageModules.set(alias, asPageModuleSpec(opts?.type ? { href, type: opts.type } : href));
    return this;
  },

  /**
   * Alias de CSS para `loadPageStyles`.
   * - `href` normal → relativa a la página
   * - `cdn:palettes.min.css` → hoja del kit (host/`?v=`)
   */
  registerPageStyle(alias: string, href: string) {
    if (typeof alias !== 'string' || alias === '') throw new TypeError('registerPageStyle: alias required');
    if (typeof href !== 'string' || href === '') throw new TypeError('registerPageStyle: href required');
    state.pageStyles.set(alias, href);
    return this;
  },

  getPageModules(): Record<string, PageModuleSpec> {
    return Object.fromEntries(
      [...state.pageModules].map(([k, v]) => [k, { ...v }]),
    );
  },

  getPageStyles(): Record<string, string> {
    return Object.fromEntries(state.pageStyles);
  },

  /**
   * Carga tags/categorías/`all` (kit), tags registrados con `registerApp` y hrefs sueltos (por extensión). Resuelve
   * cuando los módulos del lote están IMPORTADOS (no espera `whenDefined`: para eso está `ensure`).
   */
  async load(...args: (string | Record<string, unknown>)[]): Promise<LoadResult> {
    // parseArgs es rest: pasar `args` suelto (no el array como único argumento)
    // o `ids` sale siempre vacío y load() no carga nada (regresión del paso a
    // TS: `parseArgs(args)` con firma `(...args)` → ids=[] en silencio).
    const { ids } = parseArgs(...args);
    if (!ids.length) return { loaded: [], skipped: [] };

    const kitIds: string[] = [];
    const appIds: string[] = [];
    const sueltos: string[] = [];
    const skipped: string[] = [];

    for (const id of ids) {
      const raw = normTag(id);
      if (appComponents.has(raw)) {
        if (registry.tags.has(raw)) skipped.push(raw);
        else appIds.push(raw);
        continue;
      }
      if (esHref(id)) sueltos.push(id);
      else kitIds.push(id);
    }

    const planned = kitIds.length ? planLoads(kitIds, registry, CATALOG) : { jobs: [], skipped: [] };
    skipped.push(...planned.skipped);
    await Promise.all([
      cargarKit(planned.jobs),
      ...appIds.map((tag) => cargarApp(tag, appComponents.get(tag)!)),
      ...sueltos.map((href) => cargarHref(href)),
    ]);
    commitLoads(planned.jobs, registry, CATALOG);
    for (const tag of appIds) registry.tags.add(tag);
    const loaded = [
      ...planned.jobs.map((j: LoadJob) => j.path),
      ...appIds.map((tag) => appComponents.get(tag)!.href),
      ...sueltos,
    ];
    return { loaded, skipped };
  },

  /**
   * Deja el custom element definido (load(tag) + whenDefined). Pedirlo N veces cuesta una
   * carga: ya definido → promesa resuelta compartida; en vuelo o ya cargado → la misma promesa
   * (`ensureElement`). Con `href` lo carga por extensión. Un tag desconocido y sin `href` responde `false`.
   */
  ensure(tag: string, opts: { href?: string } = {}): Promise<boolean> {
    const name = normTag(tag);
    if (appComponents.has(name) || resolveTagId(tag, CATALOG) || CATALOG.categories[CATALOG.aliases[name] || name]) {
      return ensureElement(name, {
        load: async () => {
          await this.load(tag);
        },
        href: opts.href,
      });
    }
    const href = opts.href;
    return ensureElement(name, href ? { href, load: () => cargarHref(href) } : {});
  },

  isReady: isElementReady,
};

if (typeof globalThis !== 'undefined' && !(globalThis as Record<string, unknown>).iswcLoader) {
  // Idempotente: si el loader ya está registrado (caso típico: un page bundle
  // bundleó el loader dentro y se ejecuta después del boot canónico desde
  // `dist/cdn/core/loader.min.mjs`), la primera instancia gana. Si tomáramos la
  // del bundle, su SELF_BASE/CDN_ROOT sería la ruta del bundle (`dist/pages/…`)
  // y `L.load(tag)` pediría URLs tipo `dist/pages/{cat}/{tag}.min.js` → 48× 404
  // en cada nav-click posterior. Guardian: tests/loader-global-guardian.test.ts.
  (globalThis as Record<string, unknown>).iswcLoader = iswcLoader;
}

if (typeof document !== 'undefined') {
  // Mapa embebido (vendor): sella los <link> de la página. El build del kit lo deja vacío: ahí el `?v=` del HTML
  // lo pone el build de la app (o el del kit para su galería).
  if (Object.keys(HASHES).length) {
    for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')) {
      const next = routeHref(link.href);
      if (next && next !== link.href) link.href = next;
    }
    // Memoria del asset-store (IndexedDB) fuera del arranque: en reposo y en capa 2.
    setTimeout(() => void almacen().then((m) => m.sincronizarSiHabia(HASHES)).catch(() => undefined), 0);
  }
  // W52: is-base.min.css por <link> (sin fetch ni IndexedDB), en una microtarea: un `configure({ host })` síncrono
  // tras el import estático ya cuenta. Idempotente: si la app ya lo enlazó en el HTML (con o sin `?v=`), no duplica.
  queueMicrotask(() => void injectCdnStylesheet('is-base.min.css').catch(() => undefined));
}

export default iswcLoader;

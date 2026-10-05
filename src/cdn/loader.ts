/**
 * ISWebComponentsLoader — entry CDN liviano + mirrors + pin + anti-redundancia.
 *
 * - loadPageStyles / loadPageModules (galería + aliases CDN)
 * - sheets.install / warm* — Cache Storage + adoptedStyleSheets (apps)
 * - registerApp / ensure — tags de app + lazy ensure de custom elements
 * - Fallbacks entre espejos (jsDelivr → githack → Pages)
 * - Registro persistente: si ya cargaste `actions`, `load('iswc-button')` no re-fetch
 * - `?h=` sale del mapa de build: si el archivo cambia, la URL cambia
 *
 * Docs: ./loader.md (también en dist/cdn/core/loader.md)
 * Build sustituye __IS_LOADER_CATALOG__, __IS_ASSET_HASHES__ y __IS_BUILD_SHA__.
 */
import {
  resolveRef,
  jsdelivrBase,
  githackBase,
  pagesBase,
  MIRRORS as DEFAULT_MIRRORS,
  mirrorById,
  fallbackBases,
  GH_REPO,
  fillHostTemplate,
} from '../components/_shared/cdn-ref.js';
import {
  createRegistry,
  planLoads,
  commitLoads,
  resolveTagId,
  isTagCovered,
  tagKey,
  type TagEntry,
  type Catalog,
} from './load-plan.js';
import type { LoadJob } from './load-plan.js';
import { installSheetCache, getSheetCache, createSheetCache, type SheetCacheApi } from './sheet-cache.js';
import { ensureElement, isElementReady } from './ensure-element.js';
import { lookupHash, withAssetHash } from './build/asset-url.js';
import { readBody, writeBody, syncHashMemory } from './asset-store.js';

declare const __IS_LOADER_CATALOG__: Catalog;
declare const __IS_ASSET_HASHES__: Record<string, string>;
declare const __IS_BUILD_SHA__: string;

/**
 * SHA del script que se está ejecutando (`@abc…` en jsDelivr) o null.
 * Si el consumidor pincha el loader en un commit, ese pin manda sobre el
 * SHA quemado en build (por si alguien sirve un bundle renombrado).
 */
function shaFromImportUrl(href: string): string | null {
  try {
    const m = String(href).match(/is-webcomponents@([0-9a-f]{7,40})\b/i);
    return m ? m[1]!.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** true si el loader corre en gallery/local (no forzar host CDN). */
function isLocalKitRoot(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'file:'
      || u.hostname === 'localhost'
      || u.hostname === '127.0.0.1'
      || u.hostname === '[::1]';
  } catch {
    return false;
  }
}

export interface Mirror {
  id: string;
  label?: string;
  hint?: string;
  pin?: boolean;
  base: (ref?: string) => string;
}

export interface AppComponentEntry {
  href: string;
  css?: string | string[];
}

const CATALOG: Catalog = __IS_LOADER_CATALOG__;
const HASHES: Record<string, string> = __IS_ASSET_HASHES__;

/** Plantilla del host. configure({ sha }) sustituye {{cdnUrl}} y {{sha}}. */
const HOST_DEFAULT = '{{cdnUrl}}@{{sha}}/dist/cdn';
const CDN_URL_DEFAULT = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents';
/**
 * Pin por defecto de ESTE loader:
 * 1) SHA de la URL (`@abc…/loader.min.js`) si viene pinneada
 * 2) `__IS_BUILD_SHA__` quemado en el build (HEAD al publicar)
 *
 * Así `import …@REF/…/loader.min.js` ya arrastra los componentes de ese
 * commit sin `L.configure({ host })`. El consumidor puede pisar con
 * `configure({ sha })` / `configure({ host })`.
 */
const SHA_FROM_URL = shaFromImportUrl(import.meta.url);
const SHA_DEFAULT: string = SHA_FROM_URL || __IS_BUILD_SHA__;

const SELF_BASE = new URL('./', import.meta.url).href.replace(/\/?$/, '/');

/** Raíz del CDN (`dist/cdn/`); este módulo vive en `core/`. */
const CDN_ROOT = /\/core\/$/i.test(SELF_BASE)
  ? new URL('../', SELF_BASE).href.replace(/\/?$/, '/')
  : SELF_BASE;

const slash = (u: string): string => (u.endsWith('/') ? u : `${u}/`);

/** Host CDN armado con el pin de este loader (jsDelivr @sha). */
function hostFromSha(sha: string, cdnUrl: string = CDN_URL_DEFAULT): string {
  return slash(fillHostTemplate(HOST_DEFAULT, { cdnUrl, sha }));
}

/**
 * Pin + host de arranque.
 * - Gallery local: sin host (preferSelf → CDN_ROOT localhost).
 * - Loader servido desde CDN / bundle externo: host = jsDelivr@shaDefault.
 * El pin (`ref`) evita que los mirrors resuelvan el tip de main por API.
 */
const BOOT_PIN = SHA_DEFAULT !== 'main' && SHA_DEFAULT !== '' ? SHA_DEFAULT : null;
const BOOT_HOST = (!isLocalKitRoot(CDN_ROOT) && BOOT_PIN)
  ? hostFromSha(BOOT_PIN)
  : null;

interface LoaderState {
  ref: string | null;
  mirrors: Mirror[];
  /** true si el consumidor pasó `mirrors` (incluso `[]` = sin fallback CDN). */
  mirrorsExplicit: boolean;
  preferSelf: boolean;
  /** Raíz `dist/cdn/` forzada por el consumidor (githack, local, SHA…). */
  host: string | null;
  /** SHA que entra en {{sha}}. null = shaDefault del build. */
  sha: string | null;
  /** Origen que entra en {{cdnUrl}}. null = cdnUrlDefault. */
  cdnUrl: string | null;
  /** Query de cache-bust en cada asset (`?v=2`). */
  query: Record<string, string>;
  /**
   * Aliases para `loadPageModules` / `loadPageStyles`. Permiten que el consumidor
   * pase un nombre estable (`'highlight-pre'`, `'iswc-palettes-default'`) y el
   * loader lo resuelva al bundle desplegable.
   *
   * CSS CDN del kit: prefijo `cdn:` (p. ej. `cdn:palettes.min.css`) →
   * `injectCdnStylesheet` (host/mirrors/`?h=`). Rutas normales = relativas a la página.
   *
   * JS: `type: 'module'` → `import()`; `type: 'classic'` → `<script>` sin type=module
   * (IIFE / boot sync). Prefijo `cdn:` en href → asset del kit (host/`?h=`).
   */
  pageModules: Map<string, PageModuleSpec>;
  pageStyles: Map<string, string>;
}

/** Spec de un page module (alias table / registerPageModule). */
export type PageModuleKind = 'module' | 'classic';
export interface PageModuleSpec {
  href: string;
  type: PageModuleKind;
}

function asPageModuleSpec(input: string | PageModuleSpec): PageModuleSpec {
  if (typeof input === 'string') {
    const raw = input.trim();
    if (raw.startsWith('classic:')) {
      return { href: raw.slice('classic:'.length), type: 'classic' };
    }
    return { href: raw, type: 'module' };
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
    ['highlight-pre',        { href: 'dist/scripts/highlight-pre.min.js', type: 'module' }],
    ['demo-code',            { href: 'dist/scripts/demo-code.min.js', type: 'module' }],
    ['docs-chrome',          { href: 'dist/scripts/docs-chrome.min.js', type: 'module' }],
    ['cdn-panel',            { href: 'dist/scripts/cdn-panel.min.js', type: 'module' }],
    ['view-sources',         { href: 'dist/scripts/view-sources.min.js', type: 'module' }],
    ['demo-file-meta',       { href: 'dist/scripts/demo-file-meta.min.js', type: 'module' }],
    // IIFE sin export → classic (import() fallaría).
    ['dev-reload',           { href: 'scripts/dev-reload.js', type: 'classic' }],
    // Theme/palette del shell doc (ESM; lo importa el host vía loader).
    ['iswc-doc-demo-boot',   { href: 'cdn:preview/doc-demo-boot.min.js', type: 'module' }],
    ['iswc-doc-demo-host',   { href: 'cdn:preview/doc-demo-host.min.js', type: 'module' }],
    // Tema ER InSoft (json2css + resolveErTheme). Sin CE nuevo.
    ['iswc-diagram-theme',   { href: 'cdn:diagrams/theme.min.js', type: 'module' }],
  ]),
  pageStyles: new Map<string, string>([
    // Kit CDN (respeta host/local/`?h=`). Reemplaza la antigua API de palettes.
    ['iswc-palettes-default', 'cdn:palettes.min.css'],
    ['iswc-doc-shell', 'cdn:preview/doc-shell.min.css'],
    ['iswc-doc-presentation', 'cdn:preview/doc-presentation.min.css'],
  ]),
};

/** Registro de lo ya cargado en esta página (anti-redundancia). */
const registry = createRegistry();

/** Tags de la app consumidora (fuera del catálogo del kit). */
const appComponents = new Map<string, AppComponentEntry>();

const cssDone = new Set<string>();
const jsDone = new Map<string, Promise<void>>();

/**
 * Última base CDN que respondió bien en esta página.
 * Si jsDelivr cae y githack salva el primer `load`, los siguientes no
 * reintentan el muerto primero (mitiga timeouts de espejos caídos).
 */
let stickyBase: string | null = null;

function orderBases(bases: string[]): string[] {
  if (!stickyBase || !bases.includes(stickyBase)) return bases;
  // host / preferSelf siguen primero; sticky solo reordena espejos.
  const preferHead = state.host || state.preferSelf ? 1 : 0;
  const head = bases.slice(0, preferHead);
  if (head.includes(stickyBase)) return bases;
  const rest = bases.slice(preferHead).filter((b) => b !== stickyBase);
  return [...head, stickyBase, ...rest];
}

function rememberBase(base: string): void {
  stickyBase = slash(base);
}

/**
 * Resuelve un input de `loadPageStyles` a CDN del kit o URL de página.
 * - Alias `iswc-palettes-default` → `cdn:palettes.min.css` (host/`?h=`)
 * - Path literal / absoluto → hoja relativa a la página
 */
function resolvePageStyle(input: string): { cdn: string } | { href: string } {
  if (typeof input !== 'string' || input === '') {
    throw new TypeError('resolvePageStyle: input must be non-empty string');
  }
  const trimmed = input.trim();
  const alias = state.pageStyles.get(trimmed);
  if (alias) {
    if (alias.startsWith('cdn:')) return { cdn: alias.slice(4) };
    return { href: alias };
  }
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    || trimmed.startsWith('//')
    || trimmed.startsWith('/')
    || trimmed.includes('/')
    || /\.css(?:\?.*)?$/i.test(trimmed)
  ) {
    return { href: trimmed };
  }
  throw new Error(
    `loadPageStyles: alias desconocido "${trimmed}" — registra con L.registerPageStyle(alias, href) o usa un alias válido (${[...state.pageStyles.keys()].join(', ')})`,
  );
}

/**
 * Resuelve un input de `loadPageModules` a href + tipo de carga.
 *
 * - Alias de la tabla (`'demo-code'`, `'iswc-doc-demo-boot'`)
 * - Prefijo `classic:` → script clásico
 * - Prefijo `cdn:` en el href del spec → asset del kit (host/`?h=`)
 * - Path literal / URL → module por defecto
 */
function resolvePageModule(input: string): PageModuleSpec {
  if (typeof input !== 'string' || input === '') {
    throw new TypeError('resolvePageModule: input must be non-empty string');
  }
  const trimmed = input.trim();
  const alias = state.pageModules.get(trimmed);
  if (alias) return { ...alias };

  if (trimmed.startsWith('classic:')) {
    return asPageModuleSpec(trimmed);
  }

  if (
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    || trimmed.startsWith('//')
    || trimmed.startsWith('/')
    || trimmed.includes('/')
    || /\.(?:js|mjs|cjs|ts|tsx)(?:\?.*)?$/i.test(trimmed)
  ) {
    return { href: trimmed, type: 'module' };
  }

  throw new Error(
    `loadPageModules: alias desconocido "${trimmed}" — registra con L.registerPageModule(alias, href) o usa un alias válido (${[...state.pageModules.keys()].join(', ')})`,
  );
}

/** @deprecated usar resolvePageModule; se mantiene el nombre para callers internos viejos. */
function resolvePageModuleHref(input: string): string {
  return resolvePageModule(input).href;
}

async function resolvePageModuleUrl(spec: PageModuleSpec): Promise<string> {
  const href = spec.href;
  if (href.startsWith('cdn:')) {
    const rel = href.slice(4).replace(/^\.\//, '');
    const bases = orderBases(await coreAssetBases());
    return assetHref(bases[0] || SELF_BASE, rel);
  }
  return new URL(href, typeof location !== 'undefined' ? location.href : SELF_BASE).href;
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
    if ([...document.querySelectorAll('script[data-is-page-js]')].some((el) => (el as HTMLScriptElement).dataset.isPageJs === href)) {
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
      reject(new Error(`loadPageModules: classic script failed ${href}`));
    };
    document.head.appendChild(s);
  });
  jsDone.set(key, p);
  return p;
}

function normalizeQuery(input: unknown): Record<string, string> {
  if (input == null || input === '') return {};
  if (typeof input === 'string') {
    const q = input.replace(/^\?/, '');
    const out: Record<string, string> = {};
    for (const part of q.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      const k = eq < 0 ? part : part.slice(0, eq);
      const val = eq < 0 ? '' : part.slice(eq + 1);
      if (!k) continue;
      try {
        out[decodeURIComponent(k)] = decodeURIComponent(val);
      } catch {
        out[k] = val;
      }
    }
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

/** Ruta publicada + `?h=` del mapa. Si no hay hash, deja el href. */
function routeHref(href: string): string {
  if (!href) return href;
  let abs = href;
  try {
    const base = typeof location !== 'undefined' ? location.href : SELF_BASE;
    abs = new URL(href, base).href;
  } catch { /* href raro: se busca igual en el mapa */ }
  const hash = lookupHash(HASHES, abs) || lookupHash(HASHES, href);
  if (!hash) return href;
  if (/^https?:/i.test(href) || href.startsWith('//')) {
    const u = new URL(abs);
    if (u.searchParams.get('h') === hash) return u.href;
    u.searchParams.set('h', hash);
    return u.href;
  }
  return withAssetHash(href, hash);
}

function assetHref(base: string, rel: string): string {
  return routeHref(withQuery(new URL(rel.replace(/^\//, ''), slash(base)).href));
}

function cssNeedsLink(css: string): boolean {
  return /url\(\s*['"]?(?!data:|https?:|\/\/|#)/i.test(css);
}

function injectStyleText(key: string, css: string): void {
  if (cssDone.has(key)) return;
  if (typeof document === 'undefined') {
    cssDone.add(key);
    return;
  }
  const id = `is-cdn-css:${key}`;
  if (document.head.querySelector(`style[data-is-cdn-css="${id}"]`)) {
    cssDone.add(key);
    return;
  }
  const style = document.createElement('style');
  style.setAttribute('data-is-cdn-css', id);
  style.textContent = css;
  document.head.appendChild(style);
  cssDone.add(key);
}

/**
 * Bases del entry + CSS base (misma carpeta que loader.min.js).
 */
async function coreAssetBases(forcedRef?: string): Promise<string[]> {
  const ref = forcedRef ?? state.ref ?? (await resolveRef());
  const out: string[] = [];
  const push = (b: string): void => {
    const n = slash(b);
    if (!out.includes(n)) out.push(n);
  };
  // host = raíz dist/cdn → CSS en raíz y alias en core/
  if (state.host) {
    push(state.host);
    push(new URL('core/', state.host).href);
  } else if (state.preferSelf) {
    push(CDN_ROOT);
    push(SELF_BASE);
  } else {
    push(SELF_BASE);
  }
  const pushMirror = (m: { base: (ref?: string) => string }): void => {
    try {
      const root = m.base(ref);
      push(root);
      push(new URL('core/', root).href);
    } catch { /* mirror malo */ }
  };
  for (const m of state.mirrors) pushMirror(m);
  // Sin espejos CDN si el consumidor vació mirrors (modo local).
  if (!state.mirrorsExplicit || state.mirrors.length) {
    for (const m of DEFAULT_MIRRORS) pushMirror(m);
  }
  if (out.length <= 1 && (!state.mirrorsExplicit || state.mirrors.length)) {
    const root = jsdelivrBase(ref);
    push(root);
    push(new URL('core/', root).href);
  }
  return out;
}

async function cdnBases(forcedRef?: string): Promise<string[]> {
  const ref = forcedRef ?? state.ref ?? (await resolveRef());
  const out: string[] = [];
  const push = (b: string): void => {
    const n = slash(b);
    if (!out.includes(n)) out.push(n);
  };
  // host del consumidor manda: evita quedarse en un jsDelivr @main cacheado.
  if (state.host) push(state.host);
  else if (state.preferSelf) push(CDN_ROOT);
  for (const m of state.mirrors) {
    try { push(m.base(ref)); } catch { /* mirror malo */ }
  }
  // Cadena canónica solo si no estamos en modo local (mirrors=[] explícito).
  if (!state.mirrorsExplicit || state.mirrors.length > 0) {
    for (const m of DEFAULT_MIRRORS) {
      try { push(m.base(ref)); } catch { /* */ }
    }
  }
  if (!out.length) push(jsdelivrBase(ref));
  return out;
}

function injectStylesheet(href: string): Promise<void> {
  if (cssDone.has(href)) return Promise.resolve();
  if (typeof document === 'undefined') {
    cssDone.add(href);
    return Promise.resolve();
  }
  const existing = document.head.querySelector<HTMLElement>(`link[data-is-cdn-css="${href}"]`);
  if (existing) {
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
    link.onerror = () => reject(new Error(`CSS falló: ${href}`));
    document.head.appendChild(link);
  });
}

async function injectCdnStylesheet(rel: string): Promise<string> {
  const bases = orderBases(await coreAssetBases());
  const hash = lookupHash(HASHES, rel);
  const key = rel.replace(/^\.\//, '');
  if (hash) {
    const hit = await readBody(key, hash);
    if (hit != null && !cssNeedsLink(hit)) {
      injectStyleText(key, hit);
      return assetHref(bases[0] || SELF_BASE, rel);
    }
  }
  let last: Error | null = null;
  for (const base of bases) {
    const href = assetHref(base, rel);
    try {
      if (hash && typeof fetch === 'function') {
        const res = await fetch(href);
        if (!res.ok) throw new Error(`CSS ${res.status}: ${href}`);
        const text = await res.text();
        if (!cssNeedsLink(text)) {
          await writeBody(key, hash, text);
          injectStyleText(key, text);
          rememberBase(base);
          return href;
        }
      }
      await injectStylesheet(href);
      rememberBase(base);
      return href;
    } catch (e: unknown) {
      last = e instanceof Error ? e : new Error(String(e));
      cssDone.delete(href);
      cssDone.delete(key);
      if (typeof document !== 'undefined') {
        document.head.querySelector<HTMLElement>(`link[data-is-cdn-css="${href}"]`)?.remove();
      }
    }
  }
  throw last || new Error(`ISWebComponentsLoader: no hay espejo para ${rel}`);
}

function importOnce(href: string): Promise<void> {
  let p = jsDone.get(href);
  if (p) return p;
  p = (async () => {
    // Cache Storage: el módulo queda listo para la próxima visita.
    try {
      if (typeof caches !== 'undefined') {
        const c = await caches.open('is-wc-modules-v1');
        if (!(await c.match(href))) {
          const res = await fetch(href);
          if (res.ok) await c.put(href, res.clone());
        }
      }
    } catch { /* privado / sin caches */ }
    await import(/* @vite-ignore */ href);
  })().then(() => undefined, (err: unknown) => {
    jsDone.delete(href);
    throw err;
  });
  jsDone.set(href, p);
  return p;
}

async function importCdn(rel: string): Promise<string> {
  const bases = orderBases(await cdnBases());
  let last: Error | null = null;
  for (const base of bases) {
    const href = assetHref(base, rel);
    try {
      await importOnce(href);
      rememberBase(base);
      return href;
    } catch (e: unknown) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last || new Error(`ISWebComponentsLoader: no hay espejo para ${rel}`);
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

function normalizeMirrors(input: string | Mirror | (string | Mirror)[]): Mirror[] {
  const list = Array.isArray(input) ? input : [input];
  const out: Mirror[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      if (item === 'jsdelivr') {
        out.push({ id: 'jsdelivr', label: 'jsDelivr', pin: true, base: (ref = 'main') => jsdelivrBase(ref) });
      } else if (item === 'githack') {
        out.push({
          id: 'githack',
          label: 'raw.githack',
          pin: true,
          base: (ref = 'main') => githackBase(ref),
        });
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

async function warmEntryCss(entry: AppComponentEntry): Promise<void> {
  const sheets = getSheetCache() as (SheetCacheApi & { calentar?: (list: string[]) => Promise<void> }) | null;
  if (!sheets?.calentar) return;
  const list: string[] = [];
  if (entry.css) {
    const css = Array.isArray(entry.css) ? entry.css : [entry.css];
    list.push(...css);
  } else if (entry.href) {
    list.push(entry.href.replace(/\.min\.js$/i, '.min.css').replace(/\.js$/i, '.css'));
  }
  if (list.length) await sheets.calentar(list.map((href) => routeHref(href)));
}

export interface ConfigureOpts {
  ref?: string | null;
  mirrors?: string | Mirror | (string | Mirror)[];
  preferSelf?: boolean;
  /**
   * Raíz de assets del kit.
   * - omitido: arranque (CDN pin o self)
   * - `'self'` | `'./'`: relativo al loader (`dist/cdn/`)
   * - ruta relativa: contra la página montada
   * - URL absoluta: tal cual
   */
  host?: string | null;
  /** Sustituye {{sha}} de hostDefault. Vacío usa shaDefault. */
  sha?: string | null;
  /** Sustituye {{cdnUrl}} de hostDefault. Vacío usa cdnUrlDefault. */
  cdnUrl?: string | null;
  query?: string | Record<string, string> | null;
  v?: string | number | null;
  /**
   * Galería / vendor local: host = self (`dist/cdn/` del loader), sin mirrors
   * CDN, sin pin SHA. Todas las cargas son relativas al kit montado.
   */
  local?: boolean;
}

export interface LoadResult {
  loaded: string[];
  skipped: string[];
}

export interface LoadedSnapshot {
  all: boolean;
  categories: string[];
  tags: string[];
  app: string[];
}

export interface LoaderSheets {
  install(opts?: { cacheName?: string }): SheetCacheApi | null;
  get(): SheetCacheApi | null;
  warm(hrefs: string[]): Promise<unknown>;
  warmFromCache(): Promise<unknown>;
  warmFromManifest(url: string, opts?: { base?: string; key?: string }): Promise<unknown>;
}

export const ISWebComponentsLoader = {
  get catalog(): Catalog { return CATALOG; },
  /** Mapa de hashes del build (`ruta` → 6 caracteres). */
  get hashes(): Record<string, string> { return HASHES; },
  /** Pega `?h=` si la ruta esta en el mapa. Lo usan adoptCss y las apps. */
  assetUrl(href: string): string { return routeHref(href); },
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

  /** API de caché de hojas (adoptedStyleSheets + Cache Storage). */
  sheets: {
    install(opts: { cacheName?: string } = {}) {
      return installSheetCache(opts);
    },
    get() {
      return getSheetCache();
    },
    warm(hrefs: string[]) {
      const s = getSheetCache() || installSheetCache();
      return s ? s.calentar(hrefs) : Promise.resolve();
    },
    warmFromCache() {
      const s = getSheetCache() || installSheetCache();
      return s ? s.calentarDesdeCache() : Promise.resolve();
    },
    warmFromManifest(url: string, opts: { base?: string; key?: string } = {}) {
      const s = getSheetCache() || installSheetCache();
      return s ? s.calentarDesdeManifiesto(url, opts) : Promise.resolve();
    },
  } satisfies LoaderSheets,

  async baseUrl(): Promise<string> {
    const bases = await cdnBases();
    return bases[0];
  },

  configure(opts: ConfigureOpts = {}) {
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
    if (!ref) throw new Error('ISWebComponentsLoader.pin: ref requerido');
    state.ref = String(ref);
    return this;
  },

  unpin() {
    state.ref = null;
    return this;
  },

  async resolvePin(): Promise<string> {
    return state.ref ?? (await resolveRef());
  },

  async listBases(): Promise<string[]> {
    return cdnBases();
  },

  async fallbackBases(): Promise<string[]> {
    const ref = await this.resolvePin();
    return fallbackBases(ref);
  },

  /**
   * Registra tags de la app (fuera del catálogo del kit). Luego `load('mi-tag')`
   * importa su `href` y calienta CSS vía sheet-cache si está instalado.
   */
  registerApp(
    map: Record<string, string | AppComponentEntry>,
    opts: { cacheName?: string; installSheets?: boolean } = {},
  ) {
    if (opts.installSheets !== false) {
      installSheetCache({ cacheName: opts.cacheName || 'is-sheets-v1' });
    } else if (opts.cacheName) {
      installSheetCache({ cacheName: opts.cacheName });
    }
    const baseDoc = typeof location !== 'undefined' ? location.href : SELF_BASE;
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
          };
      appComponents.set(tag, entry);
    }
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

  async loadPageStyles(hrefs: string[]) {
    const jobs = (hrefs || []).map(async (h) => {
      const resolved = resolvePageStyle(h);
      if ('cdn' in resolved) return injectCdnStylesheet(resolved.cdn);
      const abs = new URL(resolved.href, typeof location !== 'undefined' ? location.href : SELF_BASE).href;
      return injectStylesheet(routeHref(abs));
    });
    await Promise.all(jobs);
  },

  async loadPageModules(hrefs: string[]) {
    const jobs = (hrefs || []).map(async (h) => {
      const spec = resolvePageModule(h);
      const abs = await resolvePageModuleUrl(spec);
      const routed = routeHref(abs);
      if (spec.type === 'classic') return loadClassicOnce(routed);
      return importOnce(routed);
    });
    await Promise.all(jobs);
  },

  /**
   * Registra o reemplaza un alias para `loadPageModules`.
   * Útil para apps de terceros que montan sus propios gallery scripts.
   *
   * @param alias Nombre estable (sin `/`, sin extensión `.js`).
   * @param href Ruta relativa al host, `cdn:…` del kit, o `classic:…`.
   * @param opts.type `module` (default) | `classic` (IIFE / `<script>` sin type=module).
   */
  registerPageModule(alias: string, href: string, opts?: { type?: PageModuleKind }) {
    if (typeof alias !== 'string' || alias === '') throw new TypeError('registerPageModule: alias required');
    if (typeof href !== 'string' || href === '') throw new TypeError('registerPageModule: href required');
    const spec = asPageModuleSpec(opts?.type ? { href, type: opts.type } : href);
    state.pageModules.set(alias, spec);
    return this;
  },

  /**
   * Alias de CSS para `loadPageStyles`.
   * - `href` normal → relativa a la página
   * - `cdn:palettes.min.css` → hoja del kit (host/`?h=`)
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
   * Carga tags/categorías/`all` (kit) y tags registrados con `registerApp`.
   */
  async load(...args: (string | Record<string, unknown>)[]): Promise<LoadResult> {
    // parseArgs es rest: pasar `args` suelto (no el array como único argumento)
    // o `ids` sale siempre vacío y load() no carga nada (regresión del paso a
    // TS: `parseArgs(args)` con firma `(...args)` → ids=[] en silencio).
    const { ids } = parseArgs(...args);
    if (!ids.length) return { loaded: [], skipped: [] };

    const kitIds: string[] = [];
    const appIds: string[] = [];
    const skipped: string[] = [];

    for (const id of ids) {
      const raw = normTag(id);
      if (appComponents.has(raw)) {
        if (registry.tags.has(raw)) skipped.push(raw);
        else appIds.push(raw);
        continue;
      }
      kitIds.push(id);
    }

    const loaded: string[] = [];

    if (kitIds.length) {
      const planned = planLoads(kitIds, registry, CATALOG);
      skipped.push(...planned.skipped);
      await Promise.all(planned.jobs.map((j: LoadJob) => importCdn(j.path)));
      commitLoads(planned.jobs, registry, CATALOG);
      loaded.push(...planned.jobs.map((j: LoadJob) => j.path));
    }

    for (const tag of appIds) {
      const entry = appComponents.get(tag);
      if (!entry) continue;
      await warmEntryCss(entry);
      await importOnce(routeHref(entry.href));
      registry.tags.add(tag);
      loaded.push(entry.href);
    }

    return { loaded, skipped };
  },

  /**
   * Asegura que el custom element esté definido: load(tag) si hace falta + whenDefined.
   */
  async ensure(tag: string, opts: { href?: string } = {}): Promise<boolean> {
    const name = normTag(tag);
    if (isElementReady(name)) return true;

    if (appComponents.has(name) || resolveTagId(tag, CATALOG) || CATALOG.categories[CATALOG.aliases[name] || name]) {
      return ensureElement(name, {
        load: async () => {
          await this.load(tag);
        },
        href: opts.href,
      });
    }

    if (opts.href) {
      return ensureElement(name, { href: opts.href });
    }

    try {
      await this.load(tag);
      await customElements.whenDefined(name);
      return isElementReady(name);
    } catch {
      return false;
    }
  },

  isReady: isElementReady,
};

if (typeof globalThis !== 'undefined' && !(globalThis as Record<string, unknown>).ISWebComponentsLoader) {
  // Idempotente: si el loader ya está registrado (caso típico: un page bundle
  // bundleó el loader dentro y se ejecuta después del boot canónico desde
  // `dist/cdn/core/loader.min.js`), la primera instancia gana. Si tomáramos la
  // del bundle, su SELF_BASE/CDN_ROOT sería la ruta del bundle (`dist/pages/…`)
  // y `L.load(tag)` pediría URLs tipo `dist/pages/{cat}/{tag}.min.js` → 48× 404
  // en cada nav-click posterior. Guardian: tests/loader-global-guardian.test.ts.
  (globalThis as Record<string, unknown>).ISWebComponentsLoader = ISWebComponentsLoader;
}

syncHashMemory(HASHES);

if (typeof document !== 'undefined') {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]');
  for (const link of links) {
    const next = routeHref(link.href);
    if (next && next !== link.href) link.href = next;
  }
  // W52: auto-cargar is-base.min.css al inicializar el loader, para que el
  // consumer no tenga que hacerlo manualmente. Es idempotente (cssDone Set)
  // y respeta host/pin/mirrors del loader.
  void injectCdnStylesheet('is-base.min.css');
}

export default ISWebComponentsLoader;
export { planLoads, commitLoads, createRegistry, tagKey };
export { installSheetCache, getSheetCache, createSheetCache };
export { ensureElement, isElementReady };

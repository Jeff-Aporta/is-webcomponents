/**
 * ISWebComponentsLoader — entry CDN liviano + mirrors + pin + anti-redundancia.
 *
 * - loadCSSBase / loadCSSPalettesDefault / load(tags|cats|all)
 * - pin(ref) / unpin() / configure({ ref, mirrors })
 * - sheets.install / warm* — Cache Storage + adoptedStyleSheets (apps)
 * - registerApp / ensure — tags de app + lazy ensure de custom elements
 * - Fallbacks entre espejos (jsDelivr → Pages)
 * - Registro persistente: si ya cargaste `actions`, `load('is-button')` no re-fetch
 * - loadPageStyles / loadPageModules para la galería
 *
 * Docs: ./loader.md (también en dist/cdn/core/loader.md)
 * Build sustituye __IS_LOADER_CATALOG__.
 */
import {
  resolveRef,
  jsdelivrBase,
  pagesBase,
  MIRRORS as DEFAULT_MIRRORS,
  mirrorById,
  fallbackBases,
  GH_REPO,
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

declare const __IS_LOADER_CATALOG__: Catalog;

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

const SELF_BASE = new URL('./', import.meta.url).href.replace(/\/?$/, '/');

/** Raíz del CDN (`dist/cdn/`); este módulo vive en `core/`. */
const CDN_ROOT = /\/core\/$/i.test(SELF_BASE)
  ? new URL('../', SELF_BASE).href.replace(/\/?$/, '/')
  : SELF_BASE;

interface LoaderState {
  ref: string | null;
  mirrors: Mirror[];
  preferSelf: boolean;
  /** Raíz `dist/cdn/` forzada por el consumidor (githack, local, SHA…). */
  host: string | null;
  /** Query de cache-bust en cada asset (`?v=2`). */
  query: Record<string, string>;
  /**
   * Aliases para `loadPageModules` / `loadPageStyles`. Permiten que el consumidor
   * pase un nombre estable (`'highlight-pre'`, `'demo-code'`) y el loader lo
   * resuelva internamente al bundle desplegable (`'dist/scripts/highlight-pre.min.js'`).
   *
   * Esto hace retrocompatible el API ante renames de archivo o cambios de
   * carpeta. Los nombres de los aliases son el contrato público; las URLs
   * internas son detalle de implementación.
   */
  pageModules: Map<string, string>;
}

const state: LoaderState = {
  ref: null,
  mirrors: DEFAULT_MIRRORS.map((m) => ({ ...m })),
  preferSelf: true,
  host: null,
  query: {},
  // Aliases estables para `loadPageModules`. Si cambia una URL, el consumidor
  // no se entera: solo hay que actualizar este mapa en una versión mayor del
  // loader y/o añadir migración en runtime.
  pageModules: new Map<string, string>([
    ['highlight-pre',   'dist/scripts/highlight-pre.min.js'],
    ['demo-code',       'dist/scripts/demo-code.min.js'],
    ['docs-chrome',     'dist/scripts/docs-chrome.min.js'],
    ['cdn-panel',       'dist/scripts/cdn-panel.min.js'],
    ['view-sources',    'dist/scripts/view-sources.min.js'],
    ['demo-file-meta',  'dist/scripts/demo-file-meta.min.js'],
    // Aliases legacy (pre-rename). Mantener para retrocompatibilidad: si un
    // consumidor llama `L.loadPageModules(['scripts/demo-code.js'])` lo
    // tratamos como path literal.
  ]),
};

/** Registro de lo ya cargado en esta página (anti-redundancia). */
const registry = createRegistry();

/** Tags de la app consumidora (fuera del catálogo del kit). */
const appComponents = new Map<string, AppComponentEntry>();

const cssDone = new Set<string>();
const jsDone = new Map<string, Promise<void>>();

/**
 * Resuelve un input de `loadPageModules` / `loadPageStyles` a una URL
 * relativa al host de la página.
 *
 * Comportamiento:
 *  - Si el input es una URL absoluta (empieza por `http://`, `https://`,
 *    `//`, `/`, `data:`) o contiene `/` o tiene extensión `.js`/`.mjs`/
 *    `.css`/`.ts`/`.tsx`, se trata como **path literal**.
 *  - Si el input es un nombre simple (`'demo-code'`, `'highlight-pre'`)
 *    sin `/` y sin extensión, se busca en el alias table.
 *
 * Esto garantiza retrocompatibilidad: el código viejo que pasaba paths
 * literales (`'scripts/demo-code.js'`) sigue funcionando; el código nuevo
 * que pasa aliases (`'demo-code'`) obtiene URLs estables ante renames.
 */
function resolvePageModuleHref(input: string): string {
  if (typeof input !== 'string' || input === '') {
    throw new TypeError('resolvePageModuleHref: input must be non-empty string');
  }
  const trimmed = input.trim();
  // URL absoluta (cross-origin) o esquema → tratar literal.
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed) // http:, https:, data:, blob:, etc.
    || trimmed.startsWith('//')
    || trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  // Path con separador o extensión reconocible → tratar literal (retrocompat).
  if (trimmed.includes('/') || /\.(?:js|mjs|cjs|ts|tsx|css)(?:\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  // Nombre simple → alias table.
  const found = state.pageModules.get(trimmed);
  if (!found) {
    // Fail loud: el consumidor pasó un alias desconocido.
    throw new Error(`loadPageModules: alias desconocido "${trimmed}" — registra con L.registerPageModule(alias, href) o usa un alias válido (${[...state.pageModules.keys()].join(', ')})`);
  }
  return found;
}

const slash = (u: string): string => (u.endsWith('/') ? u : `${u}/`);

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

function assetHref(base: string, rel: string): string {
  return withQuery(new URL(rel.replace(/^\//, ''), slash(base)).href);
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
  } else {
    push(SELF_BASE);
  }
  for (const m of state.mirrors) {
    try {
      const root = m.base(ref);
      push(root);
      push(new URL('core/', root).href);
    } catch { /* mirror malo */ }
  }
  if (out.length <= 1) {
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
  const bases = await coreAssetBases();
  let last: Error | null = null;
  for (const base of bases) {
    const href = assetHref(base, rel);
    try {
      await injectStylesheet(href);
      return href;
    } catch (e: unknown) {
      last = e instanceof Error ? e : new Error(String(e));
      cssDone.delete(href);
      document.head.querySelector<HTMLElement>(`link[data-is-cdn-css="${href}"]`)?.remove();
    }
  }
  throw last || new Error(`ISWebComponentsLoader: no hay espejo para ${rel}`);
}

function importOnce(href: string): Promise<void> {
  let p = jsDone.get(href);
  if (p) return p;
  p = import(/* @vite-ignore */ href).then(() => undefined, (err: unknown) => {
    jsDone.delete(href);
    throw err;
  });
  jsDone.set(href, p);
  return p;
}

async function importCdn(rel: string): Promise<string> {
  const bases = await cdnBases();
  let last: Error | null = null;
  for (const base of bases) {
    const href = assetHref(base, rel);
    try {
      await importOnce(href);
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
      } else if (item === 'pages') {
        out.push({ id: 'pages', label: 'GitHub Pages', pin: false, base: () => pagesBase() });
      } else if (item === 'githack') {
        // Tip de GitHub con MIME JS (evita caché vieja de jsDelivr @main).
        out.push({
          id: 'githack',
          label: 'raw.githack',
          pin: false,
          base: () => `https://raw.githack.com/${GH_REPO}/main/dist/cdn`,
        });
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
  return out.length ? out : DEFAULT_MIRRORS.map((m) => ({ ...m }));
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
  if (list.length) await sheets.calentar(list);
}

export interface ConfigureOpts {
  ref?: string | null;
  mirrors?: string | Mirror | (string | Mirror)[];
  preferSelf?: boolean;
  host?: string | null;
  query?: string | Record<string, string> | null;
  v?: string | number | null;
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
  get repo(): string { return GH_REPO; },
  get mirrors(): Mirror[] { return state.mirrors.slice(); },
  get selfBase(): string { return SELF_BASE; },
  /** Raíz CDN forzada por `configure({ host })`, o null. */
  get host(): string | null { return state.host; },
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
    if ('ref' in opts) state.ref = opts.ref == null || opts.ref === '' ? null : String(opts.ref);
    if ('mirrors' in opts && opts.mirrors != null) state.mirrors = normalizeMirrors(opts.mirrors);
    if (typeof opts.preferSelf === 'boolean') state.preferSelf = opts.preferSelf;
    if ('host' in opts) {
      state.host = opts.host == null || opts.host === '' ? null : slash(String(opts.host));
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

  loadCSSBase() {
    return injectCdnStylesheet('is-base.min.css');
  },

  loadCSSPalettesDefault() {
    return injectCdnStylesheet('palettes.min.css');
  },

  async loadPageStyles(hrefs: string[]) {
    const jobs = (hrefs || []).map((h) => {
      const abs = new URL(resolvePageModuleHref(h), typeof location !== 'undefined' ? location.href : SELF_BASE).href;
      return injectStylesheet(abs);
    });
    await Promise.all(jobs);
  },

  async loadPageModules(hrefs: string[]) {
    const jobs = (hrefs || []).map((h) => {
      const abs = new URL(resolvePageModuleHref(h), typeof location !== 'undefined' ? location.href : SELF_BASE).href;
      return importOnce(abs);
    });
    await Promise.all(jobs);
  },

  /**
   * Registra o reemplaza un alias para `loadPageModules` / `loadPageStyles`.
   * Útil para apps de terceros que montan sus propios gallery scripts.
   *
   * Retrocompat: si el `alias` ya existe, se sobreescribe.
   *
   * @param alias Nombre estable (sin `/`, sin extensión `.js`).
   * @param href Ruta relativa al host (`'dist/scripts/foo.min.js'` o absoluta).
   */
  registerPageModule(alias: string, href: string) {
    if (typeof alias !== 'string' || alias === '') throw new TypeError('registerPageModule: alias required');
    if (typeof href !== 'string' || href === '') throw new TypeError('registerPageModule: href required');
    state.pageModules.set(alias, href);
    return this;
  },

  /**
   * Devuelve el alias-table actual (copia superficial — modificar `Map` no
   * afecta al estado, pero sí los objetos individuales por referencia).
   */
  getPageModules(): Record<string, string> {
    return Object.fromEntries(state.pageModules);
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
      await importOnce(entry.href);
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

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).ISWebComponentsLoader = ISWebComponentsLoader;
}

export default ISWebComponentsLoader;
export { planLoads, commitLoads, createRegistry, tagKey };
export { installSheetCache, getSheetCache, createSheetCache };
export { ensureElement, isElementReady };

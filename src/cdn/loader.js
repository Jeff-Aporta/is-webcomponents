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
 * Docs: ./loader.md (también en dist/cdn/loader.md)
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
} from './load-plan.js';
import { installSheetCache, getSheetCache, createSheetCache } from './sheet-cache.js';
import { ensureElement, isElementReady } from './ensure-element.js';

/** @typedef {{ category: string, file: string }} TagEntry */
/** @typedef {{ categories: Record<string, string[]>, tags: Record<string, TagEntry>, aliases: Record<string, string> }} Catalog */
/** @typedef {{ id: string, label?: string, hint?: string, pin?: boolean, base: (ref?: string) => string }} Mirror */
/** @typedef {{ href: string, css?: string | string[] }} AppComponentEntry */

/** @type {Catalog} */
const CATALOG = __IS_LOADER_CATALOG__;

const SELF_BASE = new URL('./', import.meta.url).href.replace(/\/?$/, '/');

/** @type {{ ref: string | null, mirrors: Mirror[], preferSelf: boolean }} */
const state = {
  ref: null,
  mirrors: DEFAULT_MIRRORS.map((m) => ({ ...m })),
  preferSelf: true,
};

/** Registro de lo ya cargado en esta página (anti-redundancia). */
const registry = createRegistry();

/** Tags de la app consumidora (fuera del catálogo del kit). */
/** @type {Map<string, AppComponentEntry>} */
const appComponents = new Map();

/** @type {Set<string>} */
const cssDone = new Set();
/** @type {Map<string, Promise<void>>} */
const jsDone = new Map();

const slash = (u) => (u.endsWith('/') ? u : `${u}/`);

/**
 * @param {string} [forcedRef]
 * @returns {Promise<string[]>}
 */
async function cdnBases(forcedRef) {
  const ref = forcedRef ?? state.ref ?? (await resolveRef());
  /** @type {string[]} */
  const out = [];
  const push = (b) => {
    const n = slash(b);
    if (!out.includes(n)) out.push(n);
  };
  if (state.preferSelf) push(SELF_BASE);
  for (const m of state.mirrors) {
    try { push(m.base(ref)); } catch { /* mirror malo */ }
  }
  if (!out.length) push(jsdelivrBase(ref));
  return out;
}

/**
 * @param {string} href
 * @returns {Promise<void>}
 */
function injectStylesheet(href) {
  if (cssDone.has(href)) return Promise.resolve();
  if (typeof document === 'undefined') {
    cssDone.add(href);
    return Promise.resolve();
  }
  const existing = document.head.querySelector(`link[data-is-cdn-css="${href}"]`);
  if (existing) {
    cssDone.add(href);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
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

/**
 * @param {string} rel
 */
async function injectCdnStylesheet(rel) {
  const bases = await cdnBases();
  /** @type {Error | null} */
  let last = null;
  for (const base of bases) {
    const href = new URL(rel.replace(/^\//, ''), base).href;
    try {
      await injectStylesheet(href);
      return href;
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      cssDone.delete(href);
      document.head.querySelector(`link[data-is-cdn-css="${href}"]`)?.remove();
    }
  }
  throw last || new Error(`ISWebComponentsLoader: no hay espejo para ${rel}`);
}

/**
 * @param {string} href
 * @returns {Promise<void>}
 */
function importOnce(href) {
  let p = jsDone.get(href);
  if (p) return p;
  p = import(/* @vite-ignore */ href).then(() => undefined, (err) => {
    jsDone.delete(href);
    throw err;
  });
  jsDone.set(href, p);
  return p;
}

/**
 * @param {string} rel
 * @returns {Promise<string>}
 */
async function importCdn(rel) {
  const bases = await cdnBases();
  /** @type {Error | null} */
  let last = null;
  for (const base of bases) {
    const href = new URL(rel.replace(/^\//, ''), base).href;
    try {
      await importOnce(href);
      return href;
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last || new Error(`ISWebComponentsLoader: no hay espejo para ${rel}`);
}

/**
 * @param {...(string | Record<string, unknown>)} args
 */
function parseArgs(args) {
  /** @type {string[]} */
  const ids = [];
  /** @type {Record<string, unknown>} */
  let opts = {};
  for (const a of args) {
    if (a && typeof a === 'object' && !Array.isArray(a)) {
      opts = /** @type {Record<string, unknown>} */ (a);
    } else if (typeof a === 'string' && a.trim()) {
      ids.push(a.trim());
    }
  }
  return { ids, opts };
}

/**
 * @param {string | Mirror | (string | Mirror)[]} input
 * @returns {Mirror[]}
 */
function normalizeMirrors(input) {
  const list = Array.isArray(input) ? input : [input];
  /** @type {Mirror[]} */
  const out = [];
  for (const item of list) {
    if (typeof item === 'string') {
      if (item === 'jsdelivr') {
        out.push({ id: 'jsdelivr', label: 'jsDelivr', pin: true, base: (ref = 'main') => jsdelivrBase(ref) });
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
  return out.length ? out : DEFAULT_MIRRORS.map((m) => ({ ...m }));
}

/** @param {string} id */
function normTag(id) {
  return String(id || '').trim().toLowerCase();
}

/** @param {AppComponentEntry} entry */
async function warmEntryCss(entry) {
  const sheets = getSheetCache();
  if (!sheets?.calentar) return;
  const list = [];
  if (entry.css) {
    const css = Array.isArray(entry.css) ? entry.css : [entry.css];
    list.push(...css);
  } else if (entry.href) {
    list.push(entry.href.replace(/\.min\.js$/i, '.min.css').replace(/\.js$/i, '.css'));
  }
  if (list.length) await sheets.calentar(list);
}

export const ISWebComponentsLoader = {
  get catalog() { return CATALOG; },
  get repo() { return GH_REPO; },
  get mirrors() { return state.mirrors.slice(); },
  get selfBase() { return SELF_BASE; },

  /** API de caché de hojas (adoptedStyleSheets + Cache Storage). */
  sheets: {
    /** @param {{ cacheName?: string }} [opts] */
    install(opts = {}) {
      return installSheetCache(opts);
    },
    get() {
      return getSheetCache();
    },
    /** @param {string[]} hrefs */
    warm(hrefs) {
      const s = getSheetCache() || installSheetCache();
      return s ? s.calentar(hrefs) : Promise.resolve();
    },
    warmFromCache() {
      const s = getSheetCache() || installSheetCache();
      return s ? s.calentarDesdeCache() : Promise.resolve();
    },
    /**
     * @param {string} url
     * @param {{ base?: string, key?: string }} [opts]
     */
    warmFromManifest(url, opts = {}) {
      const s = getSheetCache() || installSheetCache();
      return s ? s.calentarDesdeManifiesto(url, opts) : Promise.resolve();
    },
  },

  async baseUrl() {
    const bases = await cdnBases();
    return bases[0];
  },

  /**
   * @param {{ ref?: string | null, mirrors?: string | Mirror | (string | Mirror)[], preferSelf?: boolean }} opts
   */
  configure(opts = {}) {
    if ('ref' in opts) state.ref = opts.ref == null || opts.ref === '' ? null : String(opts.ref);
    if ('mirrors' in opts && opts.mirrors != null) state.mirrors = normalizeMirrors(opts.mirrors);
    if (typeof opts.preferSelf === 'boolean') state.preferSelf = opts.preferSelf;
    return this;
  },

  pin(ref) {
    if (!ref) throw new Error('ISWebComponentsLoader.pin: ref requerido');
    state.ref = String(ref);
    return this;
  },

  unpin() {
    state.ref = null;
    return this;
  },

  async resolvePin() {
    return state.ref ?? (await resolveRef());
  },

  async listBases() {
    return cdnBases();
  },

  async fallbackBases() {
    const ref = await this.resolvePin();
    return fallbackBases(ref);
  },

  /**
   * Registra tags de la app (fuera del catálogo del kit). Luego `load('mi-tag')`
   * importa su `href` y calienta CSS vía sheet-cache si está instalado.
   *
   * @param {Record<string, string | AppComponentEntry>} map
   * @param {{ cacheName?: string, installSheets?: boolean }} [opts]
   */
  registerApp(map, opts = {}) {
    if (opts.installSheets !== false) {
      installSheetCache({ cacheName: opts.cacheName || 'is-sheets-v1' });
    } else if (opts.cacheName) {
      installSheetCache({ cacheName: opts.cacheName });
    }
    const baseDoc = typeof location !== 'undefined' ? location.href : SELF_BASE;
    for (const [raw, value] of Object.entries(map || {})) {
      const tag = normTag(raw);
      if (!tag) continue;
      const entry = typeof value === 'string'
        ? { href: new URL(value, baseDoc).href }
        : {
            href: new URL(value.href, baseDoc).href,
            css: value.css
              ? (Array.isArray(value.css) ? value.css : [value.css]).map((c) => new URL(c, baseDoc).href)
              : undefined,
          };
      appComponents.set(tag, entry);
    }
    return this;
  },

  /** Tags registrados por la app. */
  getAppComponents() {
    return Object.fromEntries([...appComponents.entries()].map(([k, v]) => [k, { ...v }]));
  },

  /**
   * ¿Ya está cubierto (por tag, su categoría, `all`, o app registry cargado)?
   * @param {string} id
   */
  has(id) {
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
  getLoaded() {
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

  /**
   * @param {string[]} hrefs
   */
  async loadPageStyles(hrefs) {
    const jobs = (hrefs || []).map((h) => {
      const abs = new URL(h, typeof location !== 'undefined' ? location.href : SELF_BASE).href;
      return injectStylesheet(abs);
    });
    await Promise.all(jobs);
  },

  /**
   * @param {string[]} hrefs
   */
  async loadPageModules(hrefs) {
    const jobs = (hrefs || []).map((h) => {
      const abs = new URL(h, typeof location !== 'undefined' ? location.href : SELF_BASE).href;
      return importOnce(abs);
    });
    await Promise.all(jobs);
  },

  /**
   * Carga tags/categorías/`all` (kit) y tags registrados con `registerApp`.
   * @param {...(string | Record<string, unknown>)} args
   * @returns {Promise<{ loaded: string[], skipped: string[] }>}
   */
  async load(...args) {
    const { ids } = parseArgs(args);
    if (!ids.length) return { loaded: [], skipped: [] };

    /** @type {string[]} */
    const kitIds = [];
    /** @type {string[]} */
    const appIds = [];
    /** @type {string[]} */
    const skipped = [];

    for (const id of ids) {
      const raw = normTag(id);
      if (appComponents.has(raw)) {
        if (registry.tags.has(raw)) skipped.push(raw);
        else appIds.push(raw);
        continue;
      }
      kitIds.push(id);
    }

    /** @type {string[]} */
    const loaded = [];

    if (kitIds.length) {
      const planned = planLoads(kitIds, registry, CATALOG);
      skipped.push(...planned.skipped);
      await Promise.all(planned.jobs.map((j) => importCdn(j.path)));
      commitLoads(planned.jobs, registry, CATALOG);
      loaded.push(...planned.jobs.map((j) => j.path));
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
   * @param {string} tag
   * @param {{ href?: string }} [opts]
   */
  async ensure(tag, opts = {}) {
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
  globalThis.ISWebComponentsLoader = ISWebComponentsLoader;
}

export default ISWebComponentsLoader;
export { planLoads, commitLoads, createRegistry, tagKey };
export { installSheetCache, getSheetCache, createSheetCache };
export { ensureElement, isElementReady };

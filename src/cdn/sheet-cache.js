/**
 * sheet-cache — Cache Storage + adoptedStyleSheets para CSS de ShadowRoot.
 *
 * Intercepta `ShadowRoot.prototype.prepend` de `<link rel=stylesheet>`:
 * si la hoja ya está en memoria, la adopta sin flicker; si no, deja el link
 * y descarga en paralelo (Cache → red) para la próxima visita.
 *
 * Uso vía loader: `L.sheets.install({ cacheName })` antes de `L.load(...)`.
 */

const GLOBAL_KEY = '__isSheetCache';

/**
 * @typedef {{
 *   cacheName: string,
 *   hojas: Map<string, CSSStyleSheet>,
 *   cargas: Map<string, Promise<CSSStyleSheet | null>>,
 *   descargar: (href: string) => Promise<CSSStyleSheet | null>,
 *   calentar: (hrefs: string[]) => Promise<unknown>,
 *   calentarDesdeCache: () => Promise<unknown>,
 *   calentarDesdeManifiesto: (url: string, opts?: { base?: string, key?: string }) => Promise<unknown>,
 * }} SheetCacheApi
 */

/** @type {boolean} */
let prependInstalled = false;

/**
 * @param {{ cacheName?: string, globalKey?: string, patchPrepend?: boolean }} [opts]
 * @returns {SheetCacheApi | null}
 */
export function createSheetCache(opts = {}) {
  const cacheName = String(opts.cacheName || 'is-sheets-v1');
  const globalKey = String(opts.globalKey || GLOBAL_KEY);
  const patchPrepend = opts.patchPrepend !== false;

  let soporta = false;
  try {
    soporta =
      typeof ShadowRoot !== 'undefined' &&
      'adoptedStyleSheets' in ShadowRoot.prototype &&
      typeof new CSSStyleSheet().replaceSync === 'function';
  } catch {
    soporta = false;
  }
  if (!soporta) return null;

  /** @type {Map<string, CSSStyleSheet>} */
  const hojas = new Map();
  /** @type {Map<string, Promise<CSSStyleSheet | null>>} */
  const cargas = new Map();
  const cacheApi = typeof caches !== 'undefined' ? caches : null;

  /** @param {ShadowRoot} shadow @param {CSSStyleSheet} hoja */
  function adoptar(shadow, hoja) {
    if (shadow.adoptedStyleSheets.indexOf(hoja) === -1) {
      shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.concat(hoja);
    }
  }

  /** @param {string} texto @param {string} href */
  function construir(texto, href) {
    const hoja = new CSSStyleSheet();
    hoja.replaceSync(texto);
    hojas.set(href, hoja);
    return hoja;
  }

  /** @param {string} href @param {string} texto */
  function persistir(href, texto) {
    if (!cacheApi) return;
    cacheApi
      .open(cacheName)
      .then((c) => c.put(href, new Response(texto, { headers: { 'Content-Type': 'text/css' } })))
      .catch(() => {});
  }

  /** @param {string} href */
  function leerCache(href) {
    if (!cacheApi) return Promise.resolve(null);
    return cacheApi
      .open(cacheName)
      .then((c) => c.match(href))
      .then((r) => (r && r.ok ? r.text() : null))
      .catch(() => null);
  }

  /** @param {string} href */
  function descargar(href) {
    const enCurso = cargas.get(href);
    if (enCurso) return enCurso;
    if (hojas.has(href)) return Promise.resolve(hojas.get(href) ?? null);

    const carga = leerCache(href)
      .then((cached) => {
        if (cached != null) return construir(cached, href);
        return fetch(href).then((r) => {
          if (!r.ok) throw new Error(`${r.status} ${href}`);
          return r.text().then((texto) => {
            persistir(href, texto);
            return construir(texto, href);
          });
        });
      })
      .catch(() => null);

    cargas.set(href, carga);
    return carga;
  }

  /** @param {string[]} hrefs */
  function calentar(hrefs) {
    const lista = Array.isArray(hrefs) ? hrefs : [];
    const base = typeof location !== 'undefined' ? location.href : undefined;
    return Promise.all(
      lista.map((h) => {
        try {
          return descargar(new URL(h, base).href);
        } catch {
          return null;
        }
      }),
    );
  }

  function calentarDesdeCache() {
    if (!cacheApi) return Promise.resolve();
    return cacheApi
      .open(cacheName)
      .then((c) =>
        c.keys().then((reqs) =>
          Promise.all(
            reqs.map((req) => {
              const href = req.url;
              if (hojas.has(href)) return null;
              return c.match(req).then((r) => {
                if (!r || !r.ok) return null;
                return r.text().then((texto) => {
                  construir(texto, href);
                });
              });
            }),
          ),
        ),
      )
      .catch(() => {});
  }

  /**
   * @param {string} url
   * @param {{ base?: string, key?: string }} [manOpts]
   */
  async function calentarDesdeManifiesto(url, manOpts = {}) {
    const baseDoc = typeof location !== 'undefined' ? location.href : undefined;
    const abs = new URL(url, baseDoc).href;
    const res = await fetch(abs, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`${res.status} ${abs}`);
    const data = await res.json();
    const key = manOpts.key || 'hojas';
    const rels = Array.isArray(data?.[key]) ? data[key] : Array.isArray(data) ? data : [];
    const base = manOpts.base
      ? new URL(manOpts.base, baseDoc).href
      : new URL('.', abs).href;
    const hrefs = rels.map((rel) => new URL(String(rel).replace(/^\.\//, ''), base).href);
    return calentar(hrefs);
  }

  if (patchPrepend && typeof ShadowRoot !== 'undefined' && !prependInstalled) {
    prependInstalled = true;
    const prependOriginal = ShadowRoot.prototype.prepend;

    /** @param {Node} nodo */
    function hrefDeHoja(nodo) {
      if (!nodo || nodo.nodeType !== 1 || /** @type {Element} */ (nodo).tagName !== 'LINK') return '';
      const link = /** @type {HTMLLinkElement} */ (nodo);
      if (link.rel !== 'stylesheet' || !link.href) return '';
      return link.href;
    }

    ShadowRoot.prototype.prepend = function patchedPrepend(...args) {
      const api = typeof globalThis !== 'undefined' ? globalThis[globalKey] : null;
      const map = api?.hojas;
      const restantes = [];
      for (const nodo of args) {
        const href = hrefDeHoja(nodo);
        if (!href) {
          restantes.push(nodo);
          continue;
        }
        const hoja = map?.get(href);
        if (hoja) {
          if (this.adoptedStyleSheets.indexOf(hoja) === -1) {
            this.adoptedStyleSheets = this.adoptedStyleSheets.concat(hoja);
          }
          continue;
        }
        restantes.push(nodo);
        if (api?.descargar) void api.descargar(href);
      }
      if (restantes.length) prependOriginal.apply(this, restantes);
    };
  }

  /** @type {SheetCacheApi} */
  const api = {
    cacheName,
    hojas,
    cargas,
    descargar,
    calentar,
    calentarDesdeCache,
    calentarDesdeManifiesto,
  };

  if (typeof globalThis !== 'undefined') {
    globalThis[globalKey] = api;
    // Alias legacy PatyIA
    if (!globalThis.__patyHojas) globalThis.__patyHojas = api;
  }

  return api;
}

/**
 * Instala (o reusa) el caché global. Idempotente por `cacheName`.
 * @param {{ cacheName?: string, globalKey?: string }} [opts]
 * @returns {SheetCacheApi | null}
 */
export function installSheetCache(opts = {}) {
  const globalKey = String(opts.globalKey || GLOBAL_KEY);
  const existing = typeof globalThis !== 'undefined' ? globalThis[globalKey] : null;
  if (existing?.descargar && existing?.calentar) {
    if (opts.cacheName && existing.cacheName && existing.cacheName !== opts.cacheName) {
      return createSheetCache(opts);
    }
    return existing;
  }
  return createSheetCache(opts);
}

/** @returns {SheetCacheApi | null} */
export function getSheetCache(globalKey = GLOBAL_KEY) {
  if (typeof globalThis === 'undefined') return null;
  return globalThis[globalKey] || globalThis.__patyHojas || null;
}

export { GLOBAL_KEY as SHEET_CACHE_GLOBAL_KEY };

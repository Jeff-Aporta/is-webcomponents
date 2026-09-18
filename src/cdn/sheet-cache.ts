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

export interface SheetCacheOpts {
  cacheName?: string;
  globalKey?: string;
  patchPrepend?: boolean;
}

export interface SheetCacheManifestOpts {
  base?: string;
  key?: string;
}

export interface SheetCacheApi {
  cacheName: string;
  hojas: Map<string, CSSStyleSheet>;
  cargas: Map<string, Promise<CSSStyleSheet | null>>;
  descargar: (href: string) => Promise<CSSStyleSheet | null>;
  calentar: (hrefs: string[]) => Promise<unknown>;
  calentarDesdeCache: () => Promise<unknown>;
  calentarDesdeManifiesto: (url: string, opts?: SheetCacheManifestOpts) => Promise<unknown>;
}

let prependInstalled = false;

export function createSheetCache(opts: SheetCacheOpts = {}): SheetCacheApi | null {
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

  const hojas = new Map<string, CSSStyleSheet>();
  const cargas = new Map<string, Promise<CSSStyleSheet | null>>();
  const cacheApi: CacheStorage | null = typeof caches !== 'undefined' ? caches : null;

  function adoptar(shadow: ShadowRoot, hoja: CSSStyleSheet): void {
    if (shadow.adoptedStyleSheets.indexOf(hoja) === -1) {
      shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.concat(hoja);
    }
  }

  function construir(texto: string, href: string): CSSStyleSheet {
    const hoja = new CSSStyleSheet();
    hoja.replaceSync(texto);
    hojas.set(href, hoja);
    return hoja;
  }

  function persistir(href: string, texto: string): void {
    if (!cacheApi) return;
    cacheApi
      .open(cacheName)
      .then((c) => c.put(href, new Response(texto, { headers: { 'Content-Type': 'text/css' } })))
      .catch(() => {});
  }

  function leerCache(href: string): Promise<string | null> {
    if (!cacheApi) return Promise.resolve(null);
    return cacheApi
      .open(cacheName)
      .then((c) => c.match(href))
      .then((r) => (r && r.ok ? r.text() : null))
      .catch(() => null);
  }

  function descargar(href: string): Promise<CSSStyleSheet | null> {
    const enCurso = cargas.get(href);
    if (enCurso) return enCurso;
    const cached = hojas.get(href);
    if (cached) return Promise.resolve(cached);

    const carga = leerCache(href)
      .then((cachedText) => {
        if (cachedText != null) return construir(cachedText, href);
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

  function calentar(hrefs: string[]): Promise<unknown> {
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

  function calentarDesdeCache(): Promise<unknown> {
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

  async function calentarDesdeManifiesto(url: string, manOpts: SheetCacheManifestOpts = {}): Promise<unknown> {
    const baseDoc = typeof location !== 'undefined' ? location.href : undefined;
    const abs = new URL(url, baseDoc).href;
    const res = await fetch(abs, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`${res.status} ${abs}`);
    const data: unknown = await res.json();
    const key = manOpts.key || 'hojas';
    const relsRaw: unknown = (data as Record<string, unknown> | null)?.[key];
    const dataArr: unknown = (data as unknown[]) || [];
    const rels: readonly string[] = Array.isArray(relsRaw)
      ? (relsRaw as readonly string[])
      : Array.isArray(dataArr)
        ? (dataArr as readonly string[])
        : [];
    const base = manOpts.base
      ? new URL(manOpts.base, baseDoc).href
      : new URL('.', abs).href;
    const hrefs = rels.map((rel: string) => new URL(String(rel).replace(/^\.\//, ''), base).href);
    return calentar(hrefs);
  }

  if (patchPrepend && typeof ShadowRoot !== 'undefined' && !prependInstalled) {
    prependInstalled = true;
    const prependOriginal = ShadowRoot.prototype.prepend;

    function hrefDeHoja(nodo: Node): string {
      if (!nodo || nodo.nodeType !== 1 || (nodo as Element).tagName !== 'LINK') return '';
      const link = nodo as HTMLLinkElement;
      if (link.rel !== 'stylesheet' || !link.href) return '';
      return link.href;
    }

    (ShadowRoot.prototype as { prepend: (...args: Node[]) => void }).prepend = function patchedPrepend(
      this: ShadowRoot,
      ...args: Node[]
    ): void {
      const api = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>)[globalKey] : null;
      const map = (api as SheetCacheApi | null)?.hojas;
      const restantes: Node[] = [];
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
        if ((api as SheetCacheApi | null)?.descargar) void (api as SheetCacheApi).descargar(href);
      }
      if (restantes.length) prependOriginal.apply(this, restantes);
    };
  }

  const api: SheetCacheApi = {
    cacheName,
    hojas,
    cargas,
    descargar,
    calentar,
    calentarDesdeCache,
    calentarDesdeManifiesto,
  };

  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>)[globalKey] = api;
    // Alias legacy PatyIA
    if (!(globalThis as Record<string, unknown>).__patyHojas)
      (globalThis as Record<string, unknown>).__patyHojas = api;
  }

  return api;
}

/**
 * Instala (o reusa) el caché global. Idempotente por `cacheName`.
 */
export function installSheetCache(opts: SheetCacheOpts = {}): SheetCacheApi | null {
  const globalKey = String(opts.globalKey || GLOBAL_KEY);
  const existing: SheetCacheApi | null = typeof globalThis !== 'undefined'
    ? ((globalThis as Record<string, unknown>)[globalKey] as SheetCacheApi | null | undefined) ?? null
    : null;
  if (existing && typeof existing.descargar === 'function' && typeof existing.calentar === 'function') {
    if (opts.cacheName && existing.cacheName && existing.cacheName !== opts.cacheName) {
      return createSheetCache(opts);
    }
    return existing;
  }
  return createSheetCache(opts);
}

export function getSheetCache(globalKey: string = GLOBAL_KEY): SheetCacheApi | null {
  if (typeof globalThis === 'undefined') return null;
  const cache = (globalThis as Record<string, unknown>)[globalKey] as SheetCacheApi | null | undefined;
  const legacy = (globalThis as Record<string, unknown>).__patyHojas as SheetCacheApi | null | undefined;
  return cache || legacy || null;
}

export { GLOBAL_KEY as SHEET_CACHE_GLOBAL_KEY };

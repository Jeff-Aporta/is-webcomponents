/**
 * loader-sheets — capa 2 del loader (plan D7): caché de hojas (`sheet-cache`: Cache Storage + adoptedStyleSheets)
 * y `loadPageStyles`.
 *
 * Solo se carga si alguien la usa: `L.sheets.install()/warm*()`, `registerApp` (instala la caché por defecto) o
 * `loadPageStyles`. El arranque del loader no la toca: cero `caches.open` hasta que la app la pida.
 */
import { getSheetCache, installSheetCache } from './sheet-cache.js';
import type { SheetCacheApi, SheetCacheOpts } from './schemas/sheet-cache.schemas.js';
import type { AppComponentEntry } from './schemas/loader.schemas.js';
import type { LoaderCtx } from './schemas/loader-capas.schemas.js';

export function instalar(opts: SheetCacheOpts = {}): SheetCacheApi | null {
  return installSheetCache(opts);
}

const cache = (): SheetCacheApi | null => getSheetCache() || installSheetCache();

export function calentar(hrefs: string[]): Promise<unknown> {
  const s = cache();
  return s ? s.calentar(hrefs) : Promise.resolve();
}

export function calentarDesdeCache(): Promise<unknown> {
  const s = cache();
  return s ? s.calentarDesdeCache() : Promise.resolve();
}

export function calentarDesdeManifiesto(url: string, opts: { base?: string; key?: string } = {}): Promise<unknown> {
  const s = cache();
  return s ? s.calentarDesdeManifiesto(url, opts) : Promise.resolve();
}

/** CSS de un tag de la app (`css` explícito o el `.css` hermano de su `href`), si la caché está instalada. */
export async function calentarEntrada(ctx: LoaderCtx, entry: AppComponentEntry): Promise<void> {
  const sheets = getSheetCache();
  if (!sheets?.calentar) return;
  const list: string[] = [];
  if (entry.css) {
    list.push(...(Array.isArray(entry.css) ? entry.css : [entry.css]));
  } else if (entry.href) {
    list.push(entry.href.replace(/\.min\.m?js$/i, '.min.css').replace(/\.m?js$/i, '.css'));
  }
  if (list.length) await sheets.calentar(list.map((href) => ctx.routeHref(href)));
}

/**
 * Resuelve un input de `loadPageStyles` a CDN del kit o URL de página.
 * - Alias `iswc-palettes-default` → `cdn:palettes.min.css` (host/`?v=`)
 * - Path literal / absoluto → hoja relativa a la página
 */
export function resolvePageStyle(ctx: LoaderCtx, input: string): { cdn: string } | { href: string } {
  if (typeof input !== 'string' || input === '') {
    throw new TypeError('resolvePageStyle: input must be non-empty string');
  }
  const trimmed = input.trim();
  const alias = ctx.state.pageStyles.get(trimmed);
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
    `loadPageStyles: alias desconocido "${trimmed}" — registra con L.registerPageStyle(alias, href) o usa un alias válido (${[...ctx.state.pageStyles.keys()].join(', ')})`,
  );
}

/** `loadPageStyles`: cada hoja por `<link rel=stylesheet>` (las del kit con host/espejos y `?v=` en origen mutable). */
export async function cargarEstilos(ctx: LoaderCtx, hrefs: string[]): Promise<void> {
  await ctx.cargarHashes();
  const base = typeof location !== 'undefined' ? location.href : ctx.selfBase;
  await Promise.all(hrefs.map((h) => {
    const resolved = resolvePageStyle(ctx, h);
    if ('cdn' in resolved) return ctx.injectCdnStylesheet(resolved.cdn);
    return ctx.injectStylesheet(ctx.routeHref(new URL(resolved.href, base).href));
  }));
}

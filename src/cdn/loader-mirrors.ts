/**
 * loader-mirrors — capa 2 del loader (plan D7): cadena de espejos jsDelivr → githack → Pages y reintentos.
 *
 * El núcleo (`loader.ts`) prueba primero su raíz (host o `self`); solo si ese `import()`/`<link>` falla, o si no hay
 * raíz primaria (`preferSelf: false` sin host), carga este módulo. En el camino feliz no se pide.
 *
 *   cdnBases(ctx)                     bases de módulos en orden (host/self, espejos del consumidor, canónicos).
 *   coreAssetBases(ctx)               bases de hojas y alias de página (raíz y `core/` de cada una).
 *   importarConEspejos(ctx, rel, …)   `import()` por la cadena, saltando la base que ya falló; recuerda la que sirvió.
 *   cssConEspejos(ctx, rel, …)        `<link>` por la cadena, igual.
 *   basesDeRespaldo(ref)              la cadena canónica para un pin (`L.fallbackBases()`).
 */
import { conBarra, fallbackBases, jsdelivrBase, raizYCore } from '@jeff-aporta/iswc-base/core/cdn-ref.js';
import type { LoaderCtx } from './schemas/loader-capas.schemas.js';

/**
 * Última base CDN que respondió bien en esta página.
 * Si jsDelivr cae y githack salva el primer `load`, los siguientes no
 * reintentan el muerto primero (mitiga timeouts de espejos caídos).
 */
let stickyBase: string | null = null;

export function orderBases(ctx: LoaderCtx, bases: string[]): string[] {
  if (!stickyBase || !bases.includes(stickyBase)) return bases;
  // host / preferSelf siguen primero; sticky solo reordena espejos.
  const preferHead = ctx.state.host || ctx.state.preferSelf ? 1 : 0;
  const head = bases.slice(0, preferHead);
  if (head.includes(stickyBase)) return bases;
  const rest = bases.slice(preferHead).filter((b) => b !== stickyBase);
  return [...head, stickyBase, ...rest];
}

export function rememberBase(base: string): void {
  stickyBase = conBarra(base);
}

/** ¿Hacen falta espejos? Con `mirrors: []` explícito (modo local) no: ni bases CDN ni pin (ni API de GitHub). */
const usaEspejos = (ctx: LoaderCtx): boolean => !ctx.state.mirrorsExplicit || ctx.state.mirrors.length > 0;

export async function cdnBases(ctx: LoaderCtx): Promise<string[]> {
  const { state } = ctx;
  const ref = usaEspejos(ctx) ? await ctx.ref() : 'main';
  const out: string[] = [];
  const push = (b: string): void => {
    const n = conBarra(b);
    if (!out.includes(n)) out.push(n);
  };
  // host del consumidor manda: evita quedarse en un jsDelivr @main cacheado.
  if (state.host) push(state.host);
  else if (state.preferSelf) push(ctx.cdnRoot);
  for (const m of state.mirrors) {
    try { push(m.base(ref)); } catch { /* mirror malo */ }
  }
  // Cadena canónica solo si no estamos en modo local (mirrors=[] explícito).
  if (usaEspejos(ctx)) {
    for (const m of ctx.mirrorsDefault) {
      try { push(m.base(ref)); } catch { /* */ }
    }
  }
  if (!out.length) push(jsdelivrBase(ref));
  return out;
}

/** Bases del CSS base y de los alias `cdn:` (misma carpeta que loader.min.mjs y la raíz `dist/cdn/`). */
export async function coreAssetBases(ctx: LoaderCtx): Promise<string[]> {
  const { state } = ctx;
  const ref = usaEspejos(ctx) ? await ctx.ref() : 'main';
  const out: string[] = [];
  const push = (b: string): void => {
    const n = conBarra(b);
    if (!out.includes(n)) out.push(n);
  };
  // host = raíz dist/cdn → CSS en raíz y alias en core/
  if (state.host) {
    for (const b of raizYCore(state.host)) push(b);
  } else if (state.preferSelf) {
    push(ctx.cdnRoot);
    push(ctx.selfBase);
  } else {
    push(ctx.selfBase);
  }
  const pushMirror = (m: { base: (ref?: string) => string }): void => {
    // Las bases de cdn-ref no traen barra final: raizYCore la pone antes de componer `core/`.
    try {
      for (const b of raizYCore(m.base(ref))) push(b);
    } catch { /* mirror malo */ }
  };
  for (const m of state.mirrors) pushMirror(m);
  // Sin espejos CDN si el consumidor vació mirrors (modo local).
  if (usaEspejos(ctx)) {
    for (const m of ctx.mirrorsDefault) pushMirror(m);
  }
  if (out.length <= 1 && usaEspejos(ctx)) {
    for (const b of raizYCore(jsdelivrBase(ref))) push(b);
  }
  return out;
}

/** `import()` de `rel` por la cadena jsDelivr → githack → Pages; `fallida` es el href que el núcleo ya probó. */
export async function importarConEspejos(ctx: LoaderCtx, rel: string, fallida: string | null, error: unknown): Promise<string> {
  let last: Error | null = error instanceof Error ? error : (error ? new Error(String(error)) : null);
  for (const base of orderBases(ctx, await cdnBases(ctx))) {
    const href = ctx.assetHref(base, rel);
    if (href === fallida) continue;
    try {
      await ctx.importOnce(href);
      rememberBase(base);
      return href;
    } catch (e: unknown) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last || new Error(`iswcLoader: no hay espejo para ${rel}`);
}

/** `<link rel=stylesheet>` de `rel` por la cadena; `fallida` es el href que el núcleo ya probó. */
export async function cssConEspejos(ctx: LoaderCtx, rel: string, fallida: string | null): Promise<string> {
  let last: Error | null = null;
  for (const base of orderBases(ctx, await coreAssetBases(ctx))) {
    const href = ctx.assetHref(base, rel);
    if (href === fallida) continue;
    try {
      await ctx.injectStylesheet(href);
      rememberBase(base);
      return href;
    } catch (e: unknown) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last || new Error(`iswcLoader: no hay espejo para ${rel}`);
}

/** Cadena canónica jsDelivr → githack → Pages para un pin. */
export function basesDeRespaldo(ref: string): string[] {
  return fallbackBases(ref);
}

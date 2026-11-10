// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-pages — capa 2 del loader (plan D7): `loadPageModules`, los módulos de página de la galería y de las apps
 * (alias de `state.pageModules`, `cdn:…` del kit o rutas sueltas).
 *
 * El tipo de carga sale de la extensión (D2): `.js` → `<script src>` clásico; `.mjs`, `.ts` o sin extensión →
 * `import()`. `classic:` / `module:` y el `type` del alias son overrides explícitos.
 */
import type { PageModuleSpec } from './schemas/loader.schemas.js';
import type { LoaderCtx } from './schemas/loader-capas.schemas.js';

/**
 * Resuelve un input de `loadPageModules` a href + tipo de carga.
 *
 * - Alias de la tabla (`'demo-code'`, `'iswc-doc-demo-boot'`)
 * - Prefijo `classic:` / `module:` → tipo forzado
 * - Prefijo `cdn:` en el href del spec → asset del kit (host/`?v=`)
 * - Path literal / URL → tipo por extensión
 */
export function resolvePageModule(ctx: LoaderCtx, input: string): PageModuleSpec {
  if (typeof input !== 'string' || input === '') {
    throw new TypeError('resolvePageModule: input must be non-empty string');
  }
  const trimmed = input.trim();
  const alias = ctx.state.pageModules.get(trimmed);
  if (alias) return { ...alias };

  if (trimmed.startsWith('classic:')) return { href: trimmed.slice('classic:'.length), type: 'classic' };
  if (trimmed.startsWith('module:')) return { href: trimmed.slice('module:'.length), type: 'module' };

  if (
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    || trimmed.startsWith('//')
    || trimmed.startsWith('/')
    || trimmed.includes('/')
    || /\.(?:js|mjs|cjs|ts|tsx)(?:\?.*)?$/i.test(trimmed)
  ) {
    return { href: trimmed, type: ctx.tipoDe(trimmed) };
  }

  throw new Error(
    `loadPageModules: alias desconocido "${trimmed}" — registra con L.registerPageModule(alias, href) o usa un alias válido (${[...ctx.state.pageModules.keys()].join(', ')})`,
  );
}

/** URL absoluta del módulo: `cdn:` cuelga de la raíz del kit (host/self o el primer espejo); lo demás, de la página. */
async function resolvePageModuleUrl(ctx: LoaderCtx, spec: PageModuleSpec): Promise<string> {
  const href = spec.href;
  if (href.startsWith('cdn:')) {
    const rel = href.slice(4).replace(/^\.\//, '');
    let raiz = ctx.raizPrimaria();
    if (!raiz) {
      const m = await import('@jeff-aporta/iswc-base/cdn/loader-mirrors.js');
      raiz = m.orderBases(ctx, await m.coreAssetBases(ctx))[0] || ctx.selfBase;
    }
    return ctx.assetHref(raiz, rel);
  }
  return new URL(href, typeof location !== 'undefined' ? location.href : ctx.selfBase).href;
}

/** `loadPageModules`: todos en paralelo; cada uno una vez (dedupe del núcleo). */
export async function cargarModulos(ctx: LoaderCtx, hrefs: string[]): Promise<void> {
  const specs = hrefs.map((h) => resolvePageModule(ctx, h));
  await ctx.cargarHashes();
  await Promise.all(specs.map(async (spec) => {
    const routed = ctx.routeHref(await resolvePageModuleUrl(ctx, spec));
    return spec.type === 'classic' ? ctx.loadClassicOnce(routed) : ctx.importOnce(routed);
  }));
}

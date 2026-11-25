// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-plugin — capa 2 del loader: el ENRUTADOR de plugins (`iswcLoader.loadPlugin`).
 *
 * `load-components` carga los componentes propios del kit; `loadPlugin` carga los de OTRA app (su repo, su SHA, su
 * prefijo) sin que iswc-base conozca sus componentes. Pasos:
 *
 *   1. valida la petición (`app`, `repo`, `sha` de 40 hex, `prefijo` con guion final, distinto de `iswc-`);
 *   2. baja `plugin.json` de `gh/<repo>@<sha>/dist/cdn/` (jsDelivr → githack, o `host` en desarrollo); con un pin SHA la
 *      URL es inmutable y se pide con `cache: 'force-cache'`; en un origen mutable pasa por `ctx.routeHref` (`?v=`);
 *   3. comprueba el manifiesto (esquema, mismo repo y prefijo, todo tag con el prefijo, todo href en el mismo origen);
 *   4. registra los tags con `registerApp` (módulos y `css` absolutos; la caché de hojas solo si algún tag trae hojas) y
 *      guarda el prefijo para el autoloader (`observar()` pide los tags `<prefijo>*` al verlos);
 *   5. si hay `tags`, los carga de inmediato.
 *
 * Sin ciclo con el núcleo: recibe el loader (`api`), el contexto (`ctx`) y la lista viva de plugins por argumento.
 * Una página usa UNA versión por app: repetir la misma petición devuelve la misma promesa; otro SHA para la misma app
 * (o un prefijo ya tomado por otra) falla con un mensaje claro.
 */
import type { PluginActivo, PluginCtx, PluginInfo, PluginLoaderApi, PluginManifest, PluginOpts, PluginTag } from './schemas/plugin.schemas.js';

const RUTA_DEFECTO = 'dist/cdn/';
const MANIFIESTO = 'plugin.json';

const activos = new Map<string, PluginActivo>();

const conBarra = (u: string): string => (u.endsWith('/') ? u : `${u}/`);
const esObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Valida y normaliza la petición; lanza `TypeError` con el campo que falla. */
export function validarOpts(entrada: unknown): PluginOpts {
  if (!esObj(entrada)) throw new TypeError('loadPlugin: falta { app, repo, sha, prefijo }');
  const { app, repo, sha, prefijo, tags, ruta, host } = entrada;
  if (typeof app !== 'string' || !/^[a-z][a-z0-9-]*$/.test(app)) throw new TypeError(`loadPlugin: app inválida (${String(app)}): minúsculas, dígitos y guiones`);
  if (typeof repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new TypeError(`loadPlugin(${app}): repo debe ser dueño/repo`);
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/i.test(sha)) throw new TypeError(`loadPlugin(${app}): sha debe ser un commit de 40 hex (nunca main, rama ni SHA corto)`);
  if (typeof prefijo !== 'string' || !/^[a-z][a-z0-9]*-$/.test(prefijo)) throw new TypeError(`loadPlugin(${app}): prefijo con guion final (crm-, iswd-)`);
  if (prefijo === 'iswc-') throw new TypeError(`loadPlugin(${app}): iswc- es del kit; el plugin necesita su propio prefijo`);
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string' || !t.startsWith(prefijo)))) {
    throw new TypeError(`loadPlugin(${app}): tags debe ser una lista de tags que empiecen por ${prefijo}`);
  }
  if (ruta !== undefined && typeof ruta !== 'string') throw new TypeError(`loadPlugin(${app}): ruta debe ser texto`);
  if (host !== undefined && (typeof host !== 'string' || !/^https?:\/\//i.test(host))) throw new TypeError(`loadPlugin(${app}): host debe ser una URL http(s)`);
  return { app, repo, sha: sha.toLowerCase(), prefijo, ...(tags ? { tags: [...tags] as string[] } : {}), ...(ruta ? { ruta } : {}), ...(host ? { host } : {}) };
}

/** Raíces candidatas (con barra final), en orden de fallback. Con `host` solo esa. */
export function raicesDe(o: PluginOpts): string[] {
  const ruta = (o.ruta ?? RUTA_DEFECTO).replace(/^\/+/, '');
  if (o.host) return [conBarra(o.host)];
  return [
    `https://cdn.jsdelivr.net/gh/${o.repo}@${o.sha}/${conBarra(ruta)}`,
    `https://raw.githack.com/${o.repo}/${o.sha}/${conBarra(ruta)}`,
  ];
}

/** Entrada de import map del plugin: `@<app>/` → su raíz publicada. */
export function aliasDe(o: Pick<PluginOpts, 'app' | 'repo' | 'sha' | 'ruta'>): Record<string, string> {
  return { [`@${o.app}/`]: raicesDe({ ...o, prefijo: 'x-' })[0]! };
}

/** Comprueba el manifiesto contra la petición; devuelve el manifiesto tipado o lanza. */
export function comprobarManifiesto(m: unknown, o: PluginOpts, raiz: string): PluginManifest {
  if (!esObj(m) || m.schema !== 'iswc-plugin/v1') throw new Error(`loadPlugin(${o.app}): ${MANIFIESTO} no es iswc-plugin/v1`);
  if (String(m.repo).toLowerCase() !== o.repo.toLowerCase()) throw new Error(`loadPlugin(${o.app}): el manifiesto es de ${String(m.repo)}, no de ${o.repo}`);
  if (m.prefijo !== o.prefijo) throw new Error(`loadPlugin(${o.app}): el manifiesto declara el prefijo ${String(m.prefijo)}, se pidió ${o.prefijo}`);
  if (!esObj(m.tags)) throw new Error(`loadPlugin(${o.app}): el manifiesto no trae tags`);
  const origen = new URL(raiz).origin;
  for (const [tag, v] of Object.entries(m.tags as Record<string, PluginTag>)) {
    if (!tag.startsWith(o.prefijo)) throw new Error(`loadPlugin(${o.app}): el tag ${tag} no empieza por ${o.prefijo}`);
    const href = typeof v === 'string' ? v : v?.href;
    if (typeof href !== 'string' || new URL(href, raiz).origin !== origen) throw new Error(`loadPlugin(${o.app}): ${tag} apunta fuera del origen del plugin`);
  }
  return m as unknown as PluginManifest;
}

async function pedirManifiesto(ctx: PluginCtx, o: PluginOpts): Promise<{ manifiesto: unknown; raiz: string }> {
  let ultimo: unknown = null;
  for (const raiz of raicesDe(o)) {
    try {
      const url = ctx.routeHref(new URL(MANIFIESTO, raiz).href);
      const r = await fetch(url, o.host ? undefined : { cache: 'force-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
      return { manifiesto: await r.json(), raiz };
    } catch (e) {
      ultimo = e;
    }
  }
  throw new Error(`loadPlugin(${o.app}): no se pudo bajar ${MANIFIESTO} de ${o.repo}@${o.sha.slice(0, 8)}: ${ultimo instanceof Error ? ultimo.message : String(ultimo)}`);
}

/** Tags del manifiesto como entradas de `registerApp` (rutas absolutas) y su cierre de chunks absoluto. */
export function entradasDe(m: PluginManifest, raiz: string): { map: Record<string, { href: string; css?: string[]; type: 'module' }>; deps: Record<string, string[]>; css: boolean } {
  const abs = (h: string) => new URL(h, raiz).href;
  const map: Record<string, { href: string; css?: string[]; type: 'module' }> = {};
  let css = false;
  for (const [tag, v] of Object.entries(m.tags)) {
    const e = typeof v === 'string' ? { href: v } : v;
    const hojas = 'css' in e ? e.css : undefined;
    if (hojas?.length) css = true;
    map[tag] = { href: abs(e.href), ...(hojas?.length ? { css: hojas.map(abs) } : {}), type: 'module' };
  }
  const deps: Record<string, string[]> = {};
  for (const [tag, hrefs] of Object.entries(m.deps ?? {})) deps[tag] = hrefs.map(abs);
  return { map, deps, css };
}

/**
 * `loadPlugin`: lo que llama el núcleo. `plugins` es la lista viva del núcleo (la usa `getPlugins()` y el autoloader).
 */
export function cargarPlugin(api: PluginLoaderApi, ctx: PluginCtx, plugins: PluginInfo[], entrada: unknown): Promise<PluginInfo> {
  const o = validarOpts(entrada);
  const previo = activos.get(o.app);
  if (previo) {
    const p = previo.opts;
    if (p.repo !== o.repo || p.sha !== o.sha || p.prefijo !== o.prefijo) {
      return Promise.reject(new Error(`loadPlugin(${o.app}): ya está cargado ${p.repo}@${p.sha.slice(0, 8)} (${p.prefijo}); una página usa una sola versión por app, se pidió ${o.repo}@${o.sha.slice(0, 8)} (${o.prefijo})`));
    }
    return previo.promesa.then((info) => pedirTags(api, o, info));
  }
  const ajeno = [...activos.values()].find((a) => a.opts.prefijo === o.prefijo);
  if (ajeno) return Promise.reject(new Error(`loadPlugin(${o.app}): el prefijo ${o.prefijo} ya es de la app ${ajeno.opts.app}`));
  const promesa = (async (): Promise<PluginInfo> => {
    const { manifiesto, raiz } = await pedirManifiesto(ctx, o);
    const m = comprobarManifiesto(manifiesto, o, raiz);
    const { map, deps, css } = entradasDe(m, raiz);
    const registrados = api.getAppComponents();
    for (const [tag, e] of Object.entries(map)) {
      const otro = registrados[tag];
      if (otro && otro.href !== e.href) throw new Error(`loadPlugin(${o.app}): el tag ${tag} ya lo registró otro módulo (${otro.href})`);
    }
    api.registerApp(map, { installSheets: css, deps });
    const info: PluginInfo = { app: o.app, repo: o.repo, sha: o.sha, prefijo: o.prefijo, raiz, tags: Object.keys(map).sort(), alias: { [`@${o.app}/`]: raiz }, kit: m.kit ?? null };
    plugins.push(info);
    return info;
  })();
  activos.set(o.app, { opts: o, promesa });
  // Si falla, la app queda libre para reintentar.
  promesa.catch(() => activos.delete(o.app));
  return promesa.then((info) => pedirTags(api, o, info));
}

async function pedirTags(api: PluginLoaderApi, o: PluginOpts, info: PluginInfo): Promise<PluginInfo> {
  const faltan = (o.tags ?? []).filter((t) => !info.tags.includes(t));
  if (faltan.length) throw new Error(`loadPlugin(${o.app}): el plugin no trae ${faltan.join(', ')}`);
  if (o.tags?.length) await api.load(...o.tags);
  return info;
}

/** Solo pruebas: olvida los plugins activos. */
export function reiniciarPlugins(plugins?: PluginInfo[]): void {
  activos.clear();
  if (plugins) plugins.length = 0;
}

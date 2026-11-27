// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-plugin — capa 2 del loader: el ENRUTADOR de plugins (`iswcLoader.loadPlugin`).
 *
 * Cada app es dueña de SU loader (`dist/cdn/<prefijo>Loader.min.mjs`, generado con el mismo sistema de optimizaciones del
 * kit: chunks, .min.mjs, hashes, `?v=`, espejos). `loadPlugin` solo enruta: dado repo + SHA + prefijo, importa ESE loader en
 * el SHA pedido y le delega el registro de sus tags. El kit no conoce rutas, manifiestos ni archivos de la app, y las
 * versiones de la app no dependen del kit. Pasos:
 *
 *   1. valida la petición (`app`, `repo`, `sha` de 40 hex, `prefijo` con guion final, distinto de `iswc-`);
 *   2. importa `<prefijo sin guion>Loader.min.mjs` desde `gh/<repo>@<sha>/dist/cdn/` (jsDelivr → githack, o `host` en
 *      desarrollo); el loader de la app se registra solo (`iswcLoader.registerApp`) con sus propias rutas;
 *   3. lee de `getAppComponents()` los tags que quedaron con el prefijo y guarda el prefijo para el autoloader
 *      (`observar()` pide los tags `<prefijo>*` al verlos);
 *   4. si hay `tags`, los carga de inmediato.
 *
 * Sin ciclo con el núcleo: recibe el loader (`api`), el contexto (`ctx`) y la lista viva de plugins por argumento.
 * Una página usa UNA versión por app: repetir la misma petición devuelve la misma promesa; otro SHA para la misma app
 * (o un prefijo ya tomado por otra) falla con un mensaje claro.
 */
import type { PluginActivo, PluginCtx, PluginImportar, PluginInfo, PluginLoaderApi, PluginOpts } from './schemas/plugin.schemas.js';

const RUTA_DEFECTO = 'dist/cdn/';

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


/** Nombre estable del loader de una app: `iswd-` → `iswdLoader.min.mjs`. */
export function loaderDe(prefijo: string): string {
  return `${prefijo.slice(0, -1)}Loader.min.mjs`;
}

/** Importa el loader de la app (una raíz tras otra); devuelve la raíz que respondió. */
async function importarLoader(ctx: PluginCtx, o: PluginOpts, importar: PluginImportar): Promise<string> {
  let ultimo: unknown = null;
  for (const raiz of raicesDe(o)) {
    try {
      await importar(o.host ? ctx.routeHref(new URL(loaderDe(o.prefijo), raiz).href) : new URL(loaderDe(o.prefijo), raiz).href);
      return raiz;
    } catch (e) {
      ultimo = e;
    }
  }
  throw new Error(`loadPlugin(${o.app}): no se pudo importar ${loaderDe(o.prefijo)} de ${o.repo}@${o.sha.slice(0, 8)}: ${ultimo instanceof Error ? ultimo.message : String(ultimo)}`);
}

/**
 * `loadPlugin`: lo que llama el núcleo. `plugins` es la lista viva del núcleo (la usa `getPlugins()` y el autoloader).
 * `importar` solo se inyecta en pruebas.
 */
export function cargarPlugin(api: PluginLoaderApi, ctx: PluginCtx, plugins: PluginInfo[], entrada: unknown, importar: PluginImportar = (u) => import(/* @vite-ignore */ u)): Promise<PluginInfo> {
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
    const raiz = await importarLoader(ctx, o, importar);
    const tags = Object.keys(api.getAppComponents()).filter((t) => t.startsWith(o.prefijo)).sort();
    if (!tags.length) throw new Error(`loadPlugin(${o.app}): ${loaderDe(o.prefijo)} no registró ningún tag ${o.prefijo}*`);
    const info: PluginInfo = { app: o.app, repo: o.repo, sha: o.sha, prefijo: o.prefijo, raiz, tags, alias: { [`@${o.app}/`]: raiz } };
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

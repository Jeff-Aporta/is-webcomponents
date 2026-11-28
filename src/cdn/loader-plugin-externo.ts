// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-plugin-externo — capa 2 del loader: `iswcLoader.cargarPlugin({ usuario, repo, sha, tipo })`.
 *
 * Carga de una app EXTERNA (que no existe en el kit) sus componentes, paletas y herramientas, referenciándola por usuario
 * de GitHub + repo + SHA. Todas las apps siguen la estructura de foundation, así que las rutas son fijas; el consumidor
 * solo cambia el SHA para mover el pin:
 *
 *   manifiesto   https://cdn.jsdelivr.net/gh/<usuario>/<repo>@<sha40>/dist/cdn/plugin.json  (respaldo: raw.githack.com)
 *   componentes  <raíz>/<prefijo sin guion>Loader.min.mjs      (lo importa `loadPlugin`; registra sus tags)
 *   paletas      <raíz>/palettes/<nombre>.json                 (se registran en el `<iswc-palette-selector>` del kit)
 *   herramientas <raíz>/<ruta declarada>                       (módulos ESM; `info.herramientas[nombre]`)
 *
 * Pasos: valida la petición (Zod, SHA de 40 hex), baja y valida el manifiesto (`iswc-plugin/v1`, mensaje con los campos que
 * fallan) y carga solo lo que pide `tipo` (`componentes` | `paletas` | `herramientas` | `todo`). Caché por SHA: el
 * manifiesto, los componentes, cada paleta y cada herramienta se piden UNA vez por `usuario/repo@sha` y página; repetir
 * la petición devuelve lo ya cargado. Una página usa una sola versión de los componentes por app (regla de `loadPlugin`).
 *
 * Además, la FORMA DECLARATIVA: la página declara el plugin en el HTML (`[data-iswc-plugin]`) y el núcleo lo carga al
 * arrancar, sin una línea de JS (`cargarDeclarativos`). Una entrada rota no tumba la página: queda en `errores`.
 *
 * Sin ciclo con el núcleo: recibe `loadPlugin` y `routeHref` por argumento. Contrato en src/cdn/loader.md.
 */
import { z } from 'zod';
import { fijarPaletaDefecto, PALETAS_KIT, registrarPaletas } from '@jeff-aporta/iswc-base/styles/palette-registry.js';
import type { PaletaExterna } from '@jeff-aporta/iswc-base/styles/schemas/palette-registry.schemas.js';
import { ManifiestoExternoSchema, PaletaPluginSchema, PeticionExternaSchema } from './schemas/plugin-externo.schemas.js';
import type {
  DeclarativosResultado,
  EntradaCache,
  EntradaDeclarativa,
  ManifiestoExterno,
  PaletaPlugin,
  PeticionExterna,
  PluginExternoDeps,
  PluginExternoInfo,
} from './schemas/plugin-externo.schemas.js';
import type { PluginInfo } from './schemas/plugin.schemas.js';

const RUTA_FIJA = 'dist/cdn/';
const KIT = PALETAS_KIT;
/** Caché por `usuario/repo@sha` (en minúsculas: GitHub no distingue). */
const cache = new Map<string, EntradaCache>();

const conBarra = (u: string): string => (u.endsWith('/') ? u : `${u}/`);

/** Resumen legible de los problemas de Zod: `ruta: mensaje; …`. */
function problemas(e: z.ZodError): string {
  return e.issues.map((i) => `${i.path.length ? i.path.join('.') : '(raíz)'}: ${i.message}`).join('; ');
}

function parsear<T extends z.ZodType>(esquema: T, valor: unknown, contexto: string): z.infer<T> {
  const r = esquema.safeParse(valor);
  if (!r.success) throw new TypeError(`${contexto}: ${problemas(r.error)}`);
  return r.data;
}

/** Valida la petición; lanza `TypeError` con el campo que falla. */
export function validarPeticion(entrada: unknown): PeticionExterna {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new TypeError('cargarPlugin: falta { usuario, repo, sha }');
  const p = parsear(PeticionExternaSchema, entrada, 'cargarPlugin');
  return { ...p, sha: p.sha.toLowerCase() };
}

/** Raíces candidatas de `dist/cdn/` (con barra final), en orden de fallback. Con `host` solo esa. */
export function raicesExternas(p: Pick<PeticionExterna, 'usuario' | 'repo' | 'sha' | 'host'>): string[] {
  if (p.host) return [conBarra(p.host)];
  return [
    `https://cdn.jsdelivr.net/gh/${p.usuario}/${p.repo}@${p.sha}/${RUTA_FIJA}`,
    `https://raw.githack.com/${p.usuario}/${p.repo}/${p.sha}/${RUTA_FIJA}`,
  ];
}

const defectoFetch = async (url: string): Promise<unknown> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

async function bajarManifiesto(p: PeticionExterna, d: PluginExternoDeps): Promise<{ manifiesto: ManifiestoExterno; raiz: string }> {
  const quien = `${p.usuario}/${p.repo}@${p.sha.slice(0, 8)}`;
  const pedir = d.fetchJson ?? defectoFetch;
  let ultimo = '';
  for (const raiz of raicesExternas(p)) {
    let crudo: unknown;
    try {
      crudo = await pedir(`${raiz}plugin.json`);
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
      continue;
    }
    const manifiesto = parsear(ManifiestoExternoSchema, crudo, `cargarPlugin(${quien}): plugin.json no cumple iswc-plugin/v1`);
    if (manifiesto.repo && manifiesto.repo.toLowerCase() !== `${p.usuario}/${p.repo}`.toLowerCase()) {
      throw new Error(`cargarPlugin(${quien}): plugin.json declara el repo ${manifiesto.repo}, no ${p.usuario}/${p.repo}`);
    }
    return { manifiesto, raiz };
  }
  throw new Error(`cargarPlugin(${quien}): no se pudo bajar ${RUTA_FIJA}plugin.json (${ultimo || 'sin respuesta'}); comprueba usuario, repo, SHA y que el repo sea público`);
}

/** Paleta cruda → paleta del registro (`value` por defecto = el nombre del manifiesto). */
function normalizarPaleta(nombre: string, crudo: unknown, grupo: string, quien: string): PaletaExterna {
  const p: PaletaPlugin = parsear(PaletaPluginSchema, crudo, `cargarPlugin(${quien}): palettes/${nombre}.json no cumple`);
  if (p.value !== undefined && p.value !== nombre) throw new Error(`cargarPlugin(${quien}): palettes/${nombre}.json declara value "${p.value}"; debe coincidir con el nombre del manifiesto`);
  return {
    value: nombre, label: p.label ?? nombre, family: p.family ?? grupo, origin: p.origin ?? '', mood: p.mood ?? '',
    h: p.h, s: p.s, b: p.b,
    ...(p.contrastH !== undefined ? { contrastH: p.contrastH } : {}), ...(p.contrastS ? { contrastS: p.contrastS } : {}),
    ...(p.contrastL ? { contrastL: p.contrastL } : {}), ...(p.tint !== undefined ? { tint: p.tint } : {}),
    ...(p.fontTint !== undefined ? { fontTint: p.fontTint } : {}),
  };
}

function info(p: PeticionExterna, e: { manifiesto: ManifiestoExterno; raiz: string }, parte: { componentes: PluginInfo | null | undefined; paletas: string[] | undefined; herramientas: Record<string, unknown> | undefined }): PluginExternoInfo {
  return {
    usuario: p.usuario, repo: p.repo, sha: p.sha, nombre: e.manifiesto.app, version: e.manifiesto.version ?? null, prefijo: e.manifiesto.prefijo, raiz: e.raiz,
    cargado: { componentes: !!parte.componentes, paletas: !!parte.paletas, herramientas: !!parte.herramientas },
    tags: parte.componentes?.tags ?? [], paletas: parte.paletas ?? [], herramientas: parte.herramientas ?? {}, manifiesto: e.manifiesto,
  };
}

/**
 * `cargarPlugin`: lo que llama el núcleo. `deps.loadPlugin` importa el loader de componentes; `fetchJson` e `importar`
 * solo se inyectan en pruebas.
 */
export async function cargarPluginExterno(entrada: unknown, deps: PluginExternoDeps): Promise<PluginExternoInfo> {
  const p = validarPeticion(entrada);
  const clave = `${p.usuario}/${p.repo}@${p.sha}`.toLowerCase();
  const quien = `${p.usuario}/${p.repo}@${p.sha.slice(0, 8)}`;
  let ent = cache.get(clave);
  if (!ent) {
    ent = { raiz: bajarManifiesto(p, deps) };
    cache.set(clave, ent);
    // Si falla, se puede reintentar.
    ent.raiz.catch(() => { if (cache.get(clave) === ent) cache.delete(clave); });
  }
  const base = await ent.raiz;
  const { manifiesto, raiz } = base;
  const quiere = (t: string): boolean => p.tipo === 'todo' || p.tipo === t;
  const importar = deps.importar ?? ((u: string) => import(/* @vite-ignore */ u));
  const pedir = deps.fetchJson ?? defectoFetch;
  const falla = (campo: 'componentes' | 'paletas' | 'herramientas') => () => { if (ent![campo]) delete ent![campo]; };

  if (quiere('componentes')) {
    if (!ent.componentes) {
      if (!manifiesto.loader && !Object.keys(manifiesto.tags).length) {
        if (p.tipo === 'componentes') throw new Error(`cargarPlugin(${quien}): el plugin no publica componentes (plugin.json sin loader ni tags)`);
        ent.componentes = Promise.resolve(null);
      } else {
        ent.componentes = deps.loadPlugin({ app: manifiesto.app, repo: `${p.usuario}/${p.repo}`, sha: p.sha, prefijo: manifiesto.prefijo, ...(p.host ? { host: p.host } : {}) });
        ent.componentes.catch(falla('componentes'));
      }
    }
  }
  if (quiere('paletas') && !ent.paletas) {
    const lista = manifiesto.paletas ?? [];
    if (!lista.length && p.tipo === 'paletas') throw new Error(`cargarPlugin(${quien}): el plugin no publica paletas (plugin.json sin "paletas")`);
    ent.paletas = (async () => {
      const grupo = manifiesto.titulo ?? manifiesto.app;
      const cargadas: PaletaExterna[] = [];
      for (const d of lista) {
        let crudo: unknown;
        try { crudo = await pedir(new URL(d.ruta, raiz).href); } catch (e) { throw new Error(`cargarPlugin(${quien}): no se pudo bajar ${d.ruta}: ${e instanceof Error ? e.message : String(e)}`); }
        cargadas.push(normalizarPaleta(d.nombre, crudo, grupo, quien));
      }
      return registrarPaletas(`${p.usuario}/${p.repo}`.toLowerCase(), cargadas, KIT);
    })();
    ent.paletas.catch(falla('paletas'));
  }
  if (quiere('herramientas') && !ent.herramientas) {
    const lista = manifiesto.herramientas ?? [];
    if (!lista.length && p.tipo === 'herramientas') throw new Error(`cargarPlugin(${quien}): el plugin no publica herramientas (plugin.json sin "herramientas")`);
    ent.herramientas = (async () => {
      const out: Record<string, unknown> = {};
      for (const d of lista) {
        try { out[d.nombre] = await importar(new URL(d.ruta, raiz).href); } catch (e) { throw new Error(`cargarPlugin(${quien}): no se pudo importar la herramienta ${d.nombre} (${d.ruta}): ${e instanceof Error ? e.message : String(e)}`); }
      }
      return out;
    })();
    ent.herramientas.catch(falla('herramientas'));
  }
  const [componentes, paletas, herramientas] = await Promise.all([ent.componentes, ent.paletas, ent.herramientas]);
  if (componentes && p.tags?.length) {
    const faltan = p.tags.filter((t) => !componentes.tags.includes(t));
    if (faltan.length) throw new Error(`cargarPlugin(${quien}): el plugin no trae ${faltan.join(', ')}`);
    await deps.loadPlugin({ app: manifiesto.app, repo: `${p.usuario}/${p.repo}`, sha: p.sha, prefijo: manifiesto.prefijo, tags: p.tags, ...(p.host ? { host: p.host } : {}) });
  }
  if (p.paletaDefecto !== undefined) {
    if (!paletas?.includes(p.paletaDefecto) && !KIT.has(p.paletaDefecto)) throw new Error(`cargarPlugin(${quien}): paletaDefecto ${p.paletaDefecto} no es del kit ni de este plugin`);
    fijarPaletaDefecto(p.paletaDefecto);
  }
  return info(p, base, { componentes, paletas, herramientas });
}

/** Solo pruebas: olvida la caché por SHA. */
export function reiniciarExternos(): void {
  cache.clear();
}

/* ── Forma declarativa (el HTML declara el plugin; el loader lo carga al arrancar) ───────────────────── */

/** Selector de la forma declarativa: `<script type="application/json" data-iswc-plugin>`. */
export const SELECTOR_DECLARATIVO = '[data-iswc-plugin]';

/**
 * Lee las entradas declarativas del DOM. El bloque puede ser un objeto o una lista de objetos (varias apps).
 * Un `<script>` trae el JSON en su texto; cualquier otro elemento, en el valor del atributo `data-iswc-plugin`.
 * Un bloque ilegible no se descarta: sale con su error.
 */
export function leerDeclarativos(raiz?: ParentNode): EntradaDeclarativa[] {
  const base = raiz ?? (typeof document !== 'undefined' ? document : null);
  if (!base) return [];
  const salida: EntradaDeclarativa[] = [];
  for (const el of base.querySelectorAll<HTMLElement>(SELECTOR_DECLARATIVO)) {
    const texto = el.tagName === 'SCRIPT' ? (el.textContent ?? '') : (el.getAttribute('data-iswc-plugin') ?? '');
    if (!texto.trim()) continue;
    let crudo: unknown;
    try {
      crudo = JSON.parse(texto);
    } catch (e) {
      const porque = e instanceof Error ? e.message : String(e);
      salida.push({ entrada: null, error: new Error(`cargarPlugin declarativo: ${SELECTOR_DECLARATIVO} no es JSON válido (${porque})`) });
      continue;
    }
    if (Array.isArray(crudo)) for (const uno of crudo) salida.push({ entrada: uno });
    else salida.push({ entrada: crudo });
  }
  return salida;
}

/**
 * Carga los plugins declarados en el HTML. Una entrada que falla (SHA malo, repo caído) NO tumba la página: queda en
 * `errores` con su mensaje y las demás siguen. Reutiliza la caché por SHA de `cargarPluginExterno`.
 */
export async function cargarDeclarativos(deps: PluginExternoDeps, raiz?: ParentNode): Promise<DeclarativosResultado> {
  const cargados: PluginExternoInfo[] = [];
  const errores: { entrada: unknown; error: Error }[] = [];
  for (const { entrada, error } of leerDeclarativos(raiz)) {
    if (error) {
      errores.push({ entrada, error });
      continue;
    }
    try {
      cargados.push(await cargarPluginExterno(entrada, deps));
    } catch (e) {
      errores.push({ entrada, error: e instanceof Error ? e : new Error(String(e)) });
    }
  }
  return { cargados, errores };
}

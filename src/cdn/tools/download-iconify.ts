/**
 * download-iconify — descarga a la app los íconos Iconify que usa y escribe su mapa.
 *
 * Cada app iswc tiene en `assets/`:
 *   dl.js                        configuración (solo rutas) que llama a esta herramienta por URL fijada
 *   iconify.json                 mapa `IconifyMap`: qué íconos tiene la app en local (y su `host`)
 *   iconify/<set>/<nombre>.svg   un SVG por ícono (de https://api.iconify.design)
 *
 * En ejecución `<iswc-icon>` hace una sola pregunta: ¿está en el mapa? → archivo local; si no → API.
 *
 * Qué hace `descargarIconos`:
 *   1. Barre `roots` (.ts/.js/.mjs/.html/.json) y extrae los ids `set:nombre` entre comillas
 *      (`icon="mdi:home"`, `icono: 'mdi:home'`). Los ejemplos en comentarios no cuentan.
 *   2. Registro de consumos: suma TODOS los íconos de los `iconify.json` de lo que la app consume
 *      (`mapas`; por defecto el del kit al mismo SHA que esta herramienta). Son conjuntos mínimos:
 *      que sobren unos pocos no importa, y así la app sirve en local también los de sus dependencias.
 *   3. Filtra con la lista de colecciones de Iconify (descarta `node:fs`, `http:x`, `z-index:1`…).
 *   4. Descarga en lote lo que falta (`<set>.json?icons=a,b,…`, reintentos ante 429/5xx); lo que ya
 *      está en disco no se vuelve a pedir. Poda lo que ya nadie usa y escribe un mapa determinista.
 *   Sin red no falla: reescribe el mapa con lo que ya hay en disco y avisa.
 *
 * Uso (desde `assets/dl.js`; Deno corre la herramienta por URL sin descargar nada):
 *   import { descargarIconos } from 'https://raw.githubusercontent.com/<owner>/<repo>/<sha>/src/cdn/tools/download-iconify.ts';
 *   await descargarIconos({ raiz: new URL('..', import.meta.url), roots: ['index.html', 'src', 'view'] });
 * CLI: deno run -A download-iconify.ts --raiz=. --roots=src,view [--salida=assets] [--offline] [--extra=a:b] [--mapas=url1,url2]
 *
 * Solo `node:*`: corre igual en Node y en Deno.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import type { IconId, IconifyJson, IconifyMap, OpcionesDescarga, ResumenDescarga } from './download-iconify.schemas.ts';

export type { IconId, IconifyJson, IconifyMap, OpcionesDescarga, ResumenDescarga } from './download-iconify.schemas.ts';

export const DEFAULTS = {
  salida: 'assets',
  ignorar: ['node_modules', 'dist', 'vendor', '.git', '.tmp', '.tmp-scss'],
  extensiones: ['.ts', '.js', '.mjs', '.html', '.json'],
  podar: true,
  offline: false,
  api: 'https://api.iconify.design/',
  concurrencia: 8,
};

/** Nombre del mapa y de la carpeta de SVG dentro de `salida`. */
export const ARCHIVO_MAPA = 'iconify.json';
export const CARPETA_SVG = 'iconify';
/** Íconos por petición en lote (la URL queda por debajo de ~2 KB). */
const LOTE = 80;

const RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const RE_LITERAL = /(['"`])([a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*)\1/g;

export const esIdIcono = (s: string): s is IconId => RE_ID.test(s);

/** Ids `set:nombre` entre comillas en un texto (candidatos: aún sin filtrar por colección). */
export function extraerIconos(texto: string): IconId[] {
  const out = new Set<IconId>();
  for (const m of texto.matchAll(RE_LITERAL)) out.add(m[2] as IconId);
  return [...out];
}

/** Quita JSDoc y comentarios de línea completa: los ejemplos de la documentación no son íconos usados. */
export const sinComentarios = (codigo: string): string =>
  codigo.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function leerDeno(raiz: string): { iswc?: { host?: unknown }; name?: unknown } | null {
  for (const f of ['deno.json', 'deno.jsonc']) {
    const p = join(raiz, f);
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
    } catch {
      return null;
    }
  }
  return null;
}

/** `host` publicado de la app: `deno.json` → `iswc.host` (con `/` final) o `null`. */
export function leerHost(raiz: string): string | null {
  const h = leerDeno(raiz)?.iswc?.host;
  return typeof h === 'string' && /^https?:\/\//.test(h) ? (h.endsWith('/') ? h : `${h}/`) : null;
}

function nombreApp(raiz: string): string {
  const n = leerDeno(raiz)?.name;
  return typeof n === 'string' && n ? n : basename(resolve(raiz));
}

function listar(raiz: string, roots: string[], ignorar: Set<string>, exts: Set<string>, excluir: string): string[] {
  const out: string[] = [];
  const visitar = (p: string): void => {
    if (!existsSync(p) || resolve(p).startsWith(excluir)) return;
    if (statSync(p).isDirectory()) {
      if (ignorar.has(basename(p))) return;
      for (const n of readdirSync(p).sort()) visitar(join(p, n));
    } else if (exts.has(extname(p))) out.push(p);
  };
  for (const r of roots) visitar(join(raiz, r));
  return out;
}

const agrupar = (ids: Iterable<string>): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const id of [...new Set(ids)].sort()) {
    const [set, nombre] = id.split(':') as [string, string];
    (out[set] ??= []).push(nombre);
  }
  return out;
};

/**
 * `iconify.json` del kit por defecto: junto a esta herramienta, al mismo SHA (por URL) o en el mismo
 * checkout (`file:`). El propio kit pasa `mapas: []` en su dl.js para no leerse a sí mismo.
 */
export function mapaDelKit(urlHerramienta: string = import.meta.url): string | null {
  if (!/^(https?|file):/.test(urlHerramienta) || !urlHerramienta.includes('/src/cdn/tools/')) return null;
  return new URL(`../../../assets/${ARCHIVO_MAPA}`, urlHerramienta).href;
}

async function leerMapa(ref: string, raiz: string, f: typeof fetch): Promise<IconifyMap> {
  const texto = /^https?:/.test(ref)
    ? await f(ref).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    : readFileSync(ref.startsWith('file:') ? fileURLToPath(ref) : join(raiz, ref), 'utf8');
  const m = JSON.parse(texto) as IconifyMap;
  if (m?.v !== 1 || typeof m.icons !== 'object') throw new Error('no es un iconify.json v1');
  return m;
}

/** SVG suelto (como lo sirve `api.iconify.design/<set>/<n>.svg`) a partir del JSON de la colección. */
export function svgDe(datos: IconifyJson, nombre: string): string | null {
  const i = datos.icons?.[nombre];
  if (!i) return null;
  const w = i.width ?? datos.width ?? 16;
  const h = i.height ?? datos.height ?? 16;
  const l = i.left ?? datos.left ?? 0;
  const t = i.top ?? datos.top ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${+(w / h).toFixed(4)}em" height="1em" viewBox="${l} ${t} ${w} ${h}">${i.body}</svg>`;
}

/** GET con reintentos ante 429/5xx/red; `null` si la API no contestó algo útil. 404 se devuelve tal cual. */
async function pedir(f: typeof fetch, url: string, intentos = 4): Promise<Response | null> {
  for (let k = 0; k < intentos; k++) {
    try {
      const r = await f(url);
      if (r.ok || r.status === 404) return r;
      await r.body?.cancel();
    } catch { /* red: reintento */ }
    if (k < intentos - 1) await new Promise((res) => setTimeout(res, 400 * 2 ** k));
  }
  return null;
}

async function enLotes<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]!);
  }));
}

/** Barre, suma los íconos de lo que consume, descarga lo que falta, poda y escribe `<salida>/iconify.json`. */
export async function descargarIconos(opciones: OpcionesDescarga & { fetch?: typeof fetch }): Promise<ResumenDescarga> {
  const o = { ...DEFAULTS, ...Object.fromEntries(Object.entries(opciones).filter(([, v]) => v !== undefined)) } as typeof DEFAULTS & OpcionesDescarga;
  const f = opciones.fetch ?? fetch;
  const raiz = resolve(typeof o.raiz === 'string' ? o.raiz : fileURLToPath(o.raiz));
  const salida = join(raiz, o.salida);
  const dirSvg = join(salida, CARPETA_SVG);
  const api = o.api.endsWith('/') ? o.api : `${o.api}/`;
  const avisos: string[] = [];
  const log = (s: string) => { if (!o.silencioso) console.log(`[iconify] ${s}`); };
  const avisar = (s: string) => {
    avisos.push(s);
    if (!o.silencioso) console.warn(`[iconify] aviso: ${s}`);
  };

  // 1. Barrido de la app.
  const archivos = listar(raiz, o.roots, new Set(o.ignorar), new Set(o.extensiones), resolve(salida));
  const candidatos = new Set<string>(o.extra ?? []);
  for (const a of archivos) {
    const texto = readFileSync(a, 'utf8');
    for (const i of extraerIconos(/\.(ts|js|mjs)$/.test(a) ? sinComentarios(texto) : texto)) candidatos.add(i);
  }

  // 2. Registro de consumos: todos los íconos de los mapas del kit y de las apps que consume.
  const refs = o.mapas ?? [mapaDelKit()].filter((x): x is string => !!x);
  let consumidos = 0;
  for (const ref of refs) {
    if (o.offline && /^https?:/.test(ref)) continue;
    try {
      const m = await leerMapa(ref, raiz, f);
      for (const [set, nombres] of Object.entries(m.icons)) {
        for (const n of nombres) {
          candidatos.add(`${set}:${n}`);
          consumidos++;
        }
      }
    } catch (e) {
      avisar(`mapa ${ref} inaccesible (${(e as Error).message}): sus íconos no se suman`);
    }
  }

  // 3. Filtro por colecciones reales de Iconify (sin red: solo lo que ya está en disco).
  const enDisco = (id: string) => {
    const [s, n] = id.split(':');
    return existsSync(join(dirSvg, s!, `${n}.svg`));
  };
  let colecciones: Set<string> | null = null;
  if (!o.offline) {
    try {
      const r = await pedir(f, `${api}collections`);
      if (!r?.ok) throw new Error(r ? `HTTP ${r.status}` : 'sin respuesta');
      colecciones = new Set(Object.keys(await r.json() as Record<string, unknown>));
    } catch (e) {
      avisar(`API de Iconify inaccesible (${(e as Error).message}): se conserva lo que ya está en disco`);
    }
  }
  const validos = [...candidatos]
    .filter((id) => esIdIcono(id) && (colecciones ? colecciones.has(id.split(':')[0]!) : enDisco(id)))
    .sort();

  // 4. Descarga en lote de lo que falta. Los alias (íconos que heredan de otro) se piden sueltos.
  const descargados: IconId[] = [];
  const inexistentes: IconId[] = [];
  const faltan = validos.filter((id) => !enDisco(id));
  const existentes = validos.length - faltan.length;
  const guardar = (set: string, nombre: string, svg: string) => {
    mkdirSync(join(dirSvg, set), { recursive: true });
    writeFileSync(join(dirSvg, set, `${nombre}.svg`), svg);
    descargados.push(`${set}:${nombre}` as IconId);
  };
  if (colecciones && faltan.length) {
    const lotes: [string, string[]][] = [];
    for (const [set, nombres] of Object.entries(agrupar(faltan))) {
      for (let i = 0; i < nombres.length; i += LOTE) lotes.push([set, nombres.slice(i, i + LOTE)]);
    }
    const sueltos: [string, string][] = [];
    await enLotes(lotes, o.concurrencia, async ([set, nombres]) => {
      const r = await pedir(f, `${api}${set}.json?icons=${nombres.join(',')}`);
      if (!r) return avisar(`${set}: la API no respondió (${nombres.length} íconos quedan pendientes)`);
      if (r.status === 404) return void inexistentes.push(...nombres.map((n) => `${set}:${n}` as IconId));
      const datos = await r.json() as IconifyJson;
      for (const n of nombres) {
        const svg = svgDe(datos, n);
        if (svg) guardar(set, n, svg);
        else if (datos.aliases?.[n]) sueltos.push([set, n]);
        else inexistentes.push(`${set}:${n}` as IconId);
      }
    });
    await enLotes(sueltos, o.concurrencia, async ([set, n]) => {
      const r = await pedir(f, `${api}${set}/${n}.svg`);
      const svg = r?.ok ? await r.text() : '';
      if (svg.trimStart().startsWith('<svg')) guardar(set, n, svg);
      else if (r) inexistentes.push(`${set}:${n}` as IconId);
      else avisar(`${set}:${n}: la API no respondió`);
    });
  }
  inexistentes.sort();
  descargados.sort();
  for (const id of inexistentes) avisar(`${id} no existe en Iconify`);
  const finales = new Set(validos.filter(enDisco));

  // 5. Poda: SVG que ya nadie pide (solo con veredicto completo: red disponible u offline explícito).
  const podados: IconId[] = [];
  if (o.podar && existsSync(dirSvg) && (colecciones || o.offline)) {
    for (const set of readdirSync(dirSvg)) {
      const d = join(dirSvg, set);
      if (!statSync(d).isDirectory()) continue;
      for (const n of readdirSync(d)) {
        const id = `${set}:${n.replace(/\.svg$/, '')}`;
        if (n.endsWith('.svg') && !finales.has(id)) {
          rmSync(join(d, n));
          podados.push(id as IconId);
        }
      }
      if (!readdirSync(d).length) rmSync(d, { recursive: true });
    }
  }
  podados.sort();

  // 6. Mapa determinista (sin fecha: mismo código → mismo archivo).
  const mapa: IconifyMap = {
    v: 1,
    app: nombreApp(raiz),
    host: o.host ?? leerHost(raiz),
    ruta: relative(raiz, join(salida, ARCHIVO_MAPA)).replace(/\\/g, '/'),
    base: `${CARPETA_SVG}/`,
    icons: agrupar(finales),
  };
  if (!mapa.host) avisar('deno.json sin "iswc": { "host": "https://…/" }: el mapa sale con host null');
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, ARCHIVO_MAPA), `${JSON.stringify(mapa, null, 2)}\n`);

  log(`${archivos.length} archivos · ${finales.size} íconos (${consumidos} de consumos; ${descargados.length} nuevos, ${existentes} ya estaban, ${podados.length} podados, ${inexistentes.length} inexistentes) → ${mapa.ruta}`);
  return { archivos: archivos.length, encontrados: finales.size, descargados, existentes, inexistentes, podados, avisos, mapa };
}

if (import.meta.main) {
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const lista = (k: string) => arg(k)?.split(',').map((s) => s.trim()).filter(Boolean);
  const r = await descargarIconos({
    raiz: arg('raiz') ?? process.cwd(),
    roots: lista('roots') ?? ['index.html', 'src', 'view'],
    salida: arg('salida'),
    extra: lista('extra') as IconId[] | undefined,
    mapas: lista('mapas'),
    offline: process.argv.includes('--offline'),
  });
  if (r.inexistentes.length) process.exitCode = 1;
}

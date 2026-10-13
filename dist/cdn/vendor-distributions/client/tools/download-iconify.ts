// @vendor 2026-10-13T15:51:18.306Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/client/tools/download-iconify.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/10-iconos.md
/**
 * download-iconify — descarga a la app los íconos Iconify que usa (SIN mapa: Jeff, 2026-10-13).
 *
 * Cada app iswc tiene en `assets/`:
 *   dl.js                        configuración (rutas y `extra`) que llama a esta herramienta (bundle online @main)
 *   iconify/<set>/<nombre>.svg   un SVG por ícono (de https://api.iconify.design/<set>/<nombre>.svg)
 *
 * En ejecución `<iswc-icon>` resuelve localStorage → `<html data-icons>` (web publicada de la app,
 * `initApp({ icons: { host } })`) → API, y avisa `[iswc-icon] falta en local: <set>:<nombre>` cuando
 * un ícono no estaba publicado: ese id se añade a `extra` de `assets/dl.js` (íconos que el barrido no ve,
 * p. ej. los que pintan por dentro los componentes del kit) y se vuelve a correr `deno task icons`.
 *
 * Qué hace `descargarIconos`:
 *   1. Barre `roots` (.ts/.js/.mjs/.html/.json) y extrae los ids `set:nombre` entre comillas
 *      (`icon="mdi:home"`, `icono: 'mdi:home'`). Los ejemplos en comentarios no cuentan. Suma `extra`.
 *   2. Filtra con la lista de colecciones de Iconify (descarta `node:fs`, `http:x`, `z-index:1`…).
 *   3. Descarga en lote lo que falta (`<set>.json?icons=a,b,…`, reintentos ante 429/5xx); lo que ya
 *      está en disco no se vuelve a pedir. Poda los SVG que ya nadie usa.
 *   Sin red no falla: conserva lo que ya hay en disco y avisa.
 *
 * Uso (desde `assets/dl.js`; Deno corre el bundle por URL sin descargar nada):
 *   import { descargarIconos } from 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs';
 *   await descargarIconos({ raiz: new URL('..', import.meta.url), roots: ['index.html', 'src', 'view'], extra: ['mdi:broom'] });
 * CLI: deno run -A download-iconify.ts --raiz=. --roots=src,view [--salida=assets] [--offline] [--extra=a:b,c:d]
 *
 * Solo `node:*`: corre igual en Node y en Deno.
 *
 * Perfil: client. Vendor: NO se vendoriza (CLI online, Jeff 2026-10-13): `assets/dl.js` de cada app importa el bundle `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs` y la tarea `icons` corre con `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`. Imports relativos que deben viajar con él: `../../shared/schemas.ts` (sección `download-iconify`).
 * Skill: skills/iswc-foundation/references/10-iconos.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/10-iconos.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import type { IconId, IconifyJson, OpcionesDescarga, ResumenDescarga } from '../../shared/schemas.ts';

export type { IconId, IconifyJson, OpcionesDescarga, ResumenDescarga } from '../../shared/schemas.ts';

export const DEFAULTS = {
  salida: 'assets',
  ignorar: ['node_modules', 'dist', 'vendor', '.git', '.tmp', '.tmp-scss'],
  extensiones: ['.ts', '.js', '.mjs', '.html', '.json'],
  podar: true,
  offline: false,
  api: 'https://api.iconify.design/',
  concurrencia: 8,
};

/** Carpeta de los SVG dentro de `salida` (la que publica la app: `initApp({ icons: { folder } })`). */
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

/** Barre (más `extra`), descarga lo que falta a `<salida>/iconify/<set>/<n>.svg` y poda lo que nadie usa. */
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

  // 2. Filtro por colecciones reales de Iconify (sin red: solo lo que ya está en disco).
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

  // 3. Descarga en lote de lo que falta. Los alias (íconos que heredan de otro) se piden sueltos.
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

  // 4. Poda: SVG que ya nadie pide (solo con veredicto completo: red disponible u offline explícito).
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

  // El mapa ya no existe: un `iconify.json` viejo junto a la carpeta se retira.
  const mapaViejo = join(salida, 'iconify.json');
  const rel = (p: string) => relative(raiz, p).split('\\').join('/');
  if (existsSync(mapaViejo)) { rmSync(mapaViejo); log(`${rel(mapaViejo)} retirado (sin mapa: <iswc-icon> usa data-icons)`); }
  const carpeta = rel(dirSvg);
  log(`${archivos.length} archivos · ${finales.size} íconos (${descargados.length} nuevos, ${existentes} ya estaban, ${podados.length} podados, ${inexistentes.length} inexistentes) → ${carpeta}/`);
  return { archivos: archivos.length, encontrados: finales.size, descargados, existentes, inexistentes, podados, avisos, carpeta };
}

if (import.meta.main) {
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const lista = (k: string) => arg(k)?.split(',').map((s) => s.trim()).filter(Boolean);
  const r = await descargarIconos({
    raiz: arg('raiz') ?? process.cwd(),
    roots: lista('roots') ?? ['index.html', 'src', 'view'],
    salida: arg('salida'),
    extra: lista('extra') as IconId[] | undefined,
    offline: process.argv.includes('--offline'),
  });
  if (r.inexistentes.length) process.exitCode = 1;
}

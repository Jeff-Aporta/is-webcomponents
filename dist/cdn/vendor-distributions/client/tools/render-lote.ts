// @vendor 2026-10-13T13:28:49.065Z Jeff-Aporta/is-webcomponents@local src/vendor-distributions/client/tools/render-lote.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
/**
 * render-lote.ts — render de un LOTE de diagramas con caché por hash (lo que ISS e ISW hacían cada uno
 * en su `render-docs-iswc.mjs`). Cada editable `<carpeta>/<slug>.json` `{ slug?, module, tag, script,
 * attrs?, payload }` se resuelve (referencias `{ path, query, actions }` con `Obj.resolver`, relativas al
 * editable) y se le calcula una huella sha256 del spec RESUELTO + `pinKit` + `VERSION`. Si la huella
 * coincide con la del caché y las salidas existen, `SKIP`; si no, `render` en un proceso hijo (este
 * mismo módulo con `--one <slug>`) con reintentos: Chromium a veces no arranca en Windows (os error 6)
 * y una excepción suya tumba el proceso; aislarlo evita perder el lote.
 *
 * Caché `diagramas-iswc.cache.json` (junto a los editables, o `cache`):
 *   { version, diagramas: { [slug]: { huella, svg, png, fecha, ancho, alto } } }
 * Se escribe de forma atómica al terminar cada diagrama OK, así un lote interrumpido conserva lo hecho.
 * Ni el caché ni los `_*.json` (fuentes de solo soporte) cuentan como diagramas.
 *
 *   deno run -A --no-check --sloppy-imports render-lote.ts --carpeta=<dir> --svg=<dir> --png=<dir>
 *        [--cache=<archivo>] [--kit=<dir>] [--forzar] [--solo=a,b]
 *
 *   const plan = await planificarLote({ carpeta, salidaSvg, salidaPng, kit });   // puro, sin navegador
 *   const r = await renderizarLote({ carpeta, salidaSvg, salidaPng, kit });        // hijos + caché
 *
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/tools/render-lote.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./render-diagram.js` (y lo que este trae: `../../shared/lib/obj.js`, `./hosts.js`, `./sanitize-svg.js`, `./static-server.js`; vendor.ts reescribe las rutas al aplanar), `../../shared/schemas.ts` (secciones `render-lote`, `render-diagram`).
 * Skill: skills/iswc-diagramas-enriquecidos/SKILL.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { payloadResuelto, renderDiagramBatch, writeDiagramOutputs } from './render-diagram.js';
import { CacheLoteSchema, EditableLoteSchema, OpcionesLoteDatosSchema } from '../../shared/schemas.ts';
import type { CacheLote, DiagramaPlan, EntradaCache, OpcionesLote, OpcionesLoteDatos, PlanLote, RenderDiagramOptions, ResultadoLote } from '../../shared/schemas.ts';

export type { CacheLote, DiagramaPlan, EditableLote, EntradaCache, OpcionesLote, OpcionesLoteDatos, PlanLote, ResultadoLote } from '../../shared/schemas.ts';
export { CacheLoteSchema, EditableLoteSchema, OpcionesLoteDatosSchema } from '../../shared/schemas.ts';

/** Versión del formato de la huella y del caché: súbela cuando cambie qué entra en la huella. */
export const VERSION = 1;
export const CACHE_NOMBRE = 'diagramas-iswc.cache.json';
const ENV_OPCIONES = 'ISWC_RENDER_LOTE';

const esCache = (f: string): boolean => f.endsWith('.cache.json');

/** JSON canónico (claves ordenadas en profundidad): reordenar un editable no cambia su huella. */
export function canonico(v: unknown): string {
  const ordenar = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(ordenar)
    : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, ordenar((x as Record<string, unknown>)[k])]))
    : x;
  return JSON.stringify(ordenar(v));
}

export const sha256 = (texto: string): string => createHash('sha256').update(texto).digest('hex');

/** Sello del kit por defecto: `<kit>/PIN`, si no `dist/cdn/build-stamp.json`, si no vacío. */
export async function pinDelKit(kit: string): Promise<string> {
  for (const f of [join(kit, 'PIN'), join(kit, 'dist', 'cdn', 'build-stamp.json')]) {
    if (existsSync(f)) return (await readFile(f, 'utf8')).trim();
  }
  return '';
}

export const rutaCache = (op: Pick<OpcionesLoteDatos, 'carpeta' | 'cache'>): string =>
  resolve(op.cache ?? join(op.carpeta, CACHE_NOMBRE));

/** Lee el caché; otro `version` o archivo inválido/ausente = caché vacío. */
export async function leerCache(archivo: string): Promise<CacheLote> {
  const vacio: CacheLote = { version: VERSION, diagramas: {} };
  if (!existsSync(archivo)) return vacio;
  try {
    const c = CacheLoteSchema.parse(JSON.parse(await readFile(archivo, 'utf8')));
    return c.version === VERSION ? c : vacio;
  } catch {
    return vacio;
  }
}

/** Anota un diagrama en el caché (lee, mezcla y escribe atómico: tmp + rename). */
export async function anotarCache(archivo: string, slug: string, entrada: EntradaCache): Promise<void> {
  const c = await leerCache(archivo);
  c.diagramas[slug] = entrada;
  await mkdir(dirname(archivo), { recursive: true });
  const tmp = `${archivo}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(c, null, 2) + '\n', 'utf8');
  await rename(tmp, archivo);
}

const relPosix = (desde: string, a: string): string => relative(dirname(desde), a).replaceAll('\\', '/');

/**
 * Plan puro: lee los editables, resuelve referencias, calcula la huella y decide por diagrama.
 * `render` si la huella cambió, faltan salidas o `forzar`; `skip` si todo coincide; `error` si el
 * editable es inválido o una referencia no resuelve (el motivo lo dice).
 */
export async function planificarLote(op: OpcionesLote): Promise<PlanLote> {
  const o = OpcionesLoteDatosSchema.parse(op);
  const carpeta = resolve(o.carpeta);
  const cache = rutaCache(o);
  const pinKit = o.pinKit ?? await pinDelKit(o.kit);
  const png = o.png ?? true;
  const solo = new Set(o.solo ?? []);
  const previo = o.forzar ? { version: VERSION, diagramas: {} } : await leerCache(cache);
  const archivos = (await readdir(carpeta))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_') && !esCache(f) && resolve(carpeta, f) !== cache)
    .sort();
  const diagramas: DiagramaPlan[] = [];
  for (const f of archivos) {
    const archivo = join(carpeta, f);
    let slug = f.replace(/\.json$/, '');
    const salidas = (s: string) => ({ svg: resolve(o.salidaSvg, `${s}.svg`), png: png ? resolve(o.salidaPng, `${s}.png`) : null });
    try {
      const spec = EditableLoteSchema.parse(JSON.parse(await readFile(archivo, 'utf8')));
      slug = spec.slug || slug;
      if (solo.size && !solo.has(slug)) continue;
      const payload = await payloadResuelto({ scriptUrl: '', payload: spec.payload, payloadBase: archivo });
      const job = {
        tag: spec.tag,
        scriptUrl: `dist/cdn/${spec.script.replace(/^\/+/, '')}`,
        payload,
        attrs: spec.attrs ?? {},
      };
      const huella = sha256(canonico({ version: VERSION, pinKit, module: spec.module ?? null, tag: job.tag, script: job.scriptUrl, attrs: job.attrs, payload }));
      const { svg, png: pngSalida } = salidas(slug);
      const antes = previo.diagramas[slug];
      const motivo = o.forzar ? 'forzado'
        : !antes ? 'sin caché'
        : antes.huella !== huella ? 'huella distinta'
        : !existsSync(svg) ? 'falta el SVG'
        : pngSalida && !existsSync(pngSalida) ? 'falta el PNG'
        : '';
      diagramas.push({ slug, archivo, accion: motivo ? 'render' : 'skip', motivo: motivo || 'sin cambios', huella, svg, png: pngSalida, job });
    } catch (e) {
      if (solo.size && !solo.has(slug)) continue;
      const { svg, png: pngSalida } = salidas(slug);
      diagramas.push({ slug, archivo, accion: 'error', motivo: String((e as Error).message || e), huella: '', svg, png: pngSalida });
    }
  }
  return { carpeta, cache, pinKit, diagramas };
}

const chromiumDelKit = (kit: string): RenderDiagramOptions['chromium'] =>
  (createRequire(pathToFileURL(join(kit, 'package.json')))('playwright') as { chromium: RenderDiagramOptions['chromium'] }).chromium;

/** Un diagrama en ESTE proceso (lo que corre el hijo `--one`): render + salidas. Devuelve la línea `OK …`. */
export async function renderizarUno(op: OpcionesLote, slug: string): Promise<{ ancho: number | null; alto: number | null }> {
  const plan = await planificarLote({ ...op, solo: [slug], forzar: true });
  const d = plan.diagramas[0];
  if (!d) throw new Error(`ningún diagrama con slug ${slug}`);
  if (d.accion === 'error' || !d.job) throw new Error(d.motivo);
  const [r] = await renderDiagramBatch([{ id: slug, job: d.job }], {
    chromium: op.chromium ?? chromiumDelKit(op.kit),
    serveRoot: resolve(op.kit),
    timeoutMs: op.timeoutMs ?? 300_000,
    settleMs: op.settleMs ?? 500,
    png: op.png ?? true,
  });
  if (!r?.result) throw new Error(r?.error ?? 'sin resultado');
  await writeDiagramOutputs(r.result, d.svg, d.png ?? undefined);
  return { ancho: r.result.width, alto: r.result.height };
}

const lineaOk = (slug: string, m: { ancho: number | null; alto: number | null }): string => `OK ${slug}.svg (${m.ancho}x${m.alto})`;

/** Lanza el hijo `--one <slug>` con las mismas opciones (JSON por env). Devuelve la línea `OK …` o el error. */
function renderizarEnHijo(op: OpcionesLoteDatos, slug: string): { ok: string | null; detalle: string; status: number | null } {
  const r = spawnSync(process.execPath, [
    'run', '-A', '--no-check', '--sloppy-imports', fileURLToPath(import.meta.url), '--one', slug,
  ], {
    encoding: 'utf8',
    input: '', // stdin propio (pipe vacío): un handle heredado o 'ignore' daba os error 6 al lanzar el navegador
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, [ENV_OPCIONES]: JSON.stringify(op) },
  });
  const ok = (r.stdout || '').split('\n').find((l) => l.startsWith('OK ')) ?? null;
  const detalle = (r.stderr || '').split('\n').filter((l) => l.trim()).slice(0, 4).join(' | ') || 'sin detalle';
  return { ok: r.status === 0 ? ok : null, detalle, status: r.status };
}

/** Lote completo: plan → hijos con reintentos → caché por diagrama OK → resumen. */
export async function renderizarLote(op: OpcionesLote): Promise<ResultadoLote> {
  const log = op.log ?? console.log;
  const { log: _l, chromium: _c, ...datos } = op;
  const plan = await planificarLote(op);
  const res: ResultadoLote = { renderizados: [], sinCambios: [], fallidos: [], cache: plan.cache };
  if (!plan.diagramas.length) {
    log(`render-lote: ningún diagrama coincide (${(op.solo ?? []).join(', ') || 'carpeta vacía'})`);
    return res;
  }
  const intentos = op.intentos ?? 5;
  for (const d of plan.diagramas) {
    if (d.accion === 'skip') {
      log(`SKIP ${d.slug} (sin cambios)`);
      res.sinCambios.push(d.slug);
      continue;
    }
    if (d.accion === 'error') {
      log(`FAIL ${d.slug}: ${d.motivo}`);
      res.fallidos.push({ slug: d.slug, motivo: d.motivo });
      continue;
    }
    let ok: string | null = null;
    let motivo = '';
    for (let i = 1; i <= intentos && !ok; i++) {
      const r = op.chromium
        ? await renderizarUno(op, d.slug).then((m) => ({ ok: lineaOk(d.slug, m), detalle: '', status: 0 })).catch((e) => ({ ok: null, detalle: String((e as Error).message || e), status: 1 }))
        : renderizarEnHijo(datos, d.slug);
      ok = r.ok;
      if (!ok) {
        motivo = `intento ${i}/${intentos}, status ${r.status}: ${r.detalle}`;
        log(`${i === intentos ? 'FAIL' : 'reintento'} ${d.slug} (${motivo})`);
      }
    }
    if (!ok) { res.fallidos.push({ slug: d.slug, motivo }); continue; }
    const [, ancho, alto] = ok.match(/\((\d+|null)x(\d+|null)\)/) ?? [];
    await anotarCache(plan.cache, d.slug, {
      huella: d.huella,
      svg: relPosix(plan.cache, d.svg),
      png: d.png ? relPosix(plan.cache, d.png) : null,
      fecha: new Date().toISOString(),
      ancho: ancho && ancho !== 'null' ? Number(ancho) : null,
      alto: alto && alto !== 'null' ? Number(alto) : null,
    });
    log(ok);
    res.renderizados.push(d.slug);
  }
  log(`lote · ${res.renderizados.length} renderizados · ${res.sinCambios.length} sin cambios · ${res.fallidos.length} fallidos`);
  return res;
}

/** `--clave=valor` / `--flag` → objeto. */
function argumentos(argv: readonly string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]!] = m[2] ?? true;
  }
  return out;
}

function opcionesDeCli(argv: readonly string[]): OpcionesLoteDatos {
  const a = argumentos(argv);
  const texto = (k: string): string | undefined => (typeof a[k] === 'string' ? (a[k] as string) : undefined);
  const kit = texto('kit') ?? process.env.ISWC_KIT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  return OpcionesLoteDatosSchema.parse({
    carpeta: texto('carpeta'),
    salidaSvg: texto('svg'),
    salidaPng: texto('png') ?? texto('svg'),
    cache: texto('cache'),
    kit,
    pinKit: texto('pin'),
    solo: texto('solo')?.split(',').map((s) => s.trim()).filter(Boolean),
    forzar: a.forzar === true,
    png: a['sin-png'] === true ? false : undefined,
    intentos: texto('intentos') ? Number(texto('intentos')) : undefined,
    timeoutMs: texto('timeout') ? Number(texto('timeout')) : undefined,
  });
}

async function cli(): Promise<void> {
  const argv = process.argv.slice(2);
  const one = argv.indexOf('--one');
  if (one >= 0) {
    // Hijo: opciones por env (las del padre), un solo slug.
    const op = OpcionesLoteDatosSchema.parse(JSON.parse(process.env[ENV_OPCIONES] ?? 'null') ?? opcionesDeCli(argv));
    const slug = argv[one + 1]!;
    try {
      console.log(lineaOk(slug, await renderizarUno(op, slug)));
      process.exit(0);
    } catch (e) {
      console.error(`error ${slug}: ${(e as Error).message || e}`);
      process.exit(1);
    }
  }
  const r = await renderizarLote(opcionesDeCli(argv));
  process.exit(r.fallidos.length ? 1 : 0);
}

const esPrincipal = (import.meta as { main?: boolean }).main ?? (process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false);
if (esPrincipal) await cli();


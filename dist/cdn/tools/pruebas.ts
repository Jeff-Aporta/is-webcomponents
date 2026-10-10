// OBSOLETO: nombre anterior de ISPruebas.ts (vendorice ISPruebas.ts).
/// <reference types="node" />
/**
 * Sistema comun de pruebas de las apps del kit (ISS en Node, ISW en Deno).
 *
 *   // tests/chat/traza.test.ts
 *   import { definirPruebas } from '<vendor>/tools/pruebas.ts';
 *   export default definirPruebas([
 *     { nombre: 'traza: filtra por nivel', categoria: 'what', correr({ eq }) { ... } },
 *   ], { antes: abrirNavegador, despues: cerrarNavegador });
 *
 * `correrCarpeta` recorre `tests/`, toma SOLO los `*.test.ts`, importa cada uno,
 * toma la lista que exporta por defecto y corre las pruebas UNA POR UNA, todas
 * con el mismo envoltorio: cooldown proporcional (`test-cooldown.ts`), timeout,
 * nivel `error`/`aviso` y reporte JSON homogeneo. El `nombre` es el id de la
 * prueba: unico en toda la corrida (un repetido aborta antes de correr nada) y
 * llave de su cooldown. Solo `node:*`: corre igual en Node (tsx) y en Deno.
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { formatMs, testCooldownFromEnv } from './test-cooldown.ts';
import type { CtxPrueba, CuerpoT, HooksPruebas, ListaPruebas, OpcionesCarpeta, OpcionesCorrida, OpcionesT, Prueba, ReportePruebas, ResultadoPrueba, TPrueba } from './pruebas.schemas.ts';

export type { CategoriaPrueba, CtxPrueba, HooksPruebas, ListaPruebas, NivelPrueba, OpcionesCarpeta, OpcionesCorrida, OpcionesPrueba, Prueba, ReportePruebas, ResultadoPrueba, TPrueba } from './pruebas.schemas.ts';

const TIMEOUT_DEFAULT = 30_000;

/** Señal interna de `ctx.saltar(motivo)`. */
class PruebaSaltada extends Error {}

/** Valida la lista que exporta un archivo de pruebas y le adjunta sus hooks. */
export function definirPruebas(lista: Prueba[], hooks?: HooksPruebas): ListaPruebas {
  const vistos = new Set<string>();
  for (const p of lista) {
    if (!p || typeof p.nombre !== 'string' || !p.nombre.trim()) throw new Error('definirPruebas: cada prueba necesita un nombre (su id)');
    if (typeof p.correr !== 'function') throw new Error(`definirPruebas: "${p.nombre}" necesita correr()`);
    if (vistos.has(p.nombre)) throw new Error(`definirPruebas: id repetido "${p.nombre}"`);
    if (p.categoria && p.categoria !== 'what' && p.categoria !== 'how') throw new Error(`definirPruebas: "${p.nombre}" categoria invalida`);
    if (p.nivel && p.nivel !== 'error' && p.nivel !== 'aviso') throw new Error(`definirPruebas: "${p.nombre}" nivel invalido`);
    vistos.add(p.nombre);
  }
  const salida = lista as ListaPruebas;
  if (hooks) Object.defineProperty(salida, 'hooks', { value: hooks, enumerable: false });
  return salida;
}

/** `true` si el error es la señal de `ctx.saltar` (envoltorios que capturan errores deben relanzarla). */
export function esSaltada(e: unknown): boolean {
  return e instanceof PruebaSaltada;
}


/**
 * Registrador con la forma de `node:test` (`test(nombre, [opciones], fn)`,
 * `before`, `after`) que arma la lista del formato comun:
 *
 *   const { test, before, after, lista } = coleccionPruebas();
 *   test('mi id unico', async (t) => { assert.ok(...); });
 *   export default lista();
 */
export function coleccionPruebas(defaults: { timeoutMs?: number; categoria?: Prueba['categoria'] } = {}) {
  const pruebas: Prueba[] = [];
  const antes: Array<() => void | Promise<void>> = [];
  const despues: Array<() => void | Promise<void>> = [];
  function test(nombre: string, a?: OpcionesT | CuerpoT, b?: CuerpoT): void {
    const opciones: OpcionesT = typeof a === 'function' ? {} : (a ?? {});
    const cuerpo = typeof a === 'function' ? a : b;
    if (!cuerpo) throw new Error(`coleccionPruebas: "${nombre}" sin cuerpo`);
    const saltar = opciones.skip ? (typeof opciones.skip === 'string' ? opciones.skip : 'skip') : undefined;
    const timeoutMs = opciones.timeout ?? defaults.timeoutMs;
    pruebas.push({
      nombre,
      ...(defaults.categoria ? { categoria: defaults.categoria } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
      ...(saltar ? { saltar } : {}),
      async correr(ctx) {
        const limpiezas: Array<() => void | Promise<void>> = [];
        const t: TPrueba = {
          name: nombre,
          signal: ctx.signal,
          skip: (motivo) => ctx.saltar(motivo ?? 'skip'),
          diagnostic: (linea) => ctx.diag(String(linea)),
          after: (fn) => { limpiezas.push(fn); },
        };
        try {
          await cuerpo(t);
        } finally {
          for (const fn of limpiezas.reverse()) await fn();
        }
      },
    });
  }
  return {
    test,
    it: test,
    /** Agrega una prueba ya en el formato comun (`correr(ctx)` recibe expect/eq/aviso/diag/saltar). */
    prueba: (p: Prueba) => { pruebas.push(p); },
    before: (fn: () => void | Promise<void>) => { antes.push(fn); },
    after: (fn: () => void | Promise<void>) => { despues.push(fn); },
    lista: (): ListaPruebas => definirPruebas(pruebas, antes.length || despues.length ? {
      antes: async () => { for (const fn of antes) await fn(); },
      despues: async () => { for (const fn of despues) await fn(); },
    } : undefined),
  };
}

/** Lista exportada por un modulo de pruebas (`export default [...]`), o `null` si no exporta una. */
export function pruebasDe(modulo: unknown): ListaPruebas | null {
  const lista = (modulo as { default?: unknown } | null)?.default;
  return Array.isArray(lista) ? definirPruebas(lista as Prueba[], (lista as ListaPruebas).hooks) : null;
}

/** `*.test.ts` bajo `carpeta` (recursivo, orden alfabetico por ruta), sin `node_modules` ni carpetas ocultas o excluidas. */
export function archivosDePrueba(carpeta: string, excluir: readonly string[] = []): string[] {
  const out: string[] = [];
  const caminar = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name.startsWith('.') || excluir.includes(e.name)) continue;
        caminar(join(dir, e.name));
      } else if (e.name.endsWith('.test.ts')) out.push(join(dir, e.name));
    }
  };
  if (existsSync(carpeta)) caminar(carpeta);
  return out;
}

const normalizar = (s: string) => s.toLowerCase().replace(/[-_]+/g, ' ');

/** Corre una prueba con su contexto y timeout. */
async function ejecutar(p: Prueba): Promise<{ error?: string; saltada?: string; avisos: string[]; diag: string[] }> {
  const fallas: string[] = [];
  const avisos: string[] = [];
  const diag: string[] = [];
  const ctrl = new AbortController();
  const ctx: CtxPrueba = {
    expect: (etiqueta, ok, detalle = '') => { if (!ok) fallas.push(detalle ? `${etiqueta} (${detalle})` : etiqueta); },
    eq: (etiqueta, actual, esperado) => {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(esperado);
      if (a !== e) fallas.push(`${etiqueta} (actual=${a} esperado=${e})`);
    },
    aviso: (m) => { avisos.push(m); },
    diag: (m) => { diag.push(m); },
    saltar: (motivo) => { throw new PruebaSaltada(motivo); },
    signal: ctrl.signal,
  };
  const ms = p.timeoutMs ?? TIMEOUT_DEFAULT;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(() => p.correr(ctx)),
      new Promise((_, rechazar) => { timer = setTimeout(() => { ctrl.abort(); rechazar(new Error(`timeout ${ms}ms`)); }, ms); }),
    ]);
  } catch (e) {
    if (e instanceof PruebaSaltada) return { saltada: e.message || 'saltada', avisos, diag };
    fallas.unshift(e instanceof Error ? e.message : String(e));
  } finally {
    if (timer) clearTimeout(timer);
  }
  return { ...(fallas.length ? { error: `${fallas.length} falla(s): ${fallas.slice(0, 8).join('; ')}` } : {}), avisos, diag };
}

/**
 * Importa los archivos (en orden), valida que los ids sean unicos en toda la
 * corrida y corre las pruebas una por una. Un archivo que no carga es una prueba roja.
 * @throws si dos pruebas comparten id (el agente debe renombrar una).
 */
export async function correrPruebas(o: OpcionesCorrida): Promise<ReportePruebas> {
  const t0 = Date.now();
  const log = o.log ?? ((l: string) => console.log(l));
  const importar = o.importar ?? ((url: string) => import(url));
  // Sin `sinCooldown` manda el entorno (`TEST_COOLDOWN=0`, `--sin-cooldown`).
  const cooldown = testCooldownFromEnv({ ...(o.sinCooldown ? { disabled: true } : {}), ...(o.cooldownDb ? { dbPath: o.cooldownDb } : {}) });
  const grupos: Array<{ archivo: string; lista: ListaPruebas }> = [];
  const resultados: ResultadoPrueba[] = [];

  for (const abs of o.archivos) {
    const archivo = relative(o.raiz, abs).replace(/\\/g, '/');
    try {
      const lista = pruebasDe(await importar(pathToFileURL(abs).href));
      if (lista) grupos.push({ archivo, lista });
      else resultados.push({ archivo, nombre: `(sin lista) ${archivo}`, ok: false, nivel: 'error', categoria: null, durationMs: 0, error: 'el archivo no exporta por defecto su lista de pruebas (definirPruebas)', avisos: [], diag: [] });
    } catch (e) {
      resultados.push({ archivo, nombre: `(carga) ${archivo}`, ok: false, nivel: 'error', categoria: null, durationMs: 0, error: `no carga: ${e instanceof Error ? e.message : String(e)}`, avisos: [], diag: [] });
    }
  }

  // Ids unicos en TODA la corrida: un repetido aborta antes de correr nada.
  const dondeEsta = new Map<string, string[]>();
  for (const g of grupos) for (const p of g.lista) dondeEsta.set(p.nombre, [...(dondeEsta.get(p.nombre) ?? []), g.archivo]);
  const repetidos = [...dondeEsta].filter(([, archivos]) => archivos.length > 1);
  if (repetidos.length) {
    throw new Error(`ids de prueba repetidos (cada prueba necesita un nombre unico):\n${repetidos.map(([id, a]) => `  - "${id}" en ${a.join(', ')}`).join('\n')}`);
  }

  const solo = (o.solo ?? []).map(normalizar).filter(Boolean);
  const elegida = (p: Prueba) => (!o.categoria || p.categoria === o.categoria) && (!solo.length || solo.some((s) => normalizar(p.nombre).includes(s)));

  for (const { archivo, lista } of grupos) {
    if (o.aislar) {
      const elegidas = lista.filter(elegida);
      // Sin nada que correr (todo saltado o en cooldown) no se lanza el proceso.
      if (!elegidas.some((p) => !p.saltar && !cooldown.check(p.nombre).skip)) {
        for (const p of elegidas) {
          const c = cooldown.check(p.nombre);
          const r: ResultadoPrueba = { archivo, nombre: p.nombre, nivel: p.nivel ?? 'error', categoria: p.categoria ?? null, ok: true, durationMs: 0, avisos: [], diag: [] };
          if (p.saltar) r.saltada = p.saltar;
          else if (c.skip) r.cooldown = formatMs(c.remainingMs);
          resultados.push(r);
        }
        continue;
      }
      resultados.push(...await correrAislado(o, archivo, log));
      continue;
    }
    let preparado = false;
    try {
      for (const prueba of lista.filter(elegida)) {
        const base = { archivo, nombre: prueba.nombre, nivel: prueba.nivel ?? 'error', categoria: prueba.categoria ?? null } as const;
        if (prueba.saltar) { resultados.push({ ...base, ok: true, durationMs: 0, saltada: prueba.saltar, avisos: [], diag: [] }); continue; }
        const c = cooldown.check(prueba.nombre);
        if (c.skip) { resultados.push({ ...base, ok: true, durationMs: 0, cooldown: formatMs(c.remainingMs), avisos: [], diag: [] }); continue; }
        if (!preparado && lista.hooks?.antes) {
          try {
            await lista.hooks.antes();
          } catch (e) {
            resultados.push({ ...base, ok: false, durationMs: 0, error: `antes() del archivo fallo: ${e instanceof Error ? e.message : String(e)}`, avisos: [], diag: [] });
            break;
          }
        }
        preparado = true;
        const t = Date.now();
        const r = await ejecutar(prueba);
        const durationMs = Date.now() - t;
        if (r.saltada) { resultados.push({ ...base, ok: true, durationMs, saltada: r.saltada, avisos: r.avisos, diag: r.diag }); log(`- ${prueba.nombre} (saltada: ${r.saltada})`); continue; }
        // Una prueba de nivel `aviso` nunca pone rojo: su falla queda como aviso.
        const ok = !r.error || base.nivel === 'aviso';
        const avisos = r.error && base.nivel === 'aviso' ? [r.error, ...r.avisos] : r.avisos;
        cooldown.record(prueba.nombre, durationMs, !r.error);
        const res: ResultadoPrueba = { ...base, ok, durationMs, avisos, diag: r.diag, ...(r.error && base.nivel === 'error' ? { error: r.error } : {}) };
        log(`${ok ? (avisos.length ? '!' : '✓') : '✗'} ${prueba.nombre} (${formatMs(durationMs)})${res.error ? ` — ${res.error.slice(0, 300)}` : ''}`);
        resultados.push(res);
      }
    } finally {
      if (preparado && lista.hooks?.despues) {
        try { await lista.hooks.despues(); } catch (e) { log(`! despues() de ${archivo} fallo: ${e instanceof Error ? e.message : String(e)}`); }
      }
    }
  }

  return {
    kind: 'iswc.pruebas',
    version: 2,
    resumen: {
      total: resultados.length,
      ok: resultados.filter((r) => r.ok).length,
      rojos: resultados.filter((r) => !r.ok).length,
      avisos: resultados.filter((r) => r.avisos.length).length,
      saltadas: resultados.filter((r) => r.saltada).length,
      cooldown: resultados.filter((r) => r.cooldown).length,
      durationMs: Date.now() - t0,
    },
    resultados,
  };
}

const MARCA = '@@iswc.pruebas@@';

/** Reporte que entrega `pruebas-hijo.ts`; `null` si la línea no trae uno válido. */
function leerReporte(json: string): ReportePruebas | null {
  let v: unknown;
  try { v = JSON.parse(json); } catch { return null; }
  return esReporte(v) ? v : null;
}

function esReporte(v: unknown): v is ReportePruebas {
  if (typeof v !== 'object' || v === null) return false;
  const resumen: unknown = Reflect.get(v, 'resumen');
  return Array.isArray(Reflect.get(v, 'resultados')) && typeof resumen === 'object' && resumen !== null;
}

/** Corre un archivo en un proceso hijo (`pruebas-hijo.ts`) y devuelve sus resultados. */
function correrAislado(o: OpcionesCorrida, archivo: string, log: (l: string) => void): Promise<ResultadoPrueba[]> {
  // Sin `new URL`: un archivo de pruebas puede reemplazar el URL global al importarse.
  const hijo = join(dirname(fileURLToPath(import.meta.url)), 'pruebas-hijo.ts');
  const opciones = { archivo: join(o.raiz, archivo), raiz: o.raiz, solo: o.solo, categoria: o.categoria, sinCooldown: o.sinCooldown, cooldownDb: o.cooldownDb };
  const [cmd, ...flags] = o.aislar?.comando ?? [];
  if (!cmd) return Promise.reject(new Error('pruebas: `aislar.comando` vacío; se necesita el ejecutable (p. ej. ["node", "--import", "tsx"])'));
  return new Promise((resolver) => {
    const p = spawn(cmd, [...flags, hijo, JSON.stringify(opciones)], { cwd: o.raiz, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    // En un objeto: el narrowing de TS no sigue asignaciones hechas dentro de los callbacks.
    const estado: { reporte: ReportePruebas | null } = { reporte: null };
    let resto = '';
    let errores = '';
    p.stdout.on('data', (d: Buffer | string) => {
      const lineas = (resto + String(d)).split(/\r?\n/);
      resto = lineas.pop() ?? '';
      for (const l of lineas) {
        if (l.startsWith(MARCA)) estado.reporte = leerReporte(l.slice(MARCA.length));
        else if (l.trim()) log(l);
      }
    });
    p.stderr.on('data', (d: Buffer | string) => { errores = (errores + String(d)).slice(-4000); });
    p.on('close', (codigo: number | null) => {
      if (resto.startsWith(MARCA)) estado.reporte = leerReporte(resto.slice(MARCA.length));
      const r = estado.reporte;
      if (r) { resolver(r.resultados); return; }
      const error = `el proceso del archivo termino (codigo ${codigo}) sin reporte: ${errores.trim().slice(-800)}`;
      log(`✗ ${archivo} — ${error.slice(0, 300)}`);
      resolver([{ archivo, nombre: `(proceso) ${archivo}`, ok: false, nivel: 'error', categoria: null, durationMs: 0, error, avisos: [], diag: [] }]);
    });
  });
}

/** Linea con la que `pruebas-hijo.ts` entrega su reporte al padre. */
export function lineaReporte(r: ReportePruebas): string {
  return MARCA + JSON.stringify(r);
}

/** Recorre una carpeta (`tests/`), toma los `*.test.ts` y los corre con `correrPruebas`. */
export function correrCarpeta(o: OpcionesCarpeta): Promise<ReportePruebas> {
  const { carpeta, excluir, ...resto } = o;
  return correrPruebas({ ...resto, archivos: archivosDePrueba(carpeta, excluir) });
}

/** Codigo de salida de un reporte: 0 si no hay rojos. */
export function codigoSalida(r: ReportePruebas): number {
  return r.resumen.rojos ? 1 : 0;
}

/** Resumen legible de un reporte (rojos y avisos primero). */
export function resumirReporte(r: ReportePruebas): string {
  const lineas = [`[pruebas] total=${r.resumen.total} ok=${r.resumen.ok} rojos=${r.resumen.rojos} avisos=${r.resumen.avisos} cooldown=${r.resumen.cooldown} saltadas=${r.resumen.saltadas} (${formatMs(r.resumen.durationMs)})`];
  for (const x of r.resultados.filter((y) => !y.ok)) lineas.push(`  ROJO  ${x.nombre} [${x.archivo}]: ${x.error ?? ''}`.slice(0, 600));
  for (const x of r.resultados.filter((y) => y.ok && y.avisos.length)) lineas.push(`  AVISO ${x.nombre}: ${x.avisos.join(' | ')}`.slice(0, 600));
  return lineas.join('\n');
}

/** `process.argv` -> opciones comunes (`--solo=a,b`, `--categoria=what`, `--sin-cooldown`). */
export function opcionesDeArgv(argv: string[] = process.argv.slice(2)): Pick<OpcionesCorrida, 'solo' | 'categoria' | 'sinCooldown'> {
  const valor = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const cat = valor('categoria');
  return {
    solo: valor('solo')?.split(',').map((s) => s.trim()).filter(Boolean),
    ...(cat === 'what' || cat === 'how' ? { categoria: cat } : {}),
    sinCooldown: argv.includes('--sin-cooldown'),
  };
}

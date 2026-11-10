// @contexto INDICE.md · tests/_shared/README.md
// rutas-reales.ts — layout `iswc` de los flujos reales del ISS (labs/iss-ayudascpia-flujos/payloads/ruta-*.json y
// sus derivados, p. ej. el vector de A10), calculado UNA vez por versión del código y compartido entre archivos.
//
// Medido 6-nov-2026 (TEMU-JEFF, 2 núcleos): las 24 rutas tardan ~127 s solas (ruta-conversacion-turno ~50 s: A* de
// `route()`) y 5-9 min con el equipo cargado. Cada archivo de pruebas corre en su propio proceso y 7 las recalculaban
// (conectores, índices, lanes, puertos, sockets, vars, vector): ~15-25 min del gate y timeouts intermitentes. Ahora:
//   - memo por proceso: los casos de un archivo comparten el cálculo;
//   - caché en disco `.tmp/rutas-reales/<sha>.json`: sha = código del layout (cierre de imports locales de
//     flowchart-spec.ts, leído del disco en cada proceso) + deno.json/deno.lock + versión de Deno + entrada exacta.
//     Un cambio en el código o en el payload cambia la llave: nunca se lee un layout de otra versión. Lo que se
//     prueba es la salida del código actual; solo deja de recalcularse la misma salida en cada archivo.
// El layout devuelto es compartido: los casos solo lo leen, no lo mutan.
// category: "how"
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { RefObj } from '../../src/vendor-distributions/shared/lib/ref-obj.ts';
import { computeFlowchartLayout } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { resolveFlowchartSpec } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import type { FlowLayout } from '../../src/components/diagrams/schemas/flowchart-spec.schemas.ts';

/**
 * Timeout de los archivos con rutas reales (igual que antes). El cálculo de las rutas ya NO corre dentro de un
 * caso: lo hace `prepararLayouts` en el `before()` del archivo, con presupuesto de CPU (no de reloj); los casos
 * solo leen el memo y verifican. El valor sigue cubriendo los casos sintéticos pesados de esos archivos.
 */
export const TIMEOUT_RUTAS_REALES = 300_000;

/**
 * Presupuesto de CPU (ms de user+system del proceso) para calcular lo que falte. Es CPU, no reloj: la carga
 * del equipo alarga el reloj (medido 6-nov-2026: las 24 rutas, 624 s de reloj con el equipo cargado) pero
 * mucho menos el CPU propio (203 s en esa misma corrida; con 2 núcleos y HT la contención lo infla algo).
 * ~3× lo medido: detecta una regresión de rendimiento del router, no la carga del equipo.
 */
const PRESUPUESTO_CPU_MS = 600_000;

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const PAYLOADS = new URL('../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
const ENTRADA = join(RAIZ, 'src/components/diagrams/utils/flowchart-spec.ts');
const CACHE = join(RAIZ, '.tmp/rutas-reales');
const ALIAS = '@jeff-aporta/iswc-base/';
const IMPORTS = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;

/** Archivo al que apunta un especificador local (imports «sloppy»: `.js` → `.ts`, sin extensión → `.ts`); null si es externo. */
function archivoDe(desde: string, esp: string): string | null {
  const base = esp.startsWith(ALIAS) ? join(RAIZ, 'src', esp.slice(ALIAS.length)) : esp.startsWith('.') ? resolve(dirname(desde), esp) : null;
  if (!base) return null;
  return [base, base.replace(/\.js$/, '.ts'), `${base}.ts`].find((f) => existsSync(f)) ?? base;
}

/** Huella del código del layout: cada módulo local que alcanza `ENTRADA` más lo que fija las dependencias externas. */
function huellaCodigo(): string {
  const h = createHash('sha256');
  const vistos = new Set<string>();
  const pendientes = [ENTRADA];
  while (pendientes.length) {
    const f = pendientes.pop()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    const texto = existsSync(f) ? readFileSync(f, 'utf8') : '(no existe)';
    h.update(`${f.slice(RAIZ.length)}\n${texto}\n`);
    for (const m of texto.matchAll(IMPORTS)) {
      const g = archivoDe(f, m[1]!);
      if (g) pendientes.push(g);
    }
  }
  for (const f of ['deno.json', 'deno.lock']) h.update(existsSync(join(RAIZ, f)) ? readFileSync(join(RAIZ, f)) : '');
  h.update(Deno.version.deno);
  return h.digest('hex');
}

let codigo: string | null = null;
const memo = new Map<string, FlowLayout>();

/** Archivo de la caché del layout de `payload` con el código actual. */
function archivoCache(payload: unknown): string {
  codigo ??= huellaCodigo();
  return join(CACHE, `${createHash('sha256').update(codigo).update(JSON.stringify(payload)).digest('hex')}.json`);
}

const enCache = (payload: unknown): boolean => existsSync(archivoCache(payload));

/** Layout `iswc` del payload de un flujo, memoizado en el proceso y en `.tmp/rutas-reales/`. */
export function layoutRuta(payload: unknown): FlowLayout {
  const archivo = archivoCache(payload);
  const visto = memo.get(archivo);
  if (visto) return visto;
  if (!existsSync(archivo)) {
    const L = computeFlowchartLayout(resolveFlowchartSpec(payload as Record<string, unknown>)!, null, { style: 'iswc' });
    mkdirSync(CACHE, { recursive: true });
    // Escritura atómica: otro proceso nunca lee un JSON a medio escribir.
    const tmp = `${archivo}.${Deno.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(L));
    renameSync(tmp, archivo);
  }
  // Siempre la forma del JSON, venga del cálculo o del disco: el caso no depende de quién calculó.
  const L = JSON.parse(readFileSync(archivo, 'utf8')) as FlowLayout;
  memo.set(archivo, L);
  return L;
}

/** Payloads resueltos (`RefObj`) de las rutas reales del lab (`ruta-*.json`), en orden de nombre. */
export async function payloadsRutas(): Promise<Array<{ nombre: string; payload: Record<string, unknown> }>> {
  const nombres = [...Deno.readDirSync(PAYLOADS)].map((f) => f.name).filter((n) => n.startsWith('ruta-') && n.endsWith('.json')).sort();
  const out: Array<{ nombre: string; payload: Record<string, unknown> }> = [];
  for (const nombre of nombres) {
    const url = new URL(nombre, PAYLOADS);
    const j = await RefObj.resolver(JSON.parse(readFileSync(url, 'utf8')), { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(readFileSync(u, 'utf8')) }) as { payload: Record<string, unknown> };
    out.push({ nombre, payload: j.payload });
  }
  return out;
}

/**
 * Deja calculado (o leído de la caché) el layout de cada payload. Va en el `before()` del archivo: fuera del
 * timeout de reloj de cada caso, que con el equipo cargado medía la carga y no el código. Falla si el cálculo
 * gasta más CPU que `PRESUPUESTO_CPU_MS` (regresión de rendimiento del router, no del equipo).
 */
export function prepararLayouts(payloads: Iterable<unknown>): void {
  const antes = process.cpuUsage();
  const t0 = Date.now();
  let calculados = 0;
  let total = 0;
  for (const p of payloads) {
    total++;
    if (!enCache(p)) calculados++;
    layoutRuta(p);
  }
  const { user, system } = process.cpuUsage(antes);
  const ms = Math.round((user + system) / 1000);
  console.log(`rutas reales: ${total} layouts (${calculados} calculados, ${total - calculados} de la caché) · CPU ${ms} ms · reloj ${Date.now() - t0} ms`);
  if (ms > PRESUPUESTO_CPU_MS) throw new Error(`rutas reales: el layout gastó ${ms} ms de CPU (presupuesto ${PRESUPUESTO_CPU_MS} ms)`);
}

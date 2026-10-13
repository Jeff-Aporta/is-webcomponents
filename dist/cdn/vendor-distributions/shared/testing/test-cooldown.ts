// @vendor 2026-10-13T19:16:11.068Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/testing/test-cooldown.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
// test-cooldown.ts — Cooldown de tests proporcional a su duración, con
// memoria en un JSON.
//
// Regla: un test que pasa en verde no se vuelve a correr durante
// `duración × 1440` (proporcional): 1 min -> 24 h, 30 s -> 12 h, 1 s -> 24 min,
// 13 ms -> 18.720 ms (casi inmediato). Solo el verde actualiza el cooldown: un
// test en rojo guarda `until: -1` (queda auditado que falló y no aplica
// cooldown) y corre siempre hasta que pase. Calibración WT-2026-10-07 (Jeff): antes era
// 30 min por hora (x0,5); x60 (2026-10-07), x360, x600 (WT-2026-10-08) y x1440 (Jeff 2026-10-12: un dia por minuto; los lentos
// retrasaban los sync y el CI/CD): un verde es senal de que en un buen rato no hace falta repetirlo;
// si un test cambio y hay que probarlo ya, se pone su `until` en -1 a mano.
//
// Transversal (Node y Deno): solo depende de `node:fs`/`node:path`/
// `node:process`. Cada proyecto lo adapta con las opciones (ruta del JSON,
// factor, desactivarlo, reloj).
//
// VARIAS INSTANCIAS SOBRE EL MISMO JSON (2026-10-13): `record()` y `entries()` releen el archivo justo
// antes de usarlo y `record()` fusiona SOLO la entrada que graba (leer fresco -> una entrada -> tmp +
// rename). Nunca se escribe la caché completa: antes, el gate del sync (cargado al inicio) pisaba al
// grabar las 241 entradas que el runner de tests (proceso hijo) acababa de escribir. `check()` sigue
// con caché: una lectura por proceso basta para decidir si se salta.
//
// COLA ESTÁNDAR (antes `test-queue.ts`): N trabajadores (3 por defecto, `TEST_CONCURRENCY`) toman la
// siguiente tarea apenas terminan la anterior; `runQueue`, `testConcurrency`, `TEST_CONCURRENCY`.
//
//   const cd = createTestCooldown({ dbPath: ".tmp/test-cooldown.json" });
//   const r = await cd.run("tests/x.test.ts::mi test", () => miTest());
//   if (r.skipped) console.log(`skip ${formatMs(r.remainingMs)}`);
//
// Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/testing/test-cooldown.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../schemas.ts` (sección `test-cooldown`).
//
// COOLDOWN DE LLAVES (jueces LLM y JEV, estándar entre apps): una llave que falla por saldo, key
// rechazada o cuota queda 24 h fuera (`cooldownHasta` ISO en su entrada del archivo de llaves); el
// mismo `-1` a mano la reactiva. Un juez caído NUNCA es error: solo aviso (ver `jueces.ts`).
// Skill: skills/iswc-foundation/references/07-pruebas-y-gate.md
// Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
// Doc (jueces): https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

import { ZEntradaLlave } from "../schemas.ts";
import type { EstadoLlave, OpcionesCola, TEntradaLlave, TestCooldown, TestCooldownCheck, TestCooldownEntry, TestCooldownOptions, TestCooldownRun } from "../schemas.ts";

/** Factor estándar: 1440 min (24 h, un día) de cooldown por cada minuto de ejecución. */
export const COOLDOWN_FACTOR = 1440;

/** Cooldown de una corrida verde: `duración × factor`, proporcional. */
export function cooldownMs(durationMs: number, factor = COOLDOWN_FACTOR): number {
    return Math.max(0, Math.round(durationMs * factor));
}

/** `95000` → `"1m 35s"`. */
export function formatMs(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${r}s` : `${r}s`;
}

/** Id estable de un test: archivo (con `/`) + nombre. */
export function testId(file: string, name: string): string {
    return `${file.replace(/\\/g, "/")}::${name}`;
}

export function createTestCooldown(opts: TestCooldownOptions): TestCooldown {
    const factor = opts.factor ?? COOLDOWN_FACTOR;
    const now = opts.now ?? Date.now;
    let db: Record<string, TestCooldownEntry> | null = null;

    /** Lectura FRESCA del archivo (JSON corrupto o ausente = vacío: nunca rompe la corrida). */
    const leer = (): Record<string, TestCooldownEntry> => {
        try {
            const v: unknown = existsSync(opts.dbPath) ? JSON.parse(readFileSync(opts.dbPath, "utf8")) : {};
            return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, TestCooldownEntry> : {};
        } catch {
            return {};
        }
    };

    /** Caché por proceso: solo para `check` (decidir si se salta). */
    const load = (): Record<string, TestCooldownEntry> => (db ??= leer());

    // Escritura atómica de UNA entrada: se relee el archivo justo antes (otra instancia o proceso pudo
    // grabar en medio), se aplica solo `id` y se escribe por tmp + rename. Nunca la caché completa.
    const grabar = (id: string, entrada: TestCooldownEntry): void => {
        const fresco = leer();
        fresco[id] = entrada;
        mkdirSync(dirname(opts.dbPath), { recursive: true });
        const tmp = `${opts.dbPath}.${process.pid}.tmp`;
        writeFileSync(tmp, JSON.stringify(fresco, null, 2) + "\n", "utf8");
        renameSync(tmp, opts.dbPath);
        if (db) db[id] = entrada;
    };

    const check = (id: string): TestCooldownCheck => {
        if (opts.disabled) return { skip: false };
        const e = load()[id];
        const t = now();
        return e && e.until > t ? { skip: true, until: e.until, remainingMs: e.until - t } : { skip: false };
    };

    const record = (id: string, durationMs: number, ok: boolean): void => {
        if (opts.disabled) return;
        const t = now();
        grabar(id, ok
            // `cooldownMin`: solo para quien lee el JSON (minutos entre okAt y until); el runner no lo usa.
            ? { durationMs, okAt: t, until: t + cooldownMs(durationMs, factor), cooldownMin: Math.round(cooldownMs(durationMs, factor) / 600) / 100 }
            : { durationMs, okAt: null, until: -1, failAt: t });
    };

    /** Corre `fn` si no está en cooldown; mide, registra y relanza si falla. */
    const run = async <T>(id: string, fn: () => T | Promise<T>): Promise<TestCooldownRun<T>> => {
        const c = check(id);
        if (c.skip) return { skipped: true, until: c.until, remainingMs: c.remainingMs };
        const t0 = now();
        try {
            const value = await fn();
            const durationMs = now() - t0;
            record(id, durationMs, true);
            return { skipped: false, durationMs, value };
        } catch (e) {
            record(id, now() - t0, false);
            throw e;
        }
    };

    return { check, record, run, entries: () => leer() };
}

/**
 * Cooldown con la configuración estándar de los proyectos is-*:
 *   TEST_COOLDOWN_DB  ruta del JSON (default `<cwd>/.tmp/test-cooldown.json`)
 *   TEST_COOLDOWN=0   o `--sin-cooldown` en argv: corre todo y no registra.
 */
export function testCooldownFromEnv(opts: Partial<TestCooldownOptions> = {}): TestCooldown {
    return createTestCooldown({
        dbPath: process.env.TEST_COOLDOWN_DB ?? join(process.cwd(), ".tmp", "test-cooldown.json"),
        disabled: process.env.TEST_COOLDOWN === "0" || process.argv.includes("--sin-cooldown"),
        ...opts,
    });
}

// ── Cola estándar de tests (antes `test-queue.ts`) ───────────────────────────
//
//   const res = await runQueue(tests, (t) => correr(t));      // 3 a la vez
//   const res = await runQueue(tests, correr, { concurrency: testConcurrency(env.X) });
//
// Para runners que delegan el paralelismo (p. ej. `deno test --parallel`), `testConcurrency()` es el
// valor a pasar (DENO_JOBS). El entorno lo cambia con TEST_CONCURRENCY=<n>.

/** Tests a la vez por defecto en todos los proyectos is-*. */
export const TEST_CONCURRENCY = 3;

/** Concurrencia efectiva: el valor dado (o env TEST_CONCURRENCY) si es un entero >= 1; si no, 3. */
export function testConcurrency(value: string | number | null | undefined = process.env.TEST_CONCURRENCY): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 1 ? n : TEST_CONCURRENCY;
}

/**
 * Corre `worker` sobre cada item con a lo sumo `concurrency` a la vez.
 * Devuelve los resultados en el orden de `items` (no en el de terminación).
 * Si un worker lanza, `runQueue` rechaza; captura dentro del worker para
 * seguir con el resto.
 */
export async function runQueue<T, R>(
    items: readonly T[],
    worker: (item: T, index: number) => Promise<R>,
    opts: OpcionesCola = {},
): Promise<R[]> {
    const out = new Array<R>(items.length);
    let siguiente = 0;
    const n = Math.min(testConcurrency(opts.concurrency), items.length);
    await Promise.all(Array.from({ length: n }, async () => {
        while (siguiente < items.length) {
            const i = siguiente++;
            out[i] = await worker(items[i]!, i);
        }
    }));
    return out;
}

// ── Cooldown de llaves de los jueces (LLM y JEV) ─────────────────────────────

/** Duración del cooldown tras un fallo definitivo. */
export const COOLDOWN_LLAVE_MS = 24 * 60 * 60_000;

/** Cooldowns de este proceso (respaldo si el archivo no se puede escribir). */
const enMemoria = new Map<string, number>();

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nombreDe = (e: TEntradaLlave): string => e.nombre ?? e.model ?? '';

/** Estado de una entrada cruda del archivo: disponible, o en cooldown con el motivo y cómo reactivarla. */
export function estadoLlave(entrada: unknown, now: number = Date.now()): EstadoLlave {
  const r = ZEntradaLlave.safeParse(entrada);
  const nombre = r.success ? nombreDe(r.data) : '';
  const memoria = enMemoria.get(nombre);
  const hasta = r.success && typeof r.data.cooldownHasta === 'string' ? Date.parse(r.data.cooldownHasta) : memoria ?? NaN;
  if (Number.isFinite(hasta) && hasta > now) {
    return { disponible: false, motivo: `${nombre || 'llave'} en cooldown hasta ${new Date(hasta).toISOString()} (para reintentar ya: cooldownHasta: -1 en el archivo de llaves)` };
  }
  return { disponible: true, motivo: 'ok' };
}

/**
 * Pone en cooldown (24 h por defecto) la entrada `nombre` del archivo `ruta` (en `proveedores[]` o en
 * cualquier objeto de primer nivel con ese `nombre`). Nunca lanza; devuelve el motivo para el aviso.
 */
export function marcarCooldown(ruta: string | undefined, nombre: string, causa: string, o: { now?: number; ms?: number } = {}): string {
  const now = o.now ?? Date.now();
  const hasta = now + (o.ms ?? COOLDOWN_LLAVE_MS);
  enMemoria.set(nombre, hasta);
  const iso = new Date(hasta).toISOString();
  const motivo = `${nombre}: ${causa} → cooldown hasta ${iso} (para reintentar ya: cooldownHasta: -1)`;
  if (!ruta || !existsSync(ruta)) return `${motivo} [solo en memoria: sin archivo de llaves]`;
  try {
    const doc: unknown = JSON.parse(readFileSync(ruta, 'utf8'));
    if (!esObjeto(doc)) return `${motivo} [solo en memoria: archivo sin objeto raíz]`;
    let tocada = false;
    const marcar = (e: unknown): void => {
      if (esObjeto(e) && (e.nombre === nombre || (!e.nombre && e.model === nombre))) { e.cooldownHasta = iso; tocada = true; }
    };
    if (Array.isArray(doc.proveedores)) doc.proveedores.forEach(marcar);
    // Entradas de primer nivel: por su `nombre` o por su clave (`jev: { ... }` sin nombre).
    for (const [k, v] of Object.entries(doc)) {
      if (Array.isArray(v)) continue;
      if (k === nombre && esObjeto(v) && !v.nombre) { v.cooldownHasta = iso; tocada = true; } else marcar(v);
    }
    if (!tocada) return `${motivo} [solo en memoria: ${nombre} no está en el archivo]`;
    writeFileSync(ruta, `${JSON.stringify(doc, null, 2)}\n`);
    return motivo;
  } catch (e) {
    return `${motivo} [solo en memoria: ${e instanceof Error ? e.message : String(e)}]`;
  }
}

/** Olvida los cooldowns en memoria (pruebas). */
export function olvidarCooldownsEnMemoria(): void {
  enMemoria.clear();
}

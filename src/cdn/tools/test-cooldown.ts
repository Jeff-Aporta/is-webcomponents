// test-cooldown.ts — Cooldown de tests proporcional a su duración, con
// memoria en un JSON.
//
// Regla: un test que pasa en verde no se vuelve a correr durante
// `duración × 60` (proporcional): 1 min -> 60 min, 1 s -> 1 min,
// 13 ms -> 780 ms (casi inmediato). Un test en rojo borra su entrada y corre
// siempre hasta que pase. Calibración WT-2026-10-07 (Jeff): antes era
// 30 min por hora (x0,5); ahora x60 para penalizar más los tests lentos.
//
// Transversal (Node y Deno): solo depende de `node:fs`/`node:path`/
// `node:process`. Cada proyecto lo adapta con las opciones (ruta del JSON,
// factor, desactivarlo, reloj).
//
// Vendor: copiar `dist/cdn/tools/test-cooldown.ts` al proyecto (ISS, ISW)
// e importar desde ahi; no tiene imports relativos.
//
//   const cd = createTestCooldown({ dbPath: ".tmp/test-cooldown.json" });
//   const r = await cd.run("tests/x.test.ts::mi test", () => miTest());
//   if (r.skipped) console.log(`skip ${formatMs(r.remainingMs)}`);

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

export type { TestCooldown, TestCooldownCheck, TestCooldownEntry, TestCooldownOptions, TestCooldownRun } from "./test-cooldown.schemas.ts";
import type { TestCooldownCheck, TestCooldownEntry, TestCooldownOptions, TestCooldownRun } from "./test-cooldown.schemas.ts";

/** Factor estándar: 60 min de cooldown por cada minuto de ejecución. */
export const COOLDOWN_FACTOR = 60;

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

export function createTestCooldown(opts: TestCooldownOptions) {
    const factor = opts.factor ?? COOLDOWN_FACTOR;
    const now = opts.now ?? Date.now;
    let db: Record<string, TestCooldownEntry> | null = null;

    const load = (): Record<string, TestCooldownEntry> => {
        if (db) return db;
        try {
            db = existsSync(opts.dbPath) ? JSON.parse(readFileSync(opts.dbPath, "utf8")) : {};
        } catch {
            db = {}; // JSON corrupto: se empieza de cero, nunca rompe la corrida.
        }
        return db!;
    };

    // Escritura atómica: un lector nunca ve el JSON a medias.
    const save = (): void => {
        mkdirSync(dirname(opts.dbPath), { recursive: true });
        const tmp = `${opts.dbPath}.${process.pid}.tmp`;
        writeFileSync(tmp, JSON.stringify(load(), null, 2) + "\n", "utf8");
        renameSync(tmp, opts.dbPath);
    };

    const check = (id: string): TestCooldownCheck => {
        if (opts.disabled) return { skip: false };
        const e = load()[id];
        const t = now();
        return e && e.until > t ? { skip: true, until: e.until, remainingMs: e.until - t } : { skip: false };
    };

    const record = (id: string, durationMs: number, ok: boolean): void => {
        if (opts.disabled) return;
        const d = load();
        if (ok) {
            const t = now();
            d[id] = { durationMs, okAt: t, until: t + cooldownMs(durationMs, factor) };
        } else {
            delete d[id];
        }
        save();
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

    return { check, record, run, entries: () => ({ ...load() }) };
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

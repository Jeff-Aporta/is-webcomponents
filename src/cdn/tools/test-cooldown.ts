// test-cooldown.ts — Cooldown de tests proporcional a su duración, con
// memoria en un JSON.
//
// Regla: un test que pasa en verde no se vuelve a correr durante
// `duración × factor` (factor 30 por defecto: 1 min de ejecución = 30 min de
// skip). Un test en rojo borra su entrada y corre siempre hasta que pase.
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
import { dirname } from "node:path";
import process from "node:process";

export interface TestCooldownEntry {
    /** Duración de la última corrida verde, en ms. */
    durationMs: number;
    /** Epoch ms en que pasó en verde. */
    okAt: number;
    /** Epoch ms hasta el que el test se salta. */
    until: number;
}

export interface TestCooldownOptions {
    /** Ruta del JSON que guarda la memoria. */
    dbPath: string;
    /** Ms de cooldown por cada ms de ejecución. Default 30. */
    factor?: number;
    /** `true` corre todo y no registra nada (p. ej. `--sin-cooldown`). */
    disabled?: boolean;
    /** Reloj inyectable para tests. Default `Date.now`. */
    now?: () => number;
}

export type TestCooldownCheck = { skip: false } | { skip: true; until: number; remainingMs: number };

export type TestCooldownRun<T> =
    | { skipped: true; until: number; remainingMs: number }
    | { skipped: false; durationMs: number; value: T };

/** Cooldown que corresponde a una corrida verde de `durationMs`. */
export function cooldownMs(durationMs: number, factor = 30): number {
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
    const factor = opts.factor ?? 30;
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

export type TestCooldown = ReturnType<typeof createTestCooldown>;

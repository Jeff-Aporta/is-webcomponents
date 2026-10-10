/**
 * Contratos (tipos) del cooldown de tests (`test-cooldown.ts`). W54: los
 * tipos top-level viven en *.schemas.ts.
 */
import type { createTestCooldown } from "./test-cooldown.ts";

export interface TestCooldownEntry {
    /** Duración de la última corrida (verde o roja), en ms. */
    durationMs: number;
    /** Epoch ms en que pasó en verde; `null` si la última corrida fue roja. */
    okAt: number | null;
    /** Epoch ms hasta el que el test se salta; `-1` = la última corrida fue roja (no aplica cooldown). */
    until: number;
    /** Minutos de cooldown aplicados (`until - okAt`, 2 decimales). Solo informativo para quien lee el JSON. */
    cooldownMin?: number;
    /** Epoch ms del último rojo (solo cuando `until === -1`). */
    failAt?: number;
}

export interface TestCooldownOptions {
    /** Ruta del JSON que guarda la memoria. */
    dbPath: string;
    /** Factor cooldown/duración (proporcional). Default 60: 1 min verde -> 60 min de skip. */
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

export type TestCooldown = ReturnType<typeof createTestCooldown>;

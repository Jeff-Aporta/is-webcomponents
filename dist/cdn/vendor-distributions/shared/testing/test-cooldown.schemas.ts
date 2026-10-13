// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
/**
 * Contratos (tipos) del cooldown de tests (`test-cooldown.ts`). W54: los
 * tipos top-level viven en *.schemas.ts.
 *
 * Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/testing/test-cooldown.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./test-cooldown.ts`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
 */
import type { createTestCooldown } from "./test-cooldown.ts";
import { z } from "zod";

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

// ── Cooldown de LLAVES de los jueces (LLM y JEV): mismo sistema, misma convención -1 ──


/**
 * Cooldown de una llave: fecha ISO hasta la que no se usa (puesta sola al fallar por saldo, key o
 * cuota: +24 h), o `-1` (puesto A MANO cuando se resolvió: recarga de saldo o llave nueva) para que
 * el algoritmo la reintente ya. Ausente = disponible.
 */
export const ZCooldownLlave = z.union([z.string().datetime({ offset: true }), z.literal(-1)]);
export type TCooldownLlave = z.infer<typeof ZCooldownLlave>;

/** Una entrada del archivo de llaves (proveedor LLM o JEV): solo lo que el cooldown necesita. */
export const ZEntradaLlave = z.object({ nombre: z.string().min(1).optional(), model: z.string().optional(), cooldownHasta: ZCooldownLlave.optional() }).passthrough();
export type TEntradaLlave = z.infer<typeof ZEntradaLlave>;

/** Estado de una llave para el que la va a usar. */
export interface EstadoLlave {
  disponible: boolean;
  /** Motivo legible cuando no está disponible (hasta cuándo y cómo reactivarla). */
  motivo: string;
}

// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * llaves-cooldown.schemas.ts — contratos del archivo de llaves de los jueces (LLM y JEV) con su
 * cooldown. El archivo vive FUERA de los repos (p. ej. `C:/ContaPyme/Personal/stagehand-keys.json`).
 */
import { z } from 'zod';

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

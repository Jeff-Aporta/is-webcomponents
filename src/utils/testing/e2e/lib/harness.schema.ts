/**
 * harness.schema.ts — esquemas Zod para tipos locales del harness e2e.
 */

import { z } from "zod";

/** Opciones de tiempo de espera (ms, default = ENV.esperaMs). */
export const OpcionesEsperaSchema = z.object({
  ms: z.number().optional(),
});
export type OpcionesEspera = z.infer<typeof OpcionesEsperaSchema>;

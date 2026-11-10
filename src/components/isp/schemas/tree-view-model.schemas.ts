// @contexto INDICE.md · src/components/isp/README.md
/**
 * 02-model.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const ActionResultSchema = z.promise(z.unknown() /* TODO: ref T */);
export type ActionResult = z.infer<typeof ActionResultSchema>;

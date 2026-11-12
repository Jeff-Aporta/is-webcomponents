// @contexto INDICE.md · src/components/isp/README.md
/**
 * 02-model.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const ActionResultSchema = z.promise(z.unknown());
/**
 * Resultado de una acción CRUD: la promesa que resuelve el registro
 * afectado (`TRecord` en el modelo, `TNode` en el árbol).
 */
export type ActionResult<T = z.infer<typeof ActionResultSchema>> = Promise<T>;

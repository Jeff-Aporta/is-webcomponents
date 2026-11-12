// @contexto INDICE.md · src/components/isp/README.md
/**
 * tree-view.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { TNode, TreeCustoms } from './tree-view-types.schemas.js';

/**
 * Nodo del demo: es el nodo del árbol. La lista plana que entrega el
 * consumidor todavía no trae `flatPath` (lo calcula el layout), asi que el
 * dato se lee por el nombre de campo (`iplan`, `titulo`…).
 */
export type DemoNode = TNode;

const IswcTreeViewElSchema = z.object({
  customs: z.custom<TreeCustoms>().nullable().optional(),
  list: z.array(z.unknown()),
  addEventListener: z.function({ input: [z.string(), z.custom<EventListener>()], output: z.void() }),
});
export type IswcTreeViewEl = z.infer<typeof IswcTreeViewElSchema>;


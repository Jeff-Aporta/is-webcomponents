// @contexto INDICE.md · src/components/isp/README.md
/**
 * tree-data.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const _NodeAnySchema = z.intersection(z.record(z.string(), z.unknown()), z.object({
  flatPath: z.string(),
  childrens: z.array(_NodeAnySchema).optional(),
  topology: z.unknown().optional(),
  containment: z.unknown().optional(),
  mobility: z.unknown().optional(),
  pathInit: z.unknown().optional(),
  f: _NodeAnySchema.optional(),
}));
export type _NodeAny = z.infer<typeof _NodeAnySchema>;

const _TreeRootSchema = z.intersection(_NodeAnySchema, z.object({
  childrens: z.array(_NodeAnySchema),
  flatPath: z.string().optional(),
}));
export type _TreeRoot = z.infer<typeof _TreeRootSchema>;

const _TreeBaseCtorSchema = z.unknown() /* TODO: cannot convert */;
export type _TreeBaseCtor = z.infer<typeof _TreeBaseCtorSchema>;

const _GroupEntrySchema = z.object({
  separator: z.boolean().optional(),
  /* TODO: member [key: string]: unknown */
});
export type _GroupEntry = z.infer<typeof _GroupEntrySchema>;

const _DecoratedSelfSchema = z.object({
  topology: z.string().optional(),
  containment: z.string().optional(),
  mobility: z.string().optional(),
  childrens: z.array(z.unknown()).optional(),
});
export type _DecoratedSelf = z.infer<typeof _DecoratedSelfSchema>;

// ── tree-view-04-tree-flow.schemas ──
/**
 * 04-tree-flow.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const CursorHookSchema = z.function({ input: [], output: z.void() });
export type CursorHook = z.infer<typeof CursorHookSchema>;

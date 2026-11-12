// @contexto INDICE.md · src/components/isp/README.md
/**
 * tree-data.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

/** Nodo del arbol de datos (el "shape" crudo que decora `tree-data.ts`). */
export type _NodeAny = {
  flatPath?: string;
  childrens?: _NodeAny[];
  topology?: unknown;
  containment?: unknown;
  mobility?: unknown;
  pathInit?: string;
  f?: _NodeAny;
  [key: string]: unknown;
};

const _NodeAnySchema: z.ZodType<_NodeAny> = z.intersection(z.record(z.string(), z.unknown()), z.object({
  flatPath: z.string(),
  childrens: z.array(z.custom<_NodeAny>()).optional(),
  topology: z.string().optional(),
  containment: z.string().optional(),
  mobility: z.string().optional(),
  pathInit: z.string().optional(),
  f: z.custom<_NodeAny>().optional(),
}));

/** Raiz del arbol: la lista de nodos raiz. */
export type _TreeRoot = _NodeAny & { childrens: _NodeAny[] };

const _TreeRootSchema: z.ZodType<_TreeRoot> = z.intersection(_NodeAnySchema, z.object({
  childrens: z.array(z.custom<_NodeAny>()),
  flatPath: z.string().optional(),
}));

/**
 * Constructor generico que `TreeNode(Base)` acepta: la clase base solo
 * aporta el almacen; los accessors del "shape" los define la subclase.
 */
export type _TreeBaseCtor = new () => object;

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

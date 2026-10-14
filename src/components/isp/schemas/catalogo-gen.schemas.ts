/**
 * catalogo-gen.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ActionLabelSchema = z.union([z.literal('Crear'), z.literal('Modificar'), z.literal('Visualizar'), z.literal('Verificar'), z.literal('Duplicar'), z.literal('Recodificar'), z.literal('Eliminar'), z.literal('Consolidar')]);
export type ActionLabel = z.infer<typeof ActionLabelSchema>;


export const BAllowedSchema = z.object({
  Crear: z.boolean(),
  Modificar: z.boolean(),
  Visualizar: z.boolean(),
  Verificar: z.boolean(),
  Duplicar: z.boolean(),
  Recodificar: z.boolean(),
  Eliminar: z.boolean(),
  Consolidar: z.boolean(),
});
export type BAllowed = z.infer<typeof BAllowedSchema>;


export const IconKindSchema = z.union([z.literal('crear'), z.literal('modificar'), z.literal('visualizar'), z.literal('verificar'), z.literal('recodificar'), z.literal('duplicar'), z.literal('eliminar'), z.literal('consolidar'), z.literal('refrescar')]);
export type IconKind = z.infer<typeof IconKindSchema>;


export const FrmModeSchema = z.union([z.literal('create'), z.literal('edit'), z.literal('view')]);
export type FrmMode = z.infer<typeof FrmModeSchema>;


export const InputElementSchema = z.object({
  value: z.string(),
  label: z.string(),
  readonly: z.boolean(),
  required: z.boolean(),
  tabIndex: z.number(),
  maxlength: z.union([z.number(), z.null()]),
});
export type InputElement = z.infer<typeof InputElementSchema>;


export const ButtonElementSchema = z.object({
  disabled: z.boolean(),
  loading: z.boolean(),
});
export type ButtonElement = z.infer<typeof ButtonElementSchema>;


export const AgGridElementSchema = z.object({
  api: z.object({
  setRows: z.function({ input: [z.array(z.intersection(z.unknown() /* TODO: ref IspRecord */, z.object({
  id: z.string(),
  __record: z.unknown() /* TODO: ref IspRecord */.optional(),
})))], output: z.void() }),
  setColumns: z.function({ input: [z.array(z.object({
  field: z.string(),
  header: z.string().optional(),
}))], output: z.void() }),
  setQuickFilter: z.function({ input: [z.string()], output: z.void() }),
}),
});
export type AgGridElement = z.infer<typeof AgGridElementSchema>;


export const VerifyModalElementSchema = z.object({
  controller: z.union([z.unknown() /* TODO: ref IspController */, z.null()]),
  record: z.union([z.unknown() /* TODO: ref IspRecord */, z.null()]),
  entity: z.string(),
  onError: z.function({ input: [z.string()], output: z.void() }),
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
});
export type VerifyModalElement = z.infer<typeof VerifyModalElementSchema>;


export const ConfirmDeleteElementSchema = z.object({
  entity: z.string(),
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
});
export type ConfirmDeleteElement = z.infer<typeof ConfirmDeleteElementSchema>;


export const DialogElementSchema = z.object({
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
});
export type DialogElement = z.infer<typeof DialogElementSchema>;


export const DrawerElementSchema = z.object({
  label: z.string(),
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
});
export type DrawerElement = z.infer<typeof DrawerElementSchema>;


export const GridRowSelectDetailSchema = z.object({
  rows: z.array(z.object({
  id: z.union([z.string(), z.number()]).optional(),
  __record: z.unknown() /* TODO: ref IspRecord */.optional(),
})),
});
export type GridRowSelectDetail = z.infer<typeof GridRowSelectDetailSchema>;


export const GridCellClickDetailSchema = z.object({
  row: z.object({
  id: z.union([z.string(), z.number()]).optional(),
  __record: z.unknown() /* TODO: ref IspRecord */.optional(),
}),
});
export type GridCellClickDetail = z.infer<typeof GridCellClickDetailSchema>;


export const PkModalFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string().optional(),
  readonly: z.boolean().optional(),
  required: z.boolean().optional(),
  btnRef: z.boolean().optional(),
});
export type PkModalField = z.infer<typeof PkModalFieldSchema>;


export const PkModalCfgSchema = z.object({
  title: z.string(),
  fields: z.array(PkModalFieldSchema),
  okLabel: z.string(),
  hint: z.string().optional(),
});
export type PkModalCfg = z.infer<typeof PkModalCfgSchema>;


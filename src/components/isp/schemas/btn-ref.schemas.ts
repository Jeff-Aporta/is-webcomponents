// @contexto INDICE.md · src/components/isp/README.md
/**
 * btn-ref.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { IspRecord } from './isp-utils.schemas.js';

const _CatalogLikeSchema = z.object({
  primaryKeys: z.array(z.string()).optional(),
  ColumnsBtnRef: z.union([z.array(z.string()), z.function({ input: [], output: z.array(z.string()) })]).optional(),
  multiSelect: z.boolean().optional(),
  Lista: z.function({ input: [z.object({
  pagina: z.number().optional(),
  qregistros: z.number().optional(),
  filtro: z.object({
  sql: z.string().optional(),
}).optional(),
})], output: z.promise(z.union([z.object({
  datos: z.array(z.custom<IspRecord>()).optional(),
}), z.null(), z.undefined()])) }).optional(),
  refreshGrid: z.function({ input: [], output: z.union([z.promise(z.void()), z.void()]) }).optional(),
});
export type _CatalogLike = z.infer<typeof _CatalogLikeSchema>;

/** Registro que devuelve el catalogo: plano o con `getProp`/`setProp`. */
export const _RecordLikeSchema = z.custom<IspRecord>();
export type _RecordLike = IspRecord;

/** `<iswc-input>` del campo de referencia. */
const _FieldLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  value: z.string(),
  label: z.string(),
  name: z.string(),
  required: z.boolean(),
  readonly: z.boolean(),
}));
export type _FieldLike = z.infer<typeof _FieldLikeSchema>;

/** `<iswc-dialog>` del selector. */
const _DialogLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
}));
export type _DialogLike = z.infer<typeof _DialogLikeSchema>;

/** `<iswc-catalogo-gen>` embebido. */
const _CatalogElSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  controller: _CatalogLikeSchema.optional(),
  refreshGrid: z.function({ input: [], output: z.union([z.promise(z.void()), z.void()]) }).optional(),
  selectionData: z.array(_RecordLikeSchema).optional(),
}));
export type _CatalogEl = z.infer<typeof _CatalogElSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type BtnRefEventos = { 'iswc-selected-record': { record: unknown; records: unknown[]; value: string; label: string }; 'iswc-change': { value: string }; 'iswc-input': { value: string }; 'iswc-typing-end': { value: string } };

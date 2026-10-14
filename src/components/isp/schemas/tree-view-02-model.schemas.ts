/**
 * 02-model.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ActionResultSchema = z.promise(z.unknown() /* TODO: ref T */);
export type ActionResult = z.infer<typeof ActionResultSchema>;


export const AfterCatalogFnSchema = z.function({ input: [], output: z.promise(z.void()) });
export type AfterCatalogFn = z.infer<typeof AfterCatalogFnSchema>;


export const DeleteConfirmedFnSchema = z.function({ input: [], output: z.promise(z.void()) });
export type DeleteConfirmedFn = z.infer<typeof DeleteConfirmedFnSchema>;


export const HistoryPushFnSchema = z.function({ input: [], output: z.void() });
export type HistoryPushFn = z.infer<typeof HistoryPushFnSchema>;


export const CloseEditFormFnSchema = z.function({ input: [], output: z.void() });
export type CloseEditFormFn = z.infer<typeof CloseEditFormFnSchema>;


export const RebuildFlatTreeFnSchema = z.unknown() /* TODO: cannot convert */;
export type RebuildFlatTreeFn = z.infer<typeof RebuildFlatTreeFnSchema>;


// @contexto INDICE.md · src/components/forms/README.md
/**
 * date-field-element.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

const DateFieldKindSchema = z.union([z.literal('date'), z.literal('time'), z.literal('datetime')]);
export type DateFieldKind = z.infer<typeof DateFieldKindSchema>;

const DefineDateFieldOptsSchema = z.object({
  tag: z.string(),
  kind: DateFieldKindSchema,
  /** CSS del tag (`import css from 'iswc:css'` en el módulo que llama a la fábrica). */
  css: z.string(),
});
export type DefineDateFieldOpts = z.infer<typeof DefineDateFieldOptsSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DateFieldEventos = IswcFormControlEventos & { 'iswc-input': { value: string }; 'iswc-change': { value: string } };

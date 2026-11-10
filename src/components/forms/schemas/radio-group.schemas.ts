// @contexto INDICE.md · src/components/forms/README.md
/**
 * radio-group.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

const IswcRadioElementSchema = z.object({
  value: z.string(),
  checked: z.boolean(),
  disabled: z.boolean(),
  syncFromGroup: z.function({ input: [], output: z.void() }).optional(),
});
export type IswcRadioElement = z.infer<typeof IswcRadioElementSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type RadioGroupEventos = IswcFormControlEventos & { 'iswc-change': { value: string } };

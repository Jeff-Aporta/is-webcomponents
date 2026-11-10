// @contexto INDICE.md · src/components/layout/README.md
/**
 * modal-base.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ModalBaseCtorSchema = z.intersection(z.unknown() /* TODO: cannot convert */, z.object({
  template: z.unknown() /* TODO: ref HTMLTemplateElement */,
  observedAttributes: z.array(z.unknown() /* TODO: cannot convert */),
}));
export type ModalBaseCtor = z.infer<typeof ModalBaseCtorSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ModalBaseEventos = { 'iswc-show': Record<string, never>; 'iswc-after-show': Record<string, never>; 'iswc-hide': { source: Element | null }; 'iswc-after-hide': Record<string, never> };

// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * lightbox.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ViewTransformSchema = z.object({
  scale: z.number(),
  x: z.number(),
  y: z.number(),
});
export type ViewTransform = z.infer<typeof ViewTransformSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type LightboxEventos = { 'iswc-reposition': { x: number; y: number; width: number; height: number }; 'iswc-after-show': undefined; 'iswc-after-hide': undefined };

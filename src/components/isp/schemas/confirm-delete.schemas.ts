// @contexto INDICE.md · src/components/isp/README.md
/**
 * confirm-delete.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/** `<iswc-input>` del codigo de seguridad. */
const InputLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  label: z.string(),
  value: z.string(),
  maxlength: z.union([z.string(), z.null()]),
}));
export type InputLike = z.infer<typeof InputLikeSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ConfirmDeleteEventos = { 'iswc-confirm-delete': { value: string }; 'iswc-cancel-delete': Record<string, never> };

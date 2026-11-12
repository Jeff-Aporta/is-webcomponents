// @contexto INDICE.md · src/components/media/README.md
/**
 * video.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/** `<iswc-check-icon-button>` aporta estado y listeners DOM a `<iswc-video>`. */
const IswcCheckIconButtonSchema = z.intersection(z.custom<HTMLElement>(() => true), z.object({
  checked: z.boolean(),
  icon: z.string(),
}));
export type IswcCheckIconButton = z.infer<typeof IswcCheckIconButtonSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type VideoEventos = { 'iswc-play': undefined; 'iswc-pause': undefined; 'iswc-ended': undefined; 'iswc-error': { code: number; message: string } };

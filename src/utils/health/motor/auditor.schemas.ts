/**
 * auditor.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EstadoMotorSchema = z.object({
  raiz: z.string(),
  opciones: z.unknown() /* TODO: ref OpcionesRunner */,
  entradas: z.array(z.unknown() /* TODO: ref EntradaCatalogo */),
  componentes: z.array(z.unknown() /* TODO: ref ReporteComponente */),
  inicio: z.number(),
  erroresMotor: z.array(z.unknown() /* TODO: ref Hallazgo */),
  sesion: z.union([z.unknown() /* TODO: ref SesionStagehand */, z.null()]).optional(),
});
export type EstadoMotor = z.infer<typeof EstadoMotorSchema>;


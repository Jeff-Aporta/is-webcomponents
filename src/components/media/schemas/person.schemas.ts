/**
 * person.schemas.ts — props de `<iswc-person>`.
 */
import { z } from "zod";

export const PersonPropsSchema = z.object({
  /** Identificador visible cuando no hay `nombre` (usuario, correo…). */
  usuario: z.string(),
  nombre: z.string().nullable(),
  /** Segunda línea: rol, cargo, hora. */
  detalle: z.string(),
  /** Solo el avatar; el nombre pasa al `title`. */
  compacto: z.boolean(),
});
export type PersonProps = z.infer<typeof PersonPropsSchema>;

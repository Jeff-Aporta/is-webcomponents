/**
 * status-pill.schemas.ts — props de `<iswc-status-pill>`.
 */
import { z } from "zod";

const StatusPillStatusSchema = z.enum(["pending", "done", "error"]);
export type StatusPillStatus = z.infer<typeof StatusPillStatusSchema>;

export const StatusPillPropsSchema = z.object({
  /** Frase del paso. Sin ella, la pastilla muestra solo el rótulo del estado. */
  text: z.string(),
  status: StatusPillStatusSchema,
  /** Marca de tiempo; entra en el `title` junto con la frase y el estado. */
  ts: z.string(),
  /** Ícono de los estados `done` y `error` (por defecto, uno por estado). */
  icon: z.string(),
  pendingLabel: z.string(),
  doneLabel: z.string(),
  errorLabel: z.string(),
});
export type StatusPillProps = z.infer<typeof StatusPillPropsSchema>;

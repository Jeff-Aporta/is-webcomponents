/**
 * stream-bubble.schemas.ts — props de `<iswc-stream-bubble>`.
 */
import { z } from "zod";

const StreamBubbleStateSchema = z.enum(["idle", "streaming", "end", "error"]);

/** Un paso previo a la respuesta (tool, búsqueda…): `icono` es texto corto, por ejemplo un emoji. */
const StreamBubblePasoSchema = z.object({ icono: z.string().default(""), texto: z.string() });
export type StreamBubblePaso = z.infer<typeof StreamBubblePasoSchema>;

/** Textos visibles; cada clave reemplaza la de por defecto. */
const StreamBubbleTextosSchema = z.object({
  idle: z.string(),
  streaming: z.string(),
  end: z.string(),
  error: z.string(),
  esperando: z.string(),
  pensando: z.string(),
  sinDetalle: z.string(),
});
export type StreamBubbleTextos = z.infer<typeof StreamBubbleTextosSchema>;

export const StreamBubblePropsSchema = z.object({
  /** Texto en markdown ligero, acumulado hasta el momento. */
  text: z.string(),
  state: StreamBubbleStateSchema,
  /** Escribe el texto nuevo letra a letra mientras `state` es `streaming`. */
  animated: z.boolean(),
  progress: z.array(StreamBubblePasoSchema),
  /** Quien responde. */
  name: z.string(),
  /** Inicial del avatar. Vacío lo oculta. */
  avatar: z.string(),
  textos: StreamBubbleTextosSchema.partial(),
});
export type StreamBubbleProps = z.infer<typeof StreamBubblePropsSchema>;

/**
 * ai-tool.schemas.ts — props de `<iswc-ai-tool>`.
 */
import { z } from 'zod';
import type { Entrada, Salida } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

export const AiToolVarianteSchema = z.enum(['plain', 'card']);
export const AiToolPropsSchema = z.object({
  /** Herramienta del catálogo (`ocr`, `translate`…). Una desconocida cae en la primera. */
  herramienta: z.string(),
  /** Texto inicial; sin él se muestra el ejemplo de la herramienta. */
  texto: z.string(),
  /** `plain` queda dentro de lo que ya la enmarca; `card` trae su propio papel. */
  variant: AiToolVarianteSchema,
});
export type AiToolProps = z.infer<typeof AiToolPropsSchema>;

/** Campos del kit que la herramienta lee. */
export type AiCampo = HTMLElement & { value: string };
export type AiZona = HTMLElement & { files: { file: File }[] };

export type AiToolResultadoDetalle = { herramienta: string; salida: Salida; entrada: Entrada };
export type AiToolErrorDetalle = { herramienta: string; mensaje: string };

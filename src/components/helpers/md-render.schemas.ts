/**
 * md-render.schemas.ts — tipos de `<iswc-md-render>`.
 *
 * Los contratos de los renderers por elemento (`renderers`) viven en `md-lite.schemas.ts` y se
 * re-exportan desde aquí: el consumidor importa un solo módulo de tipos para el componente.
 */
import { z } from 'zod';

export type * from './md-lite.schemas.js';

/** Detalle de `iswc-input`, `iswc-change` e `iswc-persist`: el markdown actual de la hoja. */
export const MdRenderValueDetailSchema = z.object({ value: z.string() });
export type MdRenderValueDetail = z.infer<typeof MdRenderValueDetailSchema>;

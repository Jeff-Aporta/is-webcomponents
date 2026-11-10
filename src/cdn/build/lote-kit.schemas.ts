// @contexto INDICE.md · src/cdn/build/README.md
/**
 * lote-kit.ts — contratos del lote ESM del armazón armado desde el pin publicado (F10).
 */
import { z } from "zod";

export const LoteKitOptsSchema = z.object({
  /** `dist/cdn/` del kit al pin, con barra final. */
  cdn: z.string(),
  /** Grafo del kit unido (`tags` y `core`, como `unirDeps`). */
  deps: z.object({ tags: z.record(z.string(), z.array(z.string())), core: z.record(z.string(), z.array(z.string())) }),
  tags: z.array(z.string()),
  /** Archivo absoluto de salida. */
  salida: z.string(),
  /** Carpeta absoluta de caché de lo bajado (el pin es inmutable). */
  cache: z.string(),
});
export type LoteKitOpts = z.infer<typeof LoteKitOptsSchema>;

export const LoteKitResultSchema = z.object({ bytes: z.number(), modulos: z.number(), tags: z.array(z.string()) });
export type LoteKitResult = z.infer<typeof LoteKitResultSchema>;

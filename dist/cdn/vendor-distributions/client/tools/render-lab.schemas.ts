// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
/**
 * render-lab.schemas.ts — tipos de los labs de render (ver render-lab.ts).
 *
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/tools/render-lab.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./render-diagram.schemas.js`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */
import { z } from 'zod';
import type { RenderDiagramOptions, SyntheticDiagramJob } from './render-diagram.schemas.js';

/** Un job de render con su id (el nombre del SVG de salida). */
export type LabJob = { id: string; job: SyntheticDiagramJob };

/** Editable de un lab (el mismo formato que `docs-experimental/diagramas` de los consumidores). */
export const EditableSchema = z.object({
  slug: z.string().optional(),
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
  payload: z.unknown(),
});
export type Editable = z.infer<typeof EditableSchema>;

/** Opciones de `jobsDeEditables`. */
export const OpcionesEditablesSchema = z.object({
  /** Slugs a renderizar (vacío = todos). */
  only: z.array(z.string()).optional(),
  /** Archivos de solo soporte (incrustados por otros): no se dibujan. */
  soporte: z.array(z.string()).optional(),
  /** Defaults si el editable no los trae. */
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
});
export type OpcionesEditables = z.infer<typeof OpcionesEditablesSchema>;

/** Opciones de `renderLab`: las de `renderDiagramBatch` menos el chromium y la raíz, que el lab resuelve solo. */
export type OpcionesLab = Partial<Omit<RenderDiagramOptions, 'chromium' | 'serveRoot'>> & {
  /** Carpeta de salida (por defecto `<lab>/out`). */
  outDir?: string;
  /** Raíz servida (por defecto la del kit: dos niveles arriba del lab). */
  serveRoot?: string;
  chromium?: RenderDiagramOptions['chromium'];
};

// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
/**
 * render-lote.schemas.ts — contratos de `render-lote.ts`: opciones del lote, editable, caché por hash
 * (`diagramas-iswc.cache.json`), plan y resultado.
 *
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/tools/render-lote.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./render-diagram.schemas.js`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */
import { z } from 'zod';
import type { RenderDiagramOptions, SyntheticDiagramJob } from './render-diagram.schemas.js';

/** Editable `<slug>.json` de la carpeta de diagramas (el mismo formato en ISS, ISW y los labs). */
export const EditableLoteSchema = z.object({
  /** Nombre de salida; por defecto el del archivo sin `.json`. */
  slug: z.string().optional(),
  /** Módulo de docs al que pertenece (entra en la huella). */
  module: z.string().optional(),
  /** Custom element del kit (`iswc-flowchart`, `iswc-er-diagram`…). */
  tag: z.string(),
  /** Módulo relativo a `<kit>/dist/cdn/` (`diagrams/flowchart.min.js`). */
  script: z.string(),
  attrs: z.record(z.string(), z.string()).optional(),
  /** Payload declarativo; puede llevar referencias `{ path, query, actions }` relativas al editable. */
  payload: z.unknown(),
  oficial: z.boolean().optional(),
});
export type EditableLote = z.infer<typeof EditableLoteSchema>;

/** Opciones serializables del lote (las que viajan al proceso hijo). */
export const OpcionesLoteDatosSchema = z.object({
  /** Carpeta de editables `<slug>.json`. */
  carpeta: z.string().min(1),
  /** Carpeta de salida de los SVG. */
  salidaSvg: z.string().min(1),
  /** Carpeta de salida de los PNG (si `png`). */
  salidaPng: z.string().min(1),
  /** Archivo de caché; por defecto `<carpeta>/diagramas-iswc.cache.json`. */
  cache: z.string().optional(),
  /** Raíz del checkout del kit (= `serveRoot`; de ahí salen `dist/cdn/…` y Playwright). */
  kit: z.string().min(1),
  /** Sello del kit que entra en la huella; por defecto `<kit>/PIN` o `dist/cdn/build-stamp.json`. */
  pinKit: z.string().optional(),
  /** Slugs a procesar (vacío = todos). */
  solo: z.array(z.string()).optional(),
  /** Ignora el caché: renderiza todo. */
  forzar: z.boolean().optional(),
  /** Intentos por diagrama (Chromium a veces no arranca). Default 5. */
  intentos: z.number().int().positive().optional(),
  /** Timeout del render de cada diagrama (ms). Default 300_000. */
  timeoutMs: z.number().int().positive().optional(),
  /** Espera tras ready antes de extraer (ms). Default 500. */
  settleMs: z.number().int().nonnegative().optional(),
  /** También PNG. Default true. */
  png: z.boolean().optional(),
});
export type OpcionesLoteDatos = z.infer<typeof OpcionesLoteDatosSchema>;

/** Opciones de `planificarLote` / `renderizarLote` (las serializables más las del proceso). */
export type OpcionesLote = OpcionesLoteDatos & {
  /** Salida de líneas (`OK …`, `SKIP …`, resumen). Default `console.log`. */
  log?: (linea: string) => void;
  /** Chromium ya cargado (solo en el hijo / caja negra); si falta, `createRequire(<kit>)('playwright')`. */
  chromium?: RenderDiagramOptions['chromium'];
};

/** Entrada del caché por diagrama. Rutas de svg/png relativas al archivo de caché (posix). */
export const EntradaCacheSchema = z.object({
  huella: z.string().length(64),
  svg: z.string(),
  png: z.string().nullable(),
  fecha: z.string(),
  ancho: z.number().nullable(),
  alto: z.number().nullable(),
});
export type EntradaCache = z.infer<typeof EntradaCacheSchema>;

/** Archivo `diagramas-iswc.cache.json`. */
export const CacheLoteSchema = z.object({
  version: z.number().int(),
  diagramas: z.record(z.string(), EntradaCacheSchema),
});
export type CacheLote = z.infer<typeof CacheLoteSchema>;

/** Decisión por diagrama del plan. */
export type DiagramaPlan = {
  slug: string;
  /** Editable de origen (absoluto). */
  archivo: string;
  accion: 'render' | 'skip' | 'error';
  /** Por qué se renderiza / se salta / falló (referencia sin resolver, editable inválido…). */
  motivo: string;
  /** sha256 del spec resuelto + pinKit + versión (vacía si `error`). */
  huella: string;
  /** Salidas absolutas. */
  svg: string;
  png: string | null;
  /** Job listo para `renderDiagramBatch` (payload ya resuelto; sin `payloadBase`). */
  job?: SyntheticDiagramJob;
};

export type PlanLote = {
  carpeta: string;
  cache: string;
  pinKit: string;
  diagramas: DiagramaPlan[];
};

export type ResultadoLote = {
  renderizados: string[];
  sinCambios: string[];
  fallidos: { slug: string; motivo: string }[];
  cache: string;
};

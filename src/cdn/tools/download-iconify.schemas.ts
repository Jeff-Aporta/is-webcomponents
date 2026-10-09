/**
 * download-iconify — contratos (Zod) del mapa de iconos de una app y de la herramienta que lo genera.
 *
 * `assets/iconify.json` es el CONTRATO entre la herramienta (que lo escribe al descargar) y
 * `<iswc-icon>` (que lo lee al registrarlo): qué íconos tiene la app en local
 * (`assets/iconify/<set>/<n>.svg`; lo que no esté se pide a la API) y dónde está publicada
 * (`host`, copiado de `deno.json` → `iswc.host`). Otras apps lo leen al construir para bajarse
 * esos mismos íconos (registro de consumos).
 */
import { z } from 'zod';

/** Id Iconify `set:nombre` (minúsculas, dígitos y guiones; `_` solo en el nombre). */
export const IconIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
export type IconId = z.infer<typeof IconIdSchema>;

export const IconifyMapSchema = z.object({
  /** Versión del formato. */
  v: z.literal(1),
  /** Nombre de la app que publica el mapa. */
  app: z.string().min(1),
  /** Sitio publicado de la app (`deno.json` → `iswc.host`); `null` si no está declarado. */
  host: z.string().url().nullable(),
  /** Ruta del propio `iconify.json` desde la raíz publicada (`host`): `assets/iconify.json`. */
  ruta: z.string().min(1),
  /** Carpeta de los SVG, relativa al propio `iconify.json`. */
  base: z.string().min(1),
  /** set → nombres descargados (ordenados). */
  icons: z.record(z.string(), z.array(z.string())),
});
export type IconifyMap = z.infer<typeof IconifyMapSchema>;

/** Opciones de `descargarIconos`. Los valores por defecto viven en `DEFAULTS` de la herramienta (corre sin dependencias). */
export const OpcionesDescargaSchema = z.object({
  /** Raíz de la app (carpeta o URL `file:`). */
  raiz: z.union([z.string(), z.instanceof(URL)]),
  /** Archivos o carpetas a barrer, relativos a la raíz. */
  roots: z.array(z.string()).min(1),
  /** Carpeta de salida, relativa a la raíz: ahí van `iconify.json` e `iconify/`. */
  salida: z.string().optional(),
  /** Ids que el barrido no puede ver (armados en tiempo de ejecución). */
  extra: z.array(IconIdSchema).optional(),
  /** Nombres de carpeta que no se barren. */
  ignorar: z.array(z.string()).optional(),
  /** Extensiones barridas. */
  extensiones: z.array(z.string()).optional(),
  /** Registro de consumos: `iconify.json` del kit y de las apps que consume; TODOS sus íconos se descargan en esta app. Por defecto el del kit al SHA de la herramienta. */
  mapas: z.array(z.string()).optional(),
  /** Sitio publicado; por defecto `deno.json` → `iswc.host`. */
  host: z.string().url().optional(),
  /** Borrar SVG de `iconify/` que ya nadie usa. */
  podar: z.boolean().optional(),
  /** Sin red: solo reescribe el mapa con lo que ya está en disco. */
  offline: z.boolean().optional(),
  /** API de Iconify. */
  api: z.string().url().optional(),
  /** Descargas en paralelo. */
  concurrencia: z.number().int().positive().optional(),
  /** Silencio en consola. */
  silencioso: z.boolean().optional(),
});
export type OpcionesDescarga = z.infer<typeof OpcionesDescargaSchema> & { fetch?: typeof fetch };

export const ResumenDescargaSchema = z.object({
  archivos: z.number(),
  encontrados: z.number(),
  descargados: z.array(IconIdSchema),
  existentes: z.number(),
  inexistentes: z.array(IconIdSchema),
  podados: z.array(IconIdSchema),
  avisos: z.array(z.string()),
  mapa: IconifyMapSchema,
});
export type ResumenDescarga = z.infer<typeof ResumenDescargaSchema>;

const CajaSchema = { width: z.number().optional(), height: z.number().optional(), left: z.number().optional(), top: z.number().optional() };
/** Respuesta de la API de Iconify en lote (`<set>.json?icons=a,b`): lo que la herramienta usa. */
export const IconifyJsonSchema = z.object({
  ...CajaSchema,
  icons: z.record(z.string(), z.object({ body: z.string(), ...CajaSchema })).optional(),
  aliases: z.record(z.string(), z.unknown()).optional(),
});
export type IconifyJson = z.infer<typeof IconifyJsonSchema>;

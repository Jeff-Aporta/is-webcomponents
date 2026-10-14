/**
 * loader.schemas.ts — esquemas Zod para los tipos del loader CDN.
 *
 * Convenciones del repo (§9.4 audit):
 *   - naming `XSchema` + `type X = z.infer<typeof XSchema>`
 *   - zod v4.4.3 (ver `deno.json` imports)
 *
 * Este módulo es **design**: el schema está definido, los tipos se infieren
 * con `z.infer<typeof X>` y `loader.ts` los consume. Las validaciones runtime
 * concretas (`safeParse` / `parse`) se cablean sólo donde tiene sentido
 * (p. ej. validar entradas externas); en mapas internos construidos por el
 * propio loader, basta con el tipo inferido.
 */
import { z } from "zod";

/* --------------------------------------------------------------------------
 * Mirror — entrada del catálogo de espejos CDN.
 *
 * `base` es una función `(ref?) => string`. En zod v4, eso se modela con
 * `z.function({ input, output })`. La inferencia produce exactamente la
 * firma `(arg?: string) => string` que usa `loader.ts` (parámetro opcional,
 * retorno string).
 * ------------------------------------------------------------------------*/

/** Función `(ref?: string) => string` que devuelve la URL base del espejo. */
const MirrorBaseFnSchema = z.function({
  input: [z.string().optional()],
  output: z.string(),
});
/** Tipo exacto de la firma (sin la envoltura ZodFunction). */
export type MirrorBaseFn = z.infer<typeof MirrorBaseFnSchema>;

export const MirrorSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  hint: z.string().optional(),
  pin: z.boolean().optional(),
  base: MirrorBaseFnSchema,
});
export type Mirror = z.infer<typeof MirrorSchema>;

/* --------------------------------------------------------------------------
 * AppComponentEntry — registro de tags de la app consumidora.
 * ------------------------------------------------------------------------*/

export const AppComponentEntrySchema = z.object({
  href: z.string().min(1),
  css: z.union([z.string(), z.array(z.string())]).optional(),
});
export type AppComponentEntry = z.infer<typeof AppComponentEntrySchema>;

/* --------------------------------------------------------------------------
 * PageModuleSpec — spec de un page module (alias table / registerPageModule).
 * ------------------------------------------------------------------------*/

/** Tipo de carga: ESM `import()` o classic `<script>` (IIFE). */
export const PageModuleKindSchema = z.enum(["module", "classic"]);
export type PageModuleKind = z.infer<typeof PageModuleKindSchema>;

export const PageModuleSpecSchema = z.object({
  href: z.string().min(1),
  type: PageModuleKindSchema,
});
export type PageModuleSpec = z.infer<typeof PageModuleSpecSchema>;

/* --------------------------------------------------------------------------
 * LoaderState — estado interno mutable del loader.
 *
 * El estado tiene Maps para `pageModules` y `pageStyles`. En zod, modelamos
 * los Maps con `z.map(...)` para preservar la forma exacta del tipo
 * original; las pruebas de runtime no necesitan `.parse` aquí.
 * ------------------------------------------------------------------------*/

export const LoaderStateSchema = z.object({
  ref: z.string().nullable(),
  mirrors: z.array(MirrorSchema),
  /** true si el consumidor pasó `mirrors` (incluso `[]` = sin fallback CDN). */
  mirrorsExplicit: z.boolean(),
  preferSelf: z.boolean(),
  /** Raíz `dist/cdn/` forzada por el consumidor (githack, local, SHA…). */
  host: z.string().nullable(),
  /** SHA que entra en {{sha}}. null = shaDefault del build. */
  sha: z.string().nullable(),
  /** Origen que entra en {{cdnUrl}}. null = cdnUrlDefault. */
  cdnUrl: z.string().nullable(),
  /** Query de cache-bust en cada asset (`?v=2`). */
  query: z.record(z.string(), z.string()),
  pageModules: z.map(z.string(), PageModuleSpecSchema),
  pageStyles: z.map(z.string(), z.string()),
});
export type LoaderState = z.infer<typeof LoaderStateSchema>;

/* --------------------------------------------------------------------------
 * ConfigureOpts — opciones de `L.configure(opts)`.
 *
 * Discriminated union por `local: true` (modo galería) vs opciones generales.
 * En la práctica, `configure()` ramifica por `opts.local === true` y trata
 * el resto como opcional-independiente. Para preservar la forma del tipo
 * original (todos los campos opcionales, sin discriminator), lo modelamos
 * como objeto plano: `local` + el resto opcional.
 * ------------------------------------------------------------------------*/

export const ConfigureOptsSchema = z.object({
  ref: z.string().nullable().optional(),
  mirrors: z
    .union([
      z.string(),
      MirrorSchema,
      z.array(z.union([z.string(), MirrorSchema])),
    ])
    .optional(),
  preferSelf: z.boolean().optional(),
  /**
   * Raíz de assets del kit. `null`/`""` significa arranque (CDN pin o self).
   * `'self' | './' | '.'` → relativo al loader. URL absoluta → tal cual.
   */
  host: z.string().nullable().optional(),
  /** Sustituye {{sha}} de hostDefault. Vacío usa shaDefault. */
  sha: z.string().nullable().optional(),
  /** Sustituye {{cdnUrl}} de hostDefault. Vacío usa cdnUrlDefault. */
  cdnUrl: z.string().nullable().optional(),
  query: z
    .union([z.string(), z.record(z.string(), z.string())])
    .nullable()
    .optional(),
  v: z.union([z.string(), z.number()]).nullable().optional(),
  /** Modo galería local (sin mirrors CDN, host=self). */
  local: z.boolean().optional(),
});
export type ConfigureOpts = z.infer<typeof ConfigureOptsSchema>;

/* --------------------------------------------------------------------------
 * LoadResult — resultado de `L.load(...)`.
 * ------------------------------------------------------------------------*/

export const LoadResultSchema = z.object({
  loaded: z.array(z.string()),
  skipped: z.array(z.string()),
});
export type LoadResult = z.infer<typeof LoadResultSchema>;

/* --------------------------------------------------------------------------
 * LoadedSnapshot — `L.getLoaded()`.
 * ------------------------------------------------------------------------*/

export const LoadedSnapshotSchema = z.object({
  all: z.boolean(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  app: z.array(z.string()),
});
export type LoadedSnapshot = z.infer<typeof LoadedSnapshotSchema>;

/* --------------------------------------------------------------------------
 * LoaderSheets — sub-API `L.sheets.*`.
 *
 * Las funciones usan `z.function({ input, output })` con outputs tipados a
 * `SheetCacheApi | null` / `Promise<unknown>` para preservar los retornos
 * exactos de `loader.ts` (no validamos el cuerpo de las funciones en runtime;
 * basta con la firma tipada).
 * ------------------------------------------------------------------------*/

const SheetInstallOptsSchema = z
  .object({ cacheName: z.string().optional() })
  .optional();

const WarmFromManifestOptsSchema = z
  .object({
    base: z.string().optional(),
    key: z.string().optional(),
  })
  .optional();

const SheetApiNullSchema = z.custom<unknown>((v) => v === null || typeof v === "object");

export const LoaderSheetsSchema = z.object({
  install: z
    .function({
      input: [SheetInstallOptsSchema],
      output: z.union([SheetApiNullSchema, z.any()]),
    })
    .optional(),
  get: z.function({
    input: [],
    output: z.union([SheetApiNullSchema, z.any()]),
  }),
  warm: z.function({
    input: [z.array(z.string())],
    output: z.promise(z.unknown()),
  }),
  warmFromCache: z.function({
    input: [],
    output: z.promise(z.unknown()),
  }),
  warmFromManifest: z.function({
    input: [z.string(), WarmFromManifestOptsSchema],
    output: z.promise(z.unknown()),
  }),
});
export type LoaderSheets = z.infer<typeof LoaderSheetsSchema>;

/* --------------------------------------------------------------------------
 * ISWebComponentsLoader — superficie pública del loader.
 *
 * Modelamos sólo la forma tipada (lo que `L.*` expone). Las funciones de
 * carga usan `z.function({ input, output })` para preservar firmas.
 * ------------------------------------------------------------------------*/

const LoadArgSchema = z.union([z.string(), z.record(z.string(), z.unknown())]);
const LoadArgsSchema = z.array(LoadArgSchema);

const EnsureOptsSchema = z.object({ href: z.string().optional() }).optional();

const RegisterAppMapSchema = z.record(
  z.string(),
  z.union([z.string(), AppComponentEntrySchema]),
);

const RegisterAppOptsSchema = z
  .object({
    cacheName: z.string().optional(),
    installSheets: z.boolean().optional(),
  })
  .optional();

const RegisterPageModuleOptsSchema = z
  .object({ type: PageModuleKindSchema.optional() })
  .optional();

export const ISWebComponentsLoaderSchema = z.object({
  catalog: z.any(),
  hashes: z.record(z.string(), z.string()),
  assetUrl: z.function({ input: [z.string()], output: z.string() }),
  repo: z.string(),
  mirrors: z.array(MirrorSchema),
  selfBase: z.string(),
  host: z.string().nullable(),
  hostDefault: z.string(),
  shaDefault: z.string(),
  /** SHA leído de la URL del loader (`@abc…`), si venía pinneada. */
  shaFromUrl: z.string().nullable(),
  cdnUrlDefault: z.string(),
  query: z.record(z.string(), z.string()),
  sheets: LoaderSheetsSchema,
  baseUrl: z.function({ input: [], output: z.promise(z.string()) }),
  configure: z.function({
    input: [ConfigureOptsSchema.optional()],
    output: z.any(),
  }),
  pin: z.function({ input: [z.string()], output: z.any() }),
  unpin: z.function({ input: [], output: z.any() }),
  resolvePin: z.function({ input: [], output: z.promise(z.string()) }),
  listBases: z.function({ input: [], output: z.promise(z.array(z.string())) }),
  fallbackBases: z.function({
    input: [],
    output: z.promise(z.array(z.string())),
  }),
  registerApp: z.function({
    input: [RegisterAppMapSchema, RegisterAppOptsSchema],
    output: z.any(),
  }),
  getAppComponents: z.function({
    input: [],
    output: z.record(z.string(), AppComponentEntrySchema),
  }),
  has: z.function({ input: [z.string()], output: z.boolean() }),
  getLoaded: z.function({ input: [], output: LoadedSnapshotSchema }),
  resetLoaded: z.function({ input: [], output: z.any() }),
  loadPageStyles: z.function({
    input: [z.array(z.string())],
    output: z.promise(z.void()),
  }),
  loadPageModules: z.function({
    input: [z.array(z.string())],
    output: z.promise(z.void()),
  }),
  registerPageModule: z.function({
    input: [z.string(), z.string(), RegisterPageModuleOptsSchema],
    output: z.any(),
  }),
  registerPageStyle: z.function({
    input: [z.string(), z.string()],
    output: z.any(),
  }),
  getPageModules: z.function({
    input: [],
    output: z.record(z.string(), PageModuleSpecSchema),
  }),
  getPageStyles: z.function({
    input: [],
    output: z.record(z.string(), z.string()),
  }),
  load: z.function({
    input: LoadArgsSchema,
    output: z.promise(LoadResultSchema),
  }),
  ensure: z.function({
    input: [z.string(), EnsureOptsSchema],
    output: z.promise(z.boolean()),
  }),
  isReady: z.function({ input: [z.string()], output: z.boolean() }),
});
/**
 * Forma inferida del loader. Se importa como `ISWebComponentsLoaderShape`
 * para evitar conflicto con el `const ISWebComponentsLoader` exportado por
 * `loader.ts` (TypeScript no permite que un type y un value con el mismo
 * nombre se declaren en un mismo archivo sin una declaración merge explícita).
 */
export type ISWebComponentsLoaderShape = z.infer<typeof ISWebComponentsLoaderSchema>;
/** Alias público: `ISWebComponentsLoader` (para consumidores externos). */
export type ISWebComponentsLoader = ISWebComponentsLoaderShape;

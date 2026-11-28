// @contexto INDICE.md · src/cdn/loader.md
/**
 * plugin-externo.schemas.ts — contratos de `iswcLoader.cargarPlugin` (capa 2 `loader-plugin-externo`): cargar de una app
 * EXTERNA (no incluida en el kit) sus componentes, paletas y herramientas por `usuario` + `repo` + `sha`.
 *
 * Todas las apps siguen la misma estructura (foundation), así que las rutas son FIJAS:
 *
 *   https://cdn.jsdelivr.net/gh/<usuario>/<repo>@<sha40>/dist/cdn/plugin.json        (manifiesto `iswc-plugin/v1`)
 *   <raíz>/<prefijo>Loader.min.mjs                                                   (componentes)
 *   <raíz>/palettes/<nombre>.json                                                    (una paleta por archivo)
 *   <raíz>/<ruta de cada herramienta>                                                (módulos ESM)
 *
 * El consumidor solo cambia el SHA para mover el pin. Se valida todo con Zod: un manifiesto que no cumple falla con la
 * lista de campos que sobran o faltan.
 */
import { z } from "zod";
import { PluginManifestSchema } from "./plugin.schemas.js";
import type { PluginInfo, PluginOpts } from "./plugin.schemas.js";

/** Lo que se puede pedir de un plugin externo. */
const TipoPluginSchema = z.enum(["componentes", "paletas", "herramientas", "todo"]);
export type TipoPlugin = z.infer<typeof TipoPluginSchema>;

/** Petición de `cargarPlugin`. */
export const PeticionExternaSchema = z.object({
  /** Usuario u organización de GitHub (`Jeff-Aporta`). */
  usuario: z.string().regex(/^[\w.-]+$/, "usuario de GitHub (sin barras)"),
  /** Nombre del repo (`crm`), sin el usuario. */
  repo: z.string().regex(/^[\w.-]+$/, "nombre del repo (sin barras ni usuario)"),
  /** Commit de 40 hex: nunca rama, `main` ni SHA corto. */
  sha: z.string().regex(/^[0-9a-f]{40}$/i, "SHA de 40 hex (nunca main, rama ni SHA corto)"),
  /** Qué cargar; por defecto todo lo que el manifiesto declare. */
  tipo: TipoPluginSchema.default("todo"),
  /** Tags del plugin a cargar de inmediato (solo con componentes). */
  tags: z.array(z.string()).optional(),
  /** Paleta por defecto del plugin: se fija con `fijarPaletaDefecto` tras registrar (solo si el usuario no eligió otra). */
  paletaDefecto: z.string().optional(),
  /** Raíz absoluta alterna de `dist/cdn/` (desarrollo y pruebas: `localhost`, Pages). Sustituye a jsDelivr y githack. */
  host: z.string().regex(/^https?:\/\//i, "host debe ser una URL http(s)").optional(),
});
export type PeticionExterna = z.infer<typeof PeticionExternaSchema>;

const PREFIJO = /^[a-z][a-z0-9]*-$/;
/** Ruta relativa y segura: sin `..`, sin esquema, sin barra inicial. */
const RUTA_RELATIVA = /^(?!\/)(?!.*\.\.)(?![a-z][a-z0-9+.-]*:)[\w./-]+$/i;

/** Entrada de `paletas` del manifiesto: la ruta es fija, `palettes/<nombre>.json`. */
const PaletaDeclaradaSchema = z.object({
  nombre: z.string().regex(/^[a-z][a-z0-9-]*$/, "nombre en minúsculas, dígitos y guiones"),
  ruta: z.string().regex(/^palettes\/[\w.-]+\.json$/, "ruta fija palettes/<nombre>.json"),
});

/** Entrada de `herramientas` del manifiesto. */
const HerramientaDeclaradaSchema = z.object({
  nombre: z.string().regex(/^[a-z][\w-]*$/i),
  ruta: z.string().regex(RUTA_RELATIVA, "ruta relativa al manifiesto, sin ..").regex(/\.m?js$/, "módulo .mjs/.js"),
});

/** Manifiesto homogéneo de una app externa (`dist/cdn/plugin.json`). */
export const ManifiestoExternoSchema = PluginManifestSchema.extend({
  prefijo: z.string().regex(PREFIJO, "prefijo con guion final (crm-)"),
  paletas: z.array(PaletaDeclaradaSchema).optional(),
  herramientas: z.array(HerramientaDeclaradaSchema).optional(),
}).superRefine((m, ctx) => {
  if (m.prefijo === "iswc-") ctx.addIssue({ code: "custom", path: ["prefijo"], message: "iswc- es del kit" });
  const esperado = `${m.prefijo.slice(0, -1)}Loader.min.mjs`;
  if (m.loader !== undefined && m.loader !== esperado) ctx.addIssue({ code: "custom", path: ["loader"], message: `debe ser ${esperado}` });
  for (const t of Object.keys(m.tags)) if (!t.startsWith(m.prefijo)) ctx.addIssue({ code: "custom", path: ["tags", t], message: `el tag debe empezar por ${m.prefijo}` });
});
export type ManifiestoExterno = z.infer<typeof ManifiestoExternoSchema>;

const Hsl = (campo: string) => z.string().regex(/^\d+(\.\d+)?%$/, `${campo}: porcentaje (56%)`);

/** Una paleta publicada por una app: las semillas del kit (`palettes.json`) más datos del selector. */
export const PaletaPluginSchema = z.object({
  value: z.string().regex(/^[a-z][a-z0-9-]*$/, "value en minúsculas, dígitos y guiones").optional(),
  label: z.string().min(1).max(60).optional(),
  /** Grupo del selector; por defecto el título de la app. */
  family: z.string().max(40).optional(),
  origin: z.string().max(80).optional(),
  mood: z.string().max(160).optional(),
  h: z.number().min(0).max(360),
  s: Hsl("s"),
  b: Hsl("b"),
  contrastH: z.number().min(0).max(360).optional(),
  contrastS: Hsl("contrastS").optional(),
  contrastL: Hsl("contrastL").optional(),
  /** 0 = superficies en gris neutro; 1 = tintadas. */
  tint: z.number().min(0).max(1).optional(),
  fontTint: z.number().min(0).max(1).optional(),
});
export type PaletaPlugin = z.infer<typeof PaletaPluginSchema>;

/** Resultado de `cargarPlugin`. */
export type PluginExternoInfo = {
  usuario: string;
  repo: string;
  sha: string;
  /** `app` del manifiesto (el nombre estable). */
  nombre: string;
  version: string | null;
  prefijo: string;
  /** Raíz publicada de `dist/cdn/` (con barra final). */
  raiz: string;
  /** Lo que ya está cargado de este plugin en la página. */
  cargado: { componentes: boolean; paletas: boolean; herramientas: boolean };
  /** Tags registrados (componentes). */
  tags: string[];
  /** Valores de las paletas registradas en el selector. */
  paletas: string[];
  /** Módulos de herramientas cargados, por nombre. */
  herramientas: Record<string, unknown>;
  manifiesto: ManifiestoExterno;
};

/**
 * Una entrada declarativa leída del HTML: la petición (`{ usuario, repo, sha, … }`) o el error de lectura.
 * Vive en el esquema porque `src/**` no admite `type` top-level fuera de los `*.schemas.ts` (W54).
 */
export type EntradaDeclarativa = { entrada: unknown; error?: Error };

/**
 * Una entrada de la caché por SHA: el manifiesto y, si se pidieron, los componentes, las paletas y las herramientas.
 * Vive en el esquema por la misma razón que `EntradaDeclarativa` (W54).
 */
export type EntradaCache = {
  raiz: Promise<{ manifiesto: ManifiestoExterno; raiz: string }>;
  componentes?: Promise<PluginInfo | null>;
  paletas?: Promise<string[]>;
  herramientas?: Promise<Record<string, unknown>>;
};

/** Resultado de la forma declarativa: lo que se cargó y lo que falló. */
export type DeclarativosResultado = {
  /** Plugins cargados (uno por entrada válida). */
  cargados: PluginExternoInfo[];
  /** Entradas que fallaron: una app rota no tumba la página (queda el aviso, sigue el resto). */
  errores: { entrada: unknown; error: Error }[];
};

/** Dependencias de la capa (se inyectan en las pruebas). */
export type PluginExternoDeps = {
  /** `iswcLoader.loadPlugin` (capa `plugin`): importa el loader de componentes. */
  loadPlugin(opts: PluginOpts): Promise<PluginInfo>;
  routeHref(href: string): string;
  fetchJson?(url: string): Promise<unknown>;
  importar?(url: string): Promise<unknown>;
};

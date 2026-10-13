// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
/**
 * vendor.schemas.ts — contrato de `vendor.ts` (descarga de archivos del kit por vendor strategy).
 *
 * El consumidor (ISS, ISW…) describe en un JSON qué archivos del kit trae y dónde los deposita;
 * `vendor.ts` lo lee y actualiza cada archivo por PIN DE FECHA ISO: gana la fuente más reciente
 * (checkout local del kit o su HEAD remoto) y solo se escribe si es más nueva que la copia actual.
 *
 * Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/tools/vendor.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Sin imports relativos.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
 */
import { z } from "zod";

/**
 * Perfiles de `vendor-distributions/`: `shared` (sin navegador, sirve a todos), `server` (solo
 * proyectos server) y `client` (navegador, Playwright/Stagehand, render visual, íconos de UI).
 */
export const PERFILES = ["shared", "server", "client"] as const;
export type TPerfil = (typeof PERFILES)[number];

/** Perfil que declara un consumidor: baja `shared` + el suyo, nunca el del otro. */
export const ZPerfilVendor = z.enum(["server", "client"]);
export type TPerfilVendor = z.infer<typeof ZPerfilVendor>;

/** Un archivo del kit que el consumidor trae. */
export const ZArchivoVendor = z.object({
  /** Ruta en el repo del kit (p. ej. `dist/cdn/vendor-distributions/shared/lib/obj.ts`). */
  desde: z.string().min(1),
  /** Ruta en el consumidor, relativa a `raiz` (p. ej. `src/sources/000 Base/ISU/obj.ts`). */
  hacia: z.string().min(1),
  /** Documentación del archivo en el repo del kit (va como comentario `@doc` en la cabecera). */
  doc: z.string().min(1).optional(),
});
export type TArchivoVendor = z.infer<typeof ZArchivoVendor>;

/** El JSON que recibe `vendor.ts`. Claves extra se ignoran. */
export const ZConfigVendor = z.object({
  /** `dueño/repo` del kit en GitHub. */
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  /** Rama que se sigue. */
  rama: z.string().min(1).default("main"),
  /** Checkout local del kit (opcional): compite por fecha con el remoto; si no existe, se omite. */
  local: z.string().optional(),
  /**
   * Perfil del consumidor (`server` o `client`): solo se bajan `vendor-distributions/shared/` y
   * `vendor-distributions/<perfil>/`; con `server`, además, ningún archivo puede traer dependencias de
   * navegador. Sin perfil se baja todo (modo anterior) con aviso.
   */
  perfil: ZPerfilVendor.optional(),
  /** Raíz del consumidor (base de `hacia`). Por defecto, el directorio desde el que se corre. */
  raiz: z.string().optional(),
  archivos: z.array(ZArchivoVendor).min(1),
});
export type TConfigVendor = z.infer<typeof ZConfigVendor>;

/** Resultado por archivo. */
export interface TResultadoVendor {
  desde: string;
  hacia: string;
  /** `actualizado` (se escribió), `al-dia` (la copia ya era la más reciente) o `error`. */
  estado: "actualizado" | "al-dia" | "error";
  /** Fuente ganadora y su fecha. */
  fuente?: "local" | "remoto";
  fecha?: string;
  sha?: string | null;
  /** Fecha de la copia que ya había. */
  previa?: string | null;
  error?: string;
  /** Imports relativos del archivo que no existen en el consumidor (no se vendorizaron). */
  faltan?: string[];
  /** El perfil del consumidor no admite el archivo (otro perfil, ruta sin perfil o dependencia de navegador en server): no se bajó. */
  bloqueado?: string;
}

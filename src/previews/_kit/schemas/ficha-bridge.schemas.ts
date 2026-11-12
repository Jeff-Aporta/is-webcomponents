// @contexto INDICE.md · src/previews/README.md
/**
 * ficha-bridge.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Los schemas exponen el contrato real del JSON de ficha. Los campos que
 * conservan texto multilínea usan el TextLike ya existente en el repo.
 */
import { z } from "zod";
import type { FichaSchema, SECTION_IDS } from "@jeff-aporta/iswc-base/utils/section-schema.ts";
import { TextLikeSchema } from "./component.schemas.ts";
import type {
  PreviewCodeEjemploCell,
  PreviewDefinition,
  PreviewSection,
} from "./preview.schemas.ts";

export const FichaPlaygroundSchema = z.object({
  html: z.string(),
  title: z.string().optional(),
  lede: z.string().optional(),
});
export type FichaPlayground = z.infer<typeof FichaPlaygroundSchema>;

/** Sección legacy de ficha: bloque de contenido o tabla. */
export const FichaSectionSchema = z.object({
  content: TextLikeSchema.optional(),
  table: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();
export type FichaSection = z.infer<typeof FichaSectionSchema>;

export const FichaSubObjectSchema = z.object({
  sections: z.record(z.string(), FichaSectionSchema).optional(),
  exclude: z.array(z.string()).optional(),
  playground: FichaPlaygroundSchema.optional(),
});
export type FichaSubObject = z.infer<typeof FichaSubObjectSchema>;

/**
 * JSON que puede entrar al bridge: preview canónico o ficha legacy.
 * Las secciones de preview y las de ficha son shapes distintos, por eso
 * viven en una unión explícita y no en unknown.
 */
export const FichaLikeDefinitionSchema = z.object({
  $schema: z.string().optional(),
  tag: z.string(),
  category: z.string().optional(),
  title: z.string().optional(),
  titleHtml: z.boolean().optional(),
  styles: TextLikeSchema.optional(),
  storageKey: z.string().optional(),
  mainClass: z.string().optional(),
  wrapperClass: z.string().optional(),
  prelude: TextLikeSchema.optional(),
  sections: z.union([
    z.array(z.custom<PreviewSection>()),
    z.record(z.string(), FichaSectionSchema),
  ]).optional(),
  exclude: z.array(z.string()).optional(),
  playground: FichaPlaygroundSchema.optional(),
  ficha: FichaSubObjectSchema.optional(),
  hasBehavior: z.boolean().optional(),
  withoutToc: z.boolean().optional(),
  description: z.string().optional(),
  anatomy: z.object({ scss: z.string().optional() }).optional(),
  examples: z.array(z.unknown()).optional(),
  loads: z.array(z.string()).optional(),
});
export type FichaLikeDefinition = z.infer<typeof FichaLikeDefinitionSchema>;

/** Ficha ya validada por el schema Zod compartido. */
export type Ficha = z.infer<typeof FichaSchema>;

/** IDs de sección derivados de la constante canónica del runtime. */
export type SectionId = (typeof SECTION_IDS)[number];

/**
 * La forma canónica ya está modelada como interfaces TypeScript en
 * preview.schemas.ts. z.custom conserva el objeto plano (y el orden de
 * sus claves) en el passthrough legacy, sin reconstruirlo ni perder campos.
 */
export const PreviewDefinitionSchema = z.custom<PreviewDefinition>();
export type PreviewDefinitionFromSchema = z.infer<typeof PreviewDefinitionSchema>;

/** Celda code-ejemplo del shape ya usado por PreviewTableCell. */
export const PreviewCodeEjemploCellSchema = z.custom<PreviewCodeEjemploCell>(
  (value) => typeof value === "object"
    && value !== null
    && Reflect.get(value, "kind") === "code-ejemplo",
);

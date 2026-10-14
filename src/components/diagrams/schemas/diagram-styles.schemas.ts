/**
 * diagram-styles.ts — Zod schemas del registro de estilos de diagrama.
 */
import { z } from "zod";
import type { ErThemeJson } from "./theme.schemas.js";

/** Tipo de diagrama al que aplica un tema dentro de un estilo. */
export const DiagramStyleKindSchema = z.union([z.literal('er'), z.literal('component'), z.literal('class'), z.literal('sequence'), z.literal('flowchart')]);
export type DiagramStyleKind = z.infer<typeof DiagramStyleKindSchema>;

/**
 * Registro de estilos: nombre del estilo → archivos JSON de tema que lo
 * componen (uno por tipo de diagrama). Las rutas relativas se resuelven
 * contra el módulo que registra; las absolutas se usan tal cual.
 */
export const DiagramStyleRegistrySchema = z.record(z.string(), z.array(z.string()).min(1));
export type DiagramStyleRegistry = z.infer<typeof DiagramStyleRegistrySchema>;

/**
 * Almacén compartido en `globalThis`: cada diagrama es un bundle aparte y
 * trae su copia de este módulo; el registro y la caché de cargas tienen que
 * ser uno solo para todos.
 */
export const DiagramStyleStoreSchema = z.object({
  archivos: z.custom<Map<string, string[]>>((v) => v instanceof Map),
  cargas: z.custom<Map<string, Promise<void>>>((v) => v instanceof Map),
  temas: z.custom<Map<string, Map<DiagramStyleKind, ErThemeJson>>>((v) => v instanceof Map),
});
export type DiagramStyleStore = z.infer<typeof DiagramStyleStoreSchema>;

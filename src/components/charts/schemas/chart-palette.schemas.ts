/**
 * chart-palette.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/** Nombre de una de las paletas del kit (src/styles/palettes.json). */
const PaletteKeySchema = z.string();
export type PaletteKey = z.infer<typeof PaletteKeySchema>;

const PaletteModeSchema = z.union([z.literal('dark'), z.literal('light')]);
export type PaletteMode = z.infer<typeof PaletteModeSchema>;

const StatusSchema = z.union([z.literal('success'), z.literal('warning'), z.literal('danger')]);
export type Status = z.infer<typeof StatusSchema>;


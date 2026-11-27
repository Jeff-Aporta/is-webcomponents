// @contexto INDICE.md · src/styles/README.md
/**
 * palette-registry.schemas.ts — Zod schemas del registro de paletas de plugins (`palette-registry.ts`).
 */
import { z } from "zod";

/** Paleta de un plugin, ya normalizada (semillas del kit + datos del selector). */
const PaletaExternaSchema = z.object({
  value: z.string(),
  label: z.string(),
  family: z.string(),
  origin: z.string(),
  mood: z.string(),
  h: z.number(),
  s: z.string(),
  b: z.string(),
  contrastH: z.number().optional(),
  contrastS: z.string().optional(),
  contrastL: z.string().optional(),
  tint: z.number().optional(),
  fontTint: z.number().optional(),
  /** Dueño (`usuario/repo`); lo pone el registro. */
  origenPlugin: z.string().optional(),
});
export type PaletaExterna = z.infer<typeof PaletaExternaSchema>;

/** Estado compartido en `globalThis` (selector y loader son bundles distintos). */
export type EstadoPaletas = {
  paletas: Map<string, PaletaExterna>;
  defecto: string;
  style: HTMLStyleElement | null;
  oyentes: Set<(values: string[]) => void>;
};

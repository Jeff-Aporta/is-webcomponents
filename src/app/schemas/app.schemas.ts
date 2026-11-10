// @contexto INDICE.md · src/app/README.md
/**
 * app.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const GalleryStateSchema = z.object({
  theme: z.string().optional(),
  palette: z.string().optional(),
  component: z.string().optional(),
  embed: z.boolean().optional(),
  panelsCompact: z.boolean().optional(),
  /* TODO: parse fail [key: string]: unknown */
});
export type GalleryState = z.infer<typeof GalleryStateSchema>;

const ThemeNameSchema = z.union([z.literal('light'), z.literal('dark')]);
export type ThemeName = z.infer<typeof ThemeNameSchema>;

const PaletteNameSchema = z.enum(['delfin', 'cardenal', 'iguana', 'rubi', 'esmeralda', 'zafiro', 'citrino', 'orquidea', 'turquesa', 'marte', 'granate', 'neptuno', 'peridoto', 'jade', 'aguamarina', 'amatista', 'menta', 'luna', 'jupiter', 'flamenco', 'lapislazuli', 'cobre', 'tanzanita', 'olivino', 'ambar']);
export type PaletteName = z.infer<typeof PaletteNameSchema>;

const CategoryMetaSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type CategoryMeta = z.infer<typeof CategoryMetaSchema>;

const CatalogItemSchema = z.object({
  tag: z.string(),
  title: z.string(),
  page: z.string().optional(),
  category: z.string().optional(),
  origin: z.string().optional(),
});
export type CatalogItem = z.infer<typeof CatalogItemSchema>;

const ThemeToggleElementSchema = z.object({
  dark: z.boolean(),
});
export type ThemeToggleElement = z.infer<typeof ThemeToggleElementSchema>;

const PaletteSelectorElementSchema = z.object({
  close: z.function({ input: [], output: z.void() }),
  value: z.string(),
});
export type PaletteSelectorElement = z.infer<typeof PaletteSelectorElementSchema>;

const PreviewLikeSchema = z.object({
  /* TODO: parse fail readonly definition: Record<string, unknown> */
  mount: z.function({ input: [z.record(z.string(), z.unknown())], output: z.union([z.void(), z.promise(z.void())]) }),
  unmount: z.function({ input: [z.record(z.string(), z.unknown())], output: z.void() }).optional(),
});
export type PreviewLike = z.infer<typeof PreviewLikeSchema>;

const PreviewHostElementSchema = z.object({
  preview: z.union([PreviewLikeSchema, z.null()]).optional(),
});
export type PreviewHostElement = z.infer<typeof PreviewHostElementSchema>;

const SplitPanelElementSchema = z.object({
  positionInPixels: z.number(),
});
export type SplitPanelElement = z.infer<typeof SplitPanelElementSchema>;

const FrameElementSchema = z.unknown() /* TODO: ref HTMLIFrameElement */;
export type FrameElement = z.infer<typeof FrameElementSchema>;

const DrawerElementSchema = z.object({
  show: z.function({ input: [], output: z.union([z.void(), z.promise(z.void())]) }),
  hide: z.function({ input: [], output: z.union([z.void(), z.promise(z.void())]) }),
});
export type DrawerElement = z.infer<typeof DrawerElementSchema>;

const LoaderLikeSchema = z.object({
  catalog: z.object({
  tags: z.record(z.string(), z.unknown()).optional(),
  categories: z.record(z.string(), z.unknown()).optional(),
  aliases: z.record(z.string(), z.string()).optional(),
}).optional(),
  load: z.function({ input: [z.unknown()], output: z.promise(z.unknown()) }),
});
export type LoaderLike = z.infer<typeof LoaderLikeSchema>;


/**
 * app.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const GalleryStateSchema = z.object({
  theme: z.string().optional(),
  palette: z.string().optional(),
  component: z.string().optional(),
  embed: z.boolean().optional(),
  panelsCompact: z.boolean().optional(),
  /* TODO: parse fail [key: string]: unknown */
});
export type GalleryState = z.infer<typeof GalleryStateSchema>;


export const ThemeNameSchema = z.union([z.literal('light'), z.literal('dark')]);
export type ThemeName = z.infer<typeof ThemeNameSchema>;


export const PaletteNameSchema = z.union([z.literal('contapyme'), z.literal('insoft'), z.literal('agrowin')]);
export type PaletteName = z.infer<typeof PaletteNameSchema>;


export const CategoryMetaSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type CategoryMeta = z.infer<typeof CategoryMetaSchema>;


export const CatalogItemSchema = z.object({
  tag: z.string(),
  title: z.string(),
  page: z.string().optional(),
  category: z.string().optional(),
  origin: z.string().optional(),
});
export type CatalogItem = z.infer<typeof CatalogItemSchema>;


export const ThemeToggleElementSchema = z.object({
  dark: z.boolean(),
});
export type ThemeToggleElement = z.infer<typeof ThemeToggleElementSchema>;


export const PaletteSelectorElementSchema = z.object({
  close: z.function({ input: [], output: z.void() }),
  value: z.string(),
});
export type PaletteSelectorElement = z.infer<typeof PaletteSelectorElementSchema>;


export const PreviewLikeSchema = z.object({
  /* TODO: parse fail readonly definition: Record<string, unknown> */
  mount: z.function({ input: [z.record(z.string(), z.unknown())], output: z.union([z.void(), z.promise(z.void())]) }),
  unmount: z.function({ input: [z.record(z.string(), z.unknown())], output: z.void() }).optional(),
});
export type PreviewLike = z.infer<typeof PreviewLikeSchema>;


export const PreviewHostElementSchema = z.object({
  preview: z.union([PreviewLikeSchema, z.null()]).optional(),
});
export type PreviewHostElement = z.infer<typeof PreviewHostElementSchema>;


export const SplitPanelElementSchema = z.object({
  positionInPixels: z.number(),
});
export type SplitPanelElement = z.infer<typeof SplitPanelElementSchema>;


export const FrameElementSchema = z.unknown() /* TODO: ref HTMLIFrameElement */;
export type FrameElement = z.infer<typeof FrameElementSchema>;


export const DrawerElementSchema = z.object({
  show: z.function({ input: [], output: z.union([z.void(), z.promise(z.void())]) }),
  hide: z.function({ input: [], output: z.union([z.void(), z.promise(z.void())]) }),
});
export type DrawerElement = z.infer<typeof DrawerElementSchema>;


export const LoaderLikeSchema = z.object({
  catalog: z.object({
  tags: z.record(z.string(), z.unknown()).optional(),
  categories: z.record(z.string(), z.unknown()).optional(),
  aliases: z.record(z.string(), z.string()).optional(),
}).optional(),
  load: z.function({ input: [z.unknown()], output: z.promise(z.unknown()) }),
});
export type LoaderLike = z.infer<typeof LoaderLikeSchema>;


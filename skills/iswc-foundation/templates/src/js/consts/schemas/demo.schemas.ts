/**
 * demo.schemas.ts — playground `iswc-preview/v1` de cada componente (`<tag>.json`) y el índice de la
 * galería (`view/demo/manifest.json`). La forma canónica completa vive en el kit
 * (`@iswc/component-schemas`, pineado en deno.json; los guardianes validan contra ella); aquí va lo
 * que la galería usa en runtime, con `.passthrough()` para no romper campos extra.
 */
import { z } from '../../base/zod.js';

/** `attr:x` escribe el atributo · `prop:x` la propiedad JS · `props:x` mezcla `{ x }` en `.props`. */
export const ControlDemoSchema = z.object({
  control: z.enum(['select', 'text', 'boolean', 'number']),
  prop: z.string().regex(/^(?:(?:attr|prop|props):)?[\w-]+$/),
  label: z.string(),
  default: z.unknown().optional(),
  options: z.array(z.unknown()).optional(),
}).passthrough();
export type ControlDemo = z.infer<typeof ControlDemoSchema>;

export const BloqueDemoSchema = z.object({
  kind: z.enum(['demo', 'html', 'callout', 'code', 'table', 'lede']).optional(),
  html: z.union([z.string(), z.array(z.string())]).optional(),
  target: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  controls: z.array(ControlDemoSchema).optional(),
}).passthrough();
export type BloqueDemo = z.infer<typeof BloqueDemoSchema>;

export const DefinicionDemoSchema = z.object({
  $schema: z.literal('iswc-preview/v1'),
  tag: z.string().regex(/^[a-z][a-z0-9]*-[a-z0-9-]+$/),
  category: z.string(),
  navTitle: z.string(),
  title: z.string(),
  storageKey: z.string(),
  sections: z.array(z.object({ id: z.string(), title: z.string().optional(), blocks: z.array(BloqueDemoSchema) }).passthrough()).min(1),
}).passthrough();
export type DefinicionDemo = z.infer<typeof DefinicionDemoSchema>;

export const ManifestDemoSchema = z.array(z.object({ tag: z.string(), file: z.string().endsWith('.json') }));
export type ManifestDemo = z.infer<typeof ManifestDemoSchema>;

/** Lo que la galería usa del loader del kit. */
export type LoaderGaleria = { load: (...t: string[]) => Promise<unknown>; selfBase: string };
export type ConProps = HTMLElement & { props?: Record<string, unknown> };

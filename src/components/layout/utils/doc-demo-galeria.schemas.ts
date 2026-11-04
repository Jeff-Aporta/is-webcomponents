// doc-demo-galeria.schemas.ts: contratos de tipos de doc-demo-galeria.ts.
import type { Anatomia } from '@jeff-aporta/iswc-base/previews/_kit/schemas/anatomia.schemas.js';

export type Bloque = { kind?: string; target?: string; props?: Record<string, unknown>; controls?: unknown[] };

export type Definicion = { tag: string; navTitle?: string; title?: string; category?: string; anatomy?: Anatomia | undefined; sections: Array<{ id?: string; blocks?: Bloque[] }> };

export type Montaje = { main?: ParentNode };

export type Previsualizable = { definition: Definicion; mount(ctx: Montaje): void; unmount(): void };

export type HostPreview = HTMLElement & { preview: Previsualizable | null };

export type Loader = { load(...tags: string[]): Promise<unknown>; catalog?: { tags?: Record<string, unknown>; categories?: Record<string, unknown>; aliases?: Record<string, string> } };

export type Cajon = HTMLElement & { show?(): void; hide?(): void };

export type EstadoGaleria = { component?: string; panelsCompact?: boolean };

export type OpcionesGaleria = {
  /** URL de `[{ tag, file }]`. */
  manifest: string | URL;
  /** id de categoría → rótulo; el orden de las claves es el del nav. Las demás van después, por orden alfabético. */
  categorias?: Record<string, string>;
};

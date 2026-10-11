import { z } from 'zod';

/**
 * Frontmatter de una hoja del vault (norma `documentacion-modular`): claves sueltas (`Titulo`,
 * `Estado`, `Autor`…) y listas (`tags`, `aliases`). Lo que no se reconoce se muestra en «Otros datos».
 */
export const DocsVaultMetaSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
export type DocsVaultMeta = z.infer<typeof DocsVaultMetaSchema>;

/** Detalle del evento `iswc-docs-vault-page`: la hoja que se acaba de abrir. */
export const DocsVaultPageDetailSchema = z.object({
  ruta: z.string(),
  titulo: z.string(),
  meta: DocsVaultMetaSchema,
});
export type DocsVaultPageDetail = z.infer<typeof DocsVaultPageDetailSchema>;

/** Lista de hojas del libro (`<script type="application/json">` hijo): rutas `.md` en orden de lectura. */
export const DocsVaultListaSchema = z.array(z.string().regex(/\.md$/i, 'cada hoja es un .md'));

/** Datos que `iswc-md-render` entrega a cada renderer del vault. */
export type DocsVaultRenderers = Partial<{
  image: (d: { src: string; alt: string; title?: string }, porDefecto?: unknown) => string | undefined;
  link: (d: { href: string; html: string; title?: string }, porDefecto?: unknown) => string | undefined;
  code: (d: { code: string }, porDefecto?: unknown) => string | undefined;
}> & Record<string, unknown>;

/** Una hoja del libro ya leída: ubicación (módulo/sección/archivo), frontmatter y texto plano para buscar. */
export type DocsVaultHoja = {
  ruta: string;
  modulo: string;
  seccion: string;
  nombre: string;
  meta: DocsVaultMeta;
  plano: string;
  /** La hoja no se pudo leer (404 o sin servidor): figura en el índice con su nombre humano. */
  falta?: boolean;
};

/** Superficie del `<iswc-doc-layout>` que usa el lector (paneles, scroll y TOC). */
export type DocsVaultLayout = HTMLElement & {
  panels: { start: boolean };
  toggleStart(): void;
  scrollContentTo(y: number): void;
  refreshToc(): void;
  scrollToHeading(id: string): void;
};

/** Superficie del `<iswc-doc-index>` que usa el lector (ítems, activo y foco en la búsqueda). */
export type DocsVaultIndice = HTMLElement & { items: unknown[]; current: string; focusSearch(): void };

/** Superficie del `<iswc-md-render>` que usa el lector (renderers y markdown). */
export type DocsVaultRender = HTMLElement & { renderers: unknown; value: string };

/** Superficie del `<iswc-meta-list>` del modal de información (grupos clave → valor). */
export type DocsVaultListaMeta = HTMLElement & { groups: unknown[] };

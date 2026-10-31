/**
 * props-element.schemas.ts — tipos de `core/props-element.ts`.
 */

/** Lo único que la base necesita del esquema Zod del componente. */
export type EsquemaProps = { safeParse(valor: unknown): { success: true; data: unknown } | { success: false; error: unknown } };

// numfmt.schemas.ts: contratos de tipos de numfmt.ts.
/** Sección de un formato. */
export interface Section { raw: string; body: string; color?: string; cond?: { op: string; v: number }; kind: 'general' | 'number' | 'date' | 'text' }

/** Formato compilado. */
export interface Compiled { sections: Section[] }

/** Resultado de formatear. */
export interface Formatted { text: string; color?: string }

/** Parte de una plantilla numérica. */
export type Part = { k: 'lit'; v: string } | { k: 'ph'; v: string } | { k: 'dot' } | { k: 'exp'; v: string } | { k: 'slash' };

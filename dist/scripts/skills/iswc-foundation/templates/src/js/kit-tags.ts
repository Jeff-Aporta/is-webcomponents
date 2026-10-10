/**
 * kit-tags.ts — REGISTRO ÚNICO de tags de la app (estándar iswc-foundation).
 *
 * Todo lo demás se deriva de aquí: el registrador (`__PREFIJO__Loader.min.js`, vía `registerApp`),
 * el bundle de compatibilidad, la galería de demos y los guardianes. Un componente nuevo se declara
 * UNA vez, en la lista que le toca:
 *
 *   KIT_TAGS   → tags `iswc-*` del kit que la app pide al loader (solo padres registrables).
 *   APP_TAGS   → componentes transversales → `dist/cdn/js/components/__PREFIJO__/<tag>.js`.
 *   VIEW_TAGS  → componentes de cada vista → `dist/cdn/view/<vista>/components/<tag>.js`.
 *
 * APP_TAGS y la unión de VIEW_TAGS son disjuntos: una vista no importa componentes de otra; lo
 * compartido sube a APP_TAGS. Se publica en `dist/cdn/js/kit-tags.js` para los hosts.
 */
export const KIT_TAGS = [
  'iswc-button',
  'iswc-callout',
  'iswc-card',
  'iswc-code',
  'iswc-dialog',
  'iswc-icon',
  'iswc-tag',
  'iswc-theme-toggle',
  'iswc-toast',
] as const;

export const PREFIJO = '__PREFIJO__';

export const APP_TAGS = ['__PREFIJO__-app'] as const;

export const VIEW_TAGS = {
  hola: ['__PREFIJO__-hola-mundo', '__PREFIJO__-hola'],
} as const satisfies Record<string, readonly `__PREFIJO__-${string}`[]>;

export type AppTag = (typeof APP_TAGS)[number] | (typeof VIEW_TAGS)[keyof typeof VIEW_TAGS][number];
export type Vista = keyof typeof VIEW_TAGS;

/** Carpeta publicada (relativa a `dist/cdn/`) de un componente propio; `null` si no es de la app. */
export function rutaComponente(tag: string): string | null {
  if ((APP_TAGS as readonly string[]).includes(tag)) return `js/components/${PREFIJO}/`;
  for (const [vista, tags] of Object.entries(VIEW_TAGS)) {
    if ((tags as readonly string[]).includes(tag)) return `view/${vista}/components/`;
  }
  return null;
}

/** tag → ruta del módulo relativa a `dist/cdn/` (exige el prefijo de la app). */
export function mapaRutas(): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const tag of [...APP_TAGS, ...Object.values(VIEW_TAGS).flat()]) {
    if (!tag.startsWith(`${PREFIJO}-`)) throw new Error(`kit-tags: ${tag} no lleva el prefijo ${PREFIJO}-`);
    mapa[tag] = `${rutaComponente(tag)}${tag}.js`;
  }
  return mapa;
}

/** Tags que el shell pide al arrancar (transversales + todas las vistas). */
export const tagsArranque = (): string[] => [...APP_TAGS, ...Object.values(VIEW_TAGS).flat()];

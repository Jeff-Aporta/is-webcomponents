/** Contratos de `app-cfg.ts` (W54: los tipos viven en *.schemas.ts). */

export type TemaApp = 'light' | 'dark';
export type PaletaApp = 'insoft' | 'contapyme' | 'agrowin';

/** Valor simple de configuración (lo que cabe en el JSON de la llave). */
export type ValorCfgApp = string | number | boolean;

/**
 * Configuración persistente de la app, en UNA sola llave de `localStorage`.
 * `theme` y `palette` solo los escriben `<iswc-theme-toggle>` y `<iswc-palette-selector>`;
 * una app puede guardar más valores propios con `guardarAppCfg({ clave: valor })`.
 */
export interface AppCfg {
  theme?: TemaApp;
  /** Nombre de la paleta (las del kit o las de un catálogo propio del selector). */
  palette?: string;
  [clave: string]: ValorCfgApp | undefined;
}

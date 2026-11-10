// @contexto INDICE.md · src/core/README.md
/** Contratos de `app-init.ts` (W54: los tipos viven en *.schemas.ts). */


// ── app-cfg.schemas ──
/** Contratos de `app-cfg.ts` (W54: los tipos viven en *.schemas.ts). */

export type TemaApp = 'light' | 'dark';
export type PaletaApp = 'delfin' | 'cardenal' | 'iguana' | 'rubi' | 'esmeralda' | 'zafiro' | 'citrino' | 'orquidea' | 'turquesa' | 'marte' | 'granate' | 'neptuno' | 'peridoto' | 'jade' | 'aguamarina' | 'amatista' | 'menta' | 'luna' | 'jupiter' | 'flamenco' | 'lapislazuli' | 'cobre' | 'tanzanita' | 'olivino' | 'ambar';

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
  /** Modificador Panda (fondo de página invertido): lo escribe el interruptor del selector. */
  panda?: boolean;
  [clave: string]: ValorCfgApp | undefined;
}

// ── app-init.schemas ──
export interface OpcionesInitApp {
  /** Tema inicial: aplica solo mientras el usuario no haya elegido. Default `light`. */
  theme?: TemaApp;
  /** Paleta inicial: aplica solo mientras el usuario no haya elegido. Default `delfin`. */
  palette?: PaletaApp;
  /** Modificador Panda inicial (`data-panda`): aplica solo mientras el usuario no haya elegido. Default `false`. */
  panda?: boolean;
  /**
   * Íconos locales: la web PUBLICADA de la app (su propio CDN). `<iswc-icon>` busca
   * `<host><folder><set>/<nombre>.svg` antes de ir a la API de Iconify. Se escribe en
   * `<html data-icons="<url absoluta>">`. Sin esto, `<iswc-icon>` va de localStorage a la API.
   */
  icons?: IconosApp;
  /** Elemento raíz donde se aplica. Default `document.documentElement`. */
  root?: Pick<HTMLElement, 'dataset'>;
}

/** Dónde publica la app sus íconos (`deno task icons` los baja a `<folder>` del repo). */
export interface IconosApp {
  /** Sitio publicado de la app, URL absoluta http(s): `deno.json` → `iswc.host` (p. ej. `https://mi-app.azurestaticapps.net/`). */
  host: string;
  /** Carpeta de los SVG relativa a `host`. Default `assets/iconify/`. */
  folder?: string;
}

export interface EstadoInitApp {
  theme: TemaApp;
  palette: PaletaApp;
  panda: boolean;
  /** Base absoluta de los íconos locales (`data-icons`), o `null` si la app no la declaró. */
  icons: string | null;
  /** De dónde salió cada valor: la config guardada del usuario o la inicial de la app. */
  origen: { theme: 'usuario' | 'default'; palette: 'usuario' | 'default'; panda: 'usuario' | 'default' };
}

/** Contratos de `app-init.ts` (W54: los tipos viven en *.schemas.ts). */
import type { PaletaApp, TemaApp } from './app-cfg.schemas.js';

export interface OpcionesInitApp {
  /** Tema inicial: aplica solo mientras el usuario no haya elegido. Default `light`. */
  theme?: TemaApp;
  /** Paleta inicial: aplica solo mientras el usuario no haya elegido. Default `contapyme`. */
  palette?: PaletaApp;
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
  /** Base absoluta de los íconos locales (`data-icons`), o `null` si la app no la declaró. */
  icons: string | null;
  /** De dónde salió cada valor: la config guardada del usuario o la inicial de la app. */
  origen: { theme: 'usuario' | 'default'; palette: 'usuario' | 'default' };
}

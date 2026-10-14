/// <reference lib="dom" />
/**
 * Configuración inicial de una app iswc: tema y paleta POR DEFECTO, y dónde están sus íconos.
 *
 *   import { initApp } from '.../core/app-init.js';
 *   initApp({ theme: 'light', palette: 'contapyme', icons: { host: 'https://mi-app.azurestaticapps.net/' } });
 *
 * `icons` se declara UNA vez: host publicado (`deno.json` → `iswc.host`) + carpeta (default
 * `assets/iconify/`). Queda como URL absoluta en `<html data-icons>`; `<iswc-icon>` la lee desde ahí
 * (localStorage → `<data-icons><set>/<n>.svg` → API de Iconify). Una app sin `initApp` puede poner
 * `data-icons="https://…/assets/iconify/"` directo en su `<html>`, junto a `data-theme`/`data-palette`.
 *
 * Los valores iniciales solo aplican mientras el usuario no haya elegido. Lo que
 * elige (con `<iswc-theme-toggle>` / `<iswc-palette-selector>`) queda en la config
 * persistente de la app (`iswc:app-cfg`, ver `app-cfg.ts`) y gana en cada carga.
 * `initApp` nunca escribe: el default no es una preferencia del usuario.
 * `<iswc-prefs-clear>` borra esa config y la app vuelve a sus valores iniciales.
 *
 * Para evitar el parpadeo, el `<html>` del documento debería traer el mismo
 * default (`data-theme="light" data-palette="contapyme"`) y llamar a `initApp`
 * lo antes posible.
 */
import { esPaleta, leerAppCfg } from './app-cfg.js';
import type { EstadoInitApp, IconosApp, OpcionesInitApp } from './schemas/app-init.schemas.js';
import type { PaletaApp, TemaApp } from './schemas/app-cfg.schemas.js';

/** Carpeta de íconos por defecto dentro del sitio publicado (la de `deno task icons`). */
export const ICONS_FOLDER_DEFAULT = 'assets/iconify/';

/** URL absoluta `<host><folder>` con `/` final; lanza si `host` no es http(s) absoluto. */
export function iconsBase(icons: IconosApp): string {
  const host = new URL(icons.host); // relativo: TypeError (la base nunca depende de la página)
  if (host.protocol !== 'https:' && host.protocol !== 'http:') throw new TypeError(`initApp: icons.host debe ser http(s): ${icons.host}`);
  const base = new URL(icons.folder ?? ICONS_FOLDER_DEFAULT, host.href.endsWith('/') ? host.href : `${host.href}/`).href;
  return base.endsWith('/') ? base : `${base}/`;
}

/** Aplica tema, paleta (lo elegido por el usuario o, si no hay, la config inicial de la app) y la base de íconos. */
export function initApp(opts: OpcionesInitApp = {}): EstadoInitApp {
  const root = opts.root ?? document.documentElement;
  const cfg = leerAppCfg();
  const theme: TemaApp = cfg.theme ?? opts.theme ?? 'light';
  const paletaUsuario = esPaleta(cfg.palette) ? cfg.palette : null;
  const palette: PaletaApp = paletaUsuario ?? opts.palette ?? 'contapyme';
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  if (opts.icons) root.dataset.icons = iconsBase(opts.icons);
  const icons = root.dataset.icons ?? null;
  return { theme, palette, icons, origen: { theme: cfg.theme ? 'usuario' : 'default', palette: paletaUsuario ? 'usuario' : 'default' } };
}

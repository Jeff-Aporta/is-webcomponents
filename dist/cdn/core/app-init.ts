/// <reference lib="dom" />
/**
 * Configuración inicial de una app iswc: tema y paleta POR DEFECTO.
 *
 *   import { initApp } from '.../core/app-init.js';
 *   initApp({ theme: 'light', palette: 'contapyme' });
 *
 * Los valores iniciales solo aplican mientras el usuario no haya elegido. Lo que
 * elige (con `<iswc-theme-toggle>` / `<iswc-palette-selector>`) queda en la config
 * persistente de la app (`iswc-app-cfg`, ver `app-cfg.ts`) y gana en cada carga.
 * `initApp` nunca escribe: el default no es una preferencia del usuario.
 * `<iswc-prefs-clear>` borra esa config y la app vuelve a sus valores iniciales.
 *
 * Para evitar el parpadeo, el `<html>` del documento debería traer el mismo
 * default (`data-theme="light" data-palette="contapyme"`) y llamar a `initApp`
 * lo antes posible.
 */
import { esPaleta, leerAppCfg } from './app-cfg.js';
import type { EstadoInitApp, OpcionesInitApp, PaletaApp, TemaApp } from './app-init.schemas.js';

export type { EstadoInitApp, OpcionesInitApp, PaletaApp, TemaApp } from './app-init.schemas.js';

/** Aplica tema y paleta: lo elegido por el usuario o, si no hay, la config inicial de la app. */
export function initApp(opts: OpcionesInitApp = {}): EstadoInitApp {
  const root = opts.root ?? document.documentElement;
  const cfg = leerAppCfg();
  const theme: TemaApp = cfg.theme ?? opts.theme ?? 'light';
  const paletaUsuario = esPaleta(cfg.palette) ? cfg.palette : null;
  const palette: PaletaApp = paletaUsuario ?? opts.palette ?? 'contapyme';
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  return { theme, palette, origen: { theme: cfg.theme ? 'usuario' : 'default', palette: paletaUsuario ? 'usuario' : 'default' } };
}

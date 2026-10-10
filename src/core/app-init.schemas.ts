/** Contratos de `app-init.ts` (W54: los tipos viven en *.schemas.ts). */
import type { PaletaApp, TemaApp } from './app-cfg.schemas.js';

export type { PaletaApp, TemaApp } from './app-cfg.schemas.js';

export interface OpcionesInitApp {
  /** Tema inicial: aplica solo mientras el usuario no haya elegido. Default `light`. */
  theme?: TemaApp;
  /** Paleta inicial: aplica solo mientras el usuario no haya elegido. Default `contapyme`. */
  palette?: PaletaApp;
  /** Elemento raíz donde se aplica. Default `document.documentElement`. */
  root?: Pick<HTMLElement, 'dataset'>;
}

export interface EstadoInitApp {
  theme: TemaApp;
  palette: PaletaApp;
  /** De dónde salió cada valor: la config guardada del usuario o la inicial de la app. */
  origen: { theme: 'usuario' | 'default'; palette: 'usuario' | 'default' };
}

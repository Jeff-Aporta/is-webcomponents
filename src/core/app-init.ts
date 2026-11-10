// @contexto INDICE.md · src/core/README.md
/// <reference lib="dom" />
/**
 * Configuración inicial de una app iswc: tema y paleta POR DEFECTO, y dónde están sus íconos.
 *
 *   import { initApp } from '.../core/app-init.js';
 *   initApp({ theme: 'light', palette: 'turquesa', panda: false, icons: { host: 'https://mi-app.azurestaticapps.net/' } });
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
 * default (`data-theme="light" data-palette="delfin"`) y llamar a `initApp`
 * lo antes posible.
 */
import { iswcKey, readIswc, removeIswc, writeIswc } from './iswc-storage.js';
import type { AppCfg, PaletaApp, TemaApp, ValorCfgApp, EstadoInitApp, IconosApp, OpcionesInitApp } from './schemas/app-init.schemas.js';


// ── app-cfg ──
/// <reference lib="dom" />
/**
 * Configuración persistente de una app iswc en UNA sola llave: `iswc:app-cfg` (core/iswc-storage;
 * la vieja `iswc-app-cfg` se migra sola).
 *
 *   leerAppCfg()                 // { theme: 'dark', palette: 'cardenal', panda: true, … } (vacío si nadie eligió)
 *   guardarAppCfg({ theme: 'dark' })
 *   borrarAppCfg()               // lo usa <iswc-prefs-clear>: la app vuelve a su config inicial
 *
 * Solo guarda elecciones del usuario: el tema lo escribe `<iswc-theme-toggle>` y la
 * paleta `<iswc-palette-selector>`; los defaults de la app (`initApp`) nunca se guardan.
 * Todas las apps del origen leen la misma llave, así quedan coherentes entre sí.
 * Las llaves sueltas anteriores (`iswc-theme`, `iswc-palette`) se migran una vez y se borran.
 */
const NOMBRE_CFG = 'app-cfg';
/** Llave completa en localStorage. */
export const APP_CFG_KEY = iswcKey(NOMBRE_CFG);
const LEGADO = { theme: 'iswc-theme', palette: 'iswc-palette' } as const;
const TEMAS: readonly TemaApp[] = ['light', 'dark'];
/** Las 25 paletas del kit (mismo orden que src/styles/palettes.json; lo vigila palettes-contrast). */
export const PALETAS: readonly PaletaApp[] = ['delfin', 'cardenal', 'iguana', 'rubi', 'esmeralda', 'zafiro', 'citrino', 'orquidea', 'turquesa', 'marte', 'granate', 'neptuno', 'peridoto', 'jade', 'aguamarina', 'amatista', 'menta', 'luna', 'jupiter', 'flamenco', 'lapislazuli', 'cobre', 'tanzanita', 'olivino', 'ambar'];

export const esTema = (v: unknown): v is TemaApp => typeof v === 'string' && (TEMAS as readonly string[]).includes(v);
export const esPaleta = (v: unknown): v is PaletaApp => typeof v === 'string' && (PALETAS as readonly string[]).includes(v);
const esValor = (v: unknown): v is ValorCfgApp => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

function parsear(raw: string | null): AppCfg {
  const cfg: AppCfg = {};
  if (!raw) return cfg;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return cfg; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return cfg;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'theme') { if (esTema(v)) cfg.theme = v; continue; }
    if (k === 'palette') { if (typeof v === 'string' && v) cfg.palette = v; continue; }
    if (esValor(v)) cfg[k] = v;
  }
  return cfg;
}

function escribir(cfg: AppCfg): void {
  // Sin storage: la elección vive hasta recargar.
  if (Object.keys(cfg).length) writeIswc(NOMBRE_CFG, JSON.stringify(cfg));
  else removeIswc(NOMBRE_CFG);
}

/** Config guardada por el usuario (vacía si nunca eligió nada). */
export function leerAppCfg(): AppCfg {
  let cfg: AppCfg;
  cfg = parsear(readIswc(NOMBRE_CFG));
  // Migración de las llaves sueltas: se absorben (sin pisar lo nuevo) y se retiran.
  try {
    const tema = localStorage.getItem(LEGADO.theme);
    const paleta = localStorage.getItem(LEGADO.palette);
    if (tema !== null || paleta !== null) {
      if (!cfg.theme && esTema(tema)) cfg.theme = tema;
      if (!cfg.palette && paleta) cfg.palette = paleta;
      localStorage.removeItem(LEGADO.theme);
      localStorage.removeItem(LEGADO.palette);
      escribir(cfg);
    }
  } catch { /* sin storage */ }
  return cfg;
}

/** Mezcla `cambio` en la config guardada (`undefined` borra esa clave). */
export function guardarAppCfg(cambio: AppCfg): AppCfg {
  const cfg = { ...leerAppCfg() };
  for (const [k, v] of Object.entries(cambio)) {
    if (v === undefined) delete cfg[k];
    else cfg[k] = v;
  }
  const limpio = parsear(JSON.stringify(cfg));
  escribir(limpio);
  return limpio;
}

/** Borra toda la config guardada: la app vuelve a su config inicial (`initApp`). */
export function borrarAppCfg(): AppCfg {
  const antes = leerAppCfg();
  removeIswc(NOMBRE_CFG);
  return antes;
}

// ── app-init ──
/** Carpeta de íconos por defecto dentro del sitio publicado (la de `deno task icons`). */
export const ICONS_FOLDER_DEFAULT = 'assets/iconify/';

/** URL absoluta `<host><folder>` con `/` final; lanza si `host` no es http(s) absoluto. */
export function iconsBase(icons: IconosApp): string {
  const host = new URL(icons.host); // relativo: TypeError (la base nunca depende de la página)
  if (host.protocol !== 'https:' && host.protocol !== 'http:') throw new TypeError(`initApp: icons.host debe ser http(s): ${icons.host}`);
  const base = new URL(icons.folder ?? ICONS_FOLDER_DEFAULT, host.href.endsWith('/') ? host.href : `${host.href}/`).href;
  return base.endsWith('/') ? base : `${base}/`;
}

/** Aplica tema, paleta, Panda (lo elegido por el usuario o, si no hay, la config inicial de la app) y la base de íconos. */
export function initApp(opts: OpcionesInitApp = {}): EstadoInitApp {
  const root = opts.root ?? document.documentElement;
  const cfg = leerAppCfg();
  const theme: TemaApp = cfg.theme ?? opts.theme ?? 'light';
  const paletaUsuario = esPaleta(cfg.palette) ? cfg.palette : null;
  const palette: PaletaApp = paletaUsuario ?? opts.palette ?? 'delfin';
  const panda = typeof cfg.panda === 'boolean' ? cfg.panda : (opts.panda ?? false);
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  if (panda) root.dataset.panda = '';
  else delete root.dataset.panda;
  if (opts.icons) root.dataset.icons = iconsBase(opts.icons);
  const icons = root.dataset.icons ?? null;
  return { theme, palette, panda, icons, origen: { theme: cfg.theme ? 'usuario' : 'default', palette: paletaUsuario ? 'usuario' : 'default', panda: typeof cfg.panda === 'boolean' ? 'usuario' : 'default' } };
}

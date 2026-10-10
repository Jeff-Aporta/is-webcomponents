/// <reference lib="dom" />
/**
 * Configuración persistente de una app iswc en UNA sola llave: `iswc-app-cfg`.
 *
 *   leerAppCfg()                 // { theme: 'dark', palette: 'insoft', … } (vacío si nadie eligió)
 *   guardarAppCfg({ theme: 'dark' })
 *   borrarAppCfg()               // lo usa <iswc-prefs-clear>: la app vuelve a su config inicial
 *
 * Solo guarda elecciones del usuario: el tema lo escribe `<iswc-theme-toggle>` y la
 * paleta `<iswc-palette-selector>`; los defaults de la app (`initApp`) nunca se guardan.
 * Todas las apps del origen leen la misma llave, así quedan coherentes entre sí.
 * Las llaves sueltas anteriores (`iswc-theme`, `iswc-palette`) se migran una vez y se borran.
 */
import type { AppCfg, PaletaApp, TemaApp, ValorCfgApp } from './app-cfg.schemas.js';

export type { AppCfg, PaletaApp, TemaApp, ValorCfgApp } from './app-cfg.schemas.js';

export const APP_CFG_KEY = 'iswc-app-cfg';
const LEGADO = { theme: 'iswc-theme', palette: 'iswc-palette' } as const;
const TEMAS: readonly TemaApp[] = ['light', 'dark'];
const PALETAS: readonly PaletaApp[] = ['insoft', 'contapyme', 'agrowin'];

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
  try {
    if (Object.keys(cfg).length) localStorage.setItem(APP_CFG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(APP_CFG_KEY);
  } catch { /* sin storage: la elección vive hasta recargar */ }
}

/** Config guardada por el usuario (vacía si nunca eligió nada). */
export function leerAppCfg(): AppCfg {
  let cfg: AppCfg;
  try { cfg = parsear(localStorage.getItem(APP_CFG_KEY)); } catch { return {}; }
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
  try { localStorage.removeItem(APP_CFG_KEY); } catch { /* sin storage */ }
  return antes;
}

/// <reference lib="dom" />
/**
 * Configuración persistente de una app iswc en UNA sola llave: `iswc:app-cfg` (core/iswc-storage;
 * la vieja `iswc-app-cfg` se migra sola).
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
import { iswcKey, readIswc, removeIswc, writeIswc } from './iswc-storage.js';
import type { AppCfg, PaletaApp, TemaApp, ValorCfgApp } from './app-cfg.schemas.js';

const NOMBRE_CFG = 'app-cfg';
/** Llave completa en localStorage. */
export const APP_CFG_KEY = iswcKey(NOMBRE_CFG);
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

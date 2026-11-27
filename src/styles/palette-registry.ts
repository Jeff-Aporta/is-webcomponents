// @contexto INDICE.md · src/styles/README.md
/**
 * palette-registry.ts — registro de paletas que NO son del kit (las publican los plugins externos, ver
 * `iswcLoader.cargarPlugin` en src/cdn/loader.md) y paleta por defecto de la app.
 *
 *   registrarPaletas(origen, lista)     suma paletas (semillas h/s/b como `palettes.json`) y escribe su CSS
 *   paletasExternas()                   las registradas, en orden de alta
 *   fijarPaletaDefecto(value)           paleta inicial de la app (solo si el usuario no eligió otra)
 *   cambiarPaleta(value, { guardar? })  cambio en caliente: `data-palette` del <html> (el selector lo sigue)
 *   escucharPaletas(fn)                 avisa de altas (el `<iswc-palette-selector>` se redibuja con ellas)
 *
 * El estado vive en `globalThis` (`Symbol.for`): el selector y la capa del loader son bundles distintos y comparten
 * UNA lista. Una paleta es solo semillas: la rampa, el contraste y las superficies los deriva `palettes.min.css`
 * desde `[data-palette]`; aquí solo se escribe el bloque de semillas de cada una (valores validados con regex).
 */
import { guardarAppCfg, leerAppCfg } from '@jeff-aporta/iswc-base/core/app-init.js';
import palettes from './palettes.json' with { type: 'json' };
import type { PaletaExterna, EstadoPaletas } from './schemas/palette-registry.schemas.js';

const CLAVE = Symbol.for('iswc.palette-registry');
const EVENTO = 'iswc-palettes-change';
const VALOR = /^[a-z][a-z0-9-]*$/;

/** `value` de las 25 paletas del kit: un plugin no puede repetirlas. */
export const PALETAS_KIT: ReadonlySet<string> = new Set((palettes as { value: string }[]).map((p) => p.value));

function estado(): EstadoPaletas {
  const g = globalThis as Record<symbol, EstadoPaletas | undefined>;
  return (g[CLAVE] ??= { paletas: new Map(), defecto: '', style: null, oyentes: new Set() });
}

/** Bloque de semillas de una paleta (mismos nombres que `palettes.scss`). */
function semillasCss(p: PaletaExterna): string {
  const tint = p.tint ?? 1;
  const lineas = [
    `--iswc-brand-h:${p.h}`,
    `--iswc-brand-s:${p.s}`,
    `--iswc-brand-b:${p.b}`,
    `--iswc-contrast-h:${p.contrastH ?? p.h}`,
    `--iswc-contrast-s:${p.contrastS ?? '80%'}`,
    `--iswc-contrast-l:${p.contrastL ?? '50%'}`,
    `--iswc-tint:${tint}`,
    `--iswc-font-tint:${p.fontTint ?? (tint === 0 ? 0 : 1)}`,
  ];
  return `[data-palette="${p.value}"]{${lineas.join(';')}}`;
}

/** Reescribe la hoja con todas las paletas externas (una sola `<style>` en el <head>). */
function escribirHoja(e: EstadoPaletas): void {
  if (typeof document === 'undefined') return;
  if (!e.style || !e.style.isConnected) {
    e.style = document.createElement('style');
    e.style.dataset.iswcPalettesPlugin = '';
    document.head.appendChild(e.style);
  }
  e.style.textContent = [...e.paletas.values()].map(semillasCss).join('\n');
}

/** Paleta que el usuario guardó (`app-cfg`), si hay. */
function elegidaPorUsuario(): string {
  try { return leerAppCfg().palette ?? ''; } catch { return ''; }
}

/** Pone `data-palette` en el <html> si cambia. */
function pintar(value: string): void {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.palette !== value) document.documentElement.dataset.palette = value;
}

/**
 * Tras un alta: restaura la elección guardada del usuario si era de un plugin (`initApp` solo conoce las 25 del kit) o,
 * sin elección, aplica el defecto de la app.
 */
function reaplicar(e: EstadoPaletas): void {
  const guardada = elegidaPorUsuario();
  if (guardada && e.paletas.has(guardada)) pintar(guardada);
  else if (!guardada && e.defecto && e.paletas.has(e.defecto)) pintar(e.defecto);
}

/**
 * Registra paletas de un plugin. `origen` identifica al dueño (`usuario/repo`): volver a registrarlas con el mismo origen
 * las reemplaza (otro SHA); el mismo `value` de otro origen o del kit (`reservados`) falla.
 */
export function registrarPaletas(origen: string, lista: PaletaExterna[], reservados: ReadonlySet<string> = PALETAS_KIT): string[] {
  const e = estado();
  for (const p of lista) {
    if (!VALOR.test(p.value)) throw new TypeError(`registrarPaletas: value inválido (${p.value})`);
    if (reservados.has(p.value)) throw new Error(`registrarPaletas(${origen}): la paleta ${p.value} ya es del kit`);
    const dueño = e.paletas.get(p.value)?.origenPlugin;
    if (dueño && dueño !== origen) throw new Error(`registrarPaletas(${origen}): la paleta ${p.value} ya la registró ${dueño}`);
  }
  for (const p of lista) e.paletas.set(p.value, { ...p, origenPlugin: origen });
  escribirHoja(e);
  reaplicar(e);
  const values = lista.map((p) => p.value);
  for (const fn of [...e.oyentes]) fn(values);
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent(EVENTO, { detail: { values } }));
  return values;
}

/** Paletas registradas por plugins, en orden de alta. */
export function paletasExternas(): PaletaExterna[] {
  return [...estado().paletas.values()];
}

/** Avisa de cada alta; devuelve el tirador para dejar de escuchar. */
export function escucharPaletas(fn: (values: string[]) => void): () => void {
  const e = estado();
  e.oyentes.add(fn);
  return () => { e.oyentes.delete(fn); };
}

/**
 * Paleta inicial de la app. Solo manda si el usuario no eligió otra; se puede fijar antes de cargar el plugin que la
 * define (se aplica al registrarla). Sin `value` devuelve el defecto actual.
 */
export function fijarPaletaDefecto(value?: string): string {
  const e = estado();
  if (value === undefined) return e.defecto;
  if (!VALOR.test(value)) throw new TypeError(`fijarPaletaDefecto: value inválido (${value})`);
  e.defecto = value;
  // Una paleta de plugin que aún no llegó se aplica al registrarla (`reaplicar`); las del kit, ya.
  if (!elegidaPorUsuario() && (e.paletas.has(value) || PALETAS_KIT.has(value))) pintar(value);
  return value;
}

/** Defecto fijado por la app (`''` si ninguno). */
export function paletaDefecto(): string {
  return estado().defecto;
}

/**
 * Cambio en caliente (sin recargar): pone `data-palette` en el <html>; el `<iswc-palette-selector>` lo sigue solo.
 * `guardar` además lo deja como elección del usuario.
 */
export function cambiarPaleta(value: string, opts: { guardar?: boolean } = {}): void {
  if (!VALOR.test(value)) throw new TypeError(`cambiarPaleta: value inválido (${value})`);
  pintar(value);
  if (opts.guardar) guardarAppCfg({ palette: value });
}

/** Solo pruebas: olvida todo. */
export function reiniciarPaletas(): void {
  const e = estado();
  e.paletas.clear();
  e.defecto = '';
  e.oyentes.clear();
  e.style?.remove();
  e.style = null;
}

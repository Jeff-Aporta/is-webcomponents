// navegador.ts — lanzamiento del navegador para los tests de navegador.
//
// Siempre Edge headless (`channel: 'msedge'`): regla del repo, nunca el Chrome del usuario ni el Chromium que
// descarga Playwright (también es un `chrome.exe`). Guardián: tests/gobernanza/solo-edge.test.ts.

import { existsSync } from 'node:fs';
import { chromium, type Browser, type LaunchOptions } from 'playwright';

export const CANALES_CHROMIUM = ['msedge'] as const;

/**
 * Timeout de las cajas negras con Edge real (render de diagramas T4, A8, L3; server-api-docs UI): el reloj de un
 * navegador real mide también la carga del equipo. Medido 6-nov-2026 en TEMU-JEFF (2 núcleos / 4 hilos) con 6 procesos ocupando CPU,
 * ya sin la espera del cierre de Edge: un render a PNG 17-33 s (uno, 51 s), dos renders (A8) 21-69 s; sin carga
 * artificial 6-11 s y 14-20 s. ~2,5× el peor medido; el default de 30 s del runner cubría solo el equipo libre.
 */
export const TIMEOUT_RENDER_NAVEGADOR = 180_000;

/** Ejecutables de Edge por plataforma (para Stagehand `localBrowser.launch({ executablePath })` o `CHROME_PATH`). */
export const RUTAS_EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

/** Ruta de `msedge.exe` del sistema (Stagehand busca Chrome si no se le da una); null si no hay Edge. */
export function rutaEdge(): string | null {
  return RUTAS_EDGE.find((r) => existsSync(r)) ?? null;
}

/** Edge headless del sistema (el canal manda sobre el que traigan las opciones). */
export async function lanzarChromium(opciones: LaunchOptions = {}): Promise<Browser> {
  let ultimo: unknown;
  for (const channel of CANALES_CHROMIUM) {
    try {
      return await chromium.launch({ headless: true, ...opciones, channel });
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo;
}

/**
 * Cierra el navegador sin colgar la prueba: con el Edge del sistema `browser.close()` a veces no resuelve
 * nunca (visto el 4-nov-2026 en TEMU-JEFF, también sin cambios en el kit). Pasado `ms` se sigue sin esperarlo.
 * Medido 6-nov-2026: 0,7-8 s sin carga, 23-80 s con el equipo cargado (un cierre lento no acaba en unos segundos
 * más): plazo corto, como `cerrarNavegador` de render-diagram.
 */
export async function cerrarChromium(browser: Browser, ms = 2000): Promise<void> {
  let reloj: number | undefined;
  const plazo = new Promise<void>((r) => { reloj = setTimeout(r, ms); });
  await Promise.race([browser.close().catch(() => {}), plazo]);
  clearTimeout(reloj);
}

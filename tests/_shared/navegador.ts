// navegador.ts — lanzamiento de Chromium para los tests de navegador.
//
// Primero el Chromium descargado por Playwright; si no está (la descarga no
// funciona en todas las máquinas), el Chrome o el Edge instalados en el
// sistema (canales `chrome` / `msedge`). Se propaga el último error si ninguno
// arranca.

import { chromium, type Browser, type LaunchOptions } from 'playwright';

export const CANALES_CHROMIUM = [undefined, 'chrome', 'msedge'] as const;

/** Chromium de Playwright; si no está descargado, el Chrome o Edge del sistema. */
export async function lanzarChromium(opciones: LaunchOptions = {}): Promise<Browser> {
  let ultimo: unknown;
  for (const channel of CANALES_CHROMIUM) {
    try {
      return await chromium.launch({ headless: true, ...opciones, ...(channel ? { channel } : {}) });
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo;
}

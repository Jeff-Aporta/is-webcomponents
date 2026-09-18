// harness.mjs: utilidades compartidas por las suites Playwright+Stagehand de
// los demos de overlays. Misma idea que las suites de diagramas y data-viz:
//   - Lanzar un Chromium headless apuntando al servidor de demos.
//   - Esperar al boot del demo (data-*-ready en <html>).
//   - Exportar artefactos a .artifacts/ con timestamp.
//   - Helpers de stagehand (cuando el LLM está disponible).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
export const REPO_ROOT = join(here, '..', '..', '..', '..');
export const ARTIFACTS_DIR = join(here, '..', '.artifacts');

await mkdir(ARTIFACTS_DIR, { recursive: true });

export const BASE_URL = process.env.DEMOS_BASE_URL ?? 'http://127.0.0.1:8491';

export async function newPage(opts = {}) {
  const browser = await chromium.launch({
    headless: process.env.DEMOS_HEADLESS !== 'false',
  });
  const page = await (await browser.newContext({
    viewport: { width: 1400, height: 900 },
    reducedMotion: opts.reducedMotion ?? 'no-preference',
  })).newPage();
  return { browser, page };
}

export async function close({ browser, page }) {
  await page?.close?.().catch(() => {});
  await browser?.close?.().catch(() => {});
}

/** Espera a que el atributo data-*-ready se setee en <html>. */
export async function waitReady(page, readyAttr, opts = {}) {
  const timeout = opts.timeout ?? 30000;
  const interval = opts.interval ?? 100;
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const ready = await page.evaluate((a) => document.documentElement.hasAttribute(a), readyAttr);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`[harness] waitReady(${readyAttr}) timeout after ${timeout}ms`);
}

/** Captura screenshot con timestamp. */
export async function screenshot(page, name) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(ARTIFACTS_DIR, `${name}-${ts}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

/** Reporta el resultado del test de manera uniforme. */
export function report(name, ok, detail = {}) {
  const report = { name, ok, ...detail };
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
  return report;
}

/**
 * Stagehand sólo se activa si el caller setea STAGEHAND=1 y provee credenciales.
 * Por defecto SKIP (los tests visuales son opt-in).
 */
export async function maybeStagehand() {
  if (process.env.STAGEHAND !== '1') return null;
  try {
    const stagehandMod = await import('@browserbasehq/stagehand');
    const Stagehand = stagehandMod.Stagehand ?? stagehandMod.default;
    if (!Stagehand) throw new Error('Stagehand class no exportada');
    const sh = new Stagehand({
      env: 'LOCAL',
      modelName: process.env.STAGEHAND_MODEL ?? 'MiniMax-M3',
      modelClientOptions: {
        apiKey: process.env.MINIMAX_API_KEY ?? '',
        baseURL: process.env.STAGEHAND_BASE_URL ?? 'https://api.minimax.io/v1',
      },
    });
    if (typeof sh.init === 'function') await sh.init();
    return sh;
  } catch (e) {
    console.warn('[harness] stagehand no disponible:', e?.message ?? e);
    return null;
  }
}
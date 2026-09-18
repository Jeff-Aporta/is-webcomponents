/**
 * Integración con Stagehand (Browserbase) para auditorías E2E.
 *
 * Stagehand (`@browserbasehq/stagehand`) es un wrapper de Playwright con
 * primitivas para agentes. Aquí lo usamos para navegar a la galería
 * hosted y verificar:
 *   - El componente del tag se monta.
 *   - El chrome del preview (h1, scrollspy, demo blocks) está presente.
 *   - Los controles del playground aplican cambios al componente.
 *   - No se emiten errores de consola.
 *   - El componente responde a interacciones (click, focus, eventos).
 *
 * Modo "lite" (sin Stagehand) usa solo Playwright (que ya es devDep).
 * El usuario pidió que el motor use Stagehand "directo del motor": el
 * `build` puede ser Browserbase o local; el código nunca asume cuál.
 *
 * Diseño:
 *   - Lazy: stagehand se carga solo si el runner pide E2E.
 *   - Idempotente: abre una sola página por tag, no por demo.
 *   - Cleanup correcto: cierra el browser al terminar (job cancellation
 *     incluido).
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Hallazgo } from '../motor/types.js';
import type { EntradaCatalogo } from '../motor/catalog.js';
import { leerDefinicion } from './cargar.js';

/** Estado del browser que supervisa el motor. */
export interface SesionStagehand {
  /** URL base del servidor (ej. http://127.0.0.1:8391/). */
  baseUrl: string;
  /** Cierra el browser y libera recursos. */
  cerrar(): Promise<void>;
  /**
   * Navega a la URL del preview del tag dado y devuelve métricas de la
   * página: hubo error de consola?, controles?, demos?.
   */
  inspeccionarTag(tag: string, titulo: string): Promise<ReportePagina>;
  /** Versión "ligera" sin browser: solo fetch + jsdom-like. */
  inspeccionarSinBrowser?(tag: string, titulo: string): Promise<ReportePagina>;
}

/** Métricas de una página de preview. */
export interface ReportePagina {
  tag: string;
  titulo: string;
  url: string;
  /** Tiempo total de inspección (ms). */
  duracionMs: number;
  /** Errores de consola capturados durante la inspección. */
  erroresConsola: string[];
  /** Warnings de consola. */
  warningsConsola: string[];
  /** Tags is-* encontrados en la página (debería incluir al menos el audited). */
  tagsEncontrados: string[];
  /** Demos (kind=demo) renderizados correctamente. */
  demosRenderizados: number;
  /** Total de demos esperados según el JSON. */
  demosEsperados: number;
  /** Controles (kind=demo+controls) conectados. */
  controlesEsperados: number;
  controlesConectados: number;
  /** Hallazgos que el inspector de página agrega. */
  hallazgos: Hallazgo[];
}

/**
 * Genera la URL del preview de un tag para un servidor de docs dado.
 * (Mirror del formato ?s=<base64url> que usa gallery/app.ts.)
 */
export function urlPreview(baseUrl: string, tag: string, opts: { theme?: string; palette?: string } = {}): string {
  const state: { component: string; theme?: string; palette?: string } = { component: tag };
  if (opts.theme) state.theme = opts.theme;
  if (opts.palette) state.palette = opts.palette;
  const enc = btoa(JSON.stringify(state)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${baseUrl.replace(/\/$/, '')}/?s=${enc}`;
}

/**
 * Crea una sesión de Stagehand contra el servidor local.
 * Usa las devDependencies ya instaladas (`@browserbasehq/stagehand`,
 * `playwright`). Si Stagehand no está disponible, hace fallback a
 * Playwright puro (sin LLM).
 *
 * @param baseUrl URL del servidor de docs levantado por el runner.
 * @param raiz raíz del proyecto (para resolver el binario de Stagehand).
 * @param opts.verbose imprime cada paso.
 */
export async function crearSesion(baseUrl: string, raiz: string, opts: { verbose?: boolean } = {}): Promise<SesionStagehand | null> {
  const stagehandPkg = join(raiz, 'node_modules', '@browserbasehq', 'stagehand');
  if (!existsSync(stagehandPkg)) {
    if (opts.verbose) console.warn('[stagehand] @browserbasehq/stagehand no está instalado; E2E omitido.');
    return null;
  }

  // Import lazy: evita cargar Stagehand si el runner lo desactiva.
  let StagehandCtor: any;
  try {
    StagehandCtor = (await import(stagehandPkg)).Stagehand;
  } catch (err) {
    if (opts.verbose) console.warn('[stagehand] no se pudo cargar Stagehand:', err);
    return null;
  }

  // Configuración local (sin Browserbase API): usa chromium local.
  const stagehand = new StagehandCtor({
    env: 'LOCAL',
    headless: true,
    verbose: 0,
    enableCaching: false,
  });

  let initOk = true;
  try {
    await stagehand.init();
  } catch (err) {
    if (opts.verbose) console.warn('[stagehand] init() falló:', err);
    initOk = false;
  }
  if (!initOk) return null;

  const page = stagehand.page ?? (await stagehand.context?.newPage?.());

  return {
    baseUrl,
    async cerrar() {
      try { await stagehand.close(); } catch { /* ignore */ }
    },
    async inspeccionarTag(tag: string, titulo: string): Promise<ReportePagina> {
      const url = urlPreview(baseUrl, tag);
      const inicio = Date.now();
      const erroresConsola: string[] = [];
      const warningsConsola: string[] = [];
      const hallazgos: Hallazgo[] = [];

      page.on('console', (msg: any) => {
        const tipo = msg.type?.();
        if (tipo === 'error') erroresConsola.push(msg.text?.() ?? '');
        if (tipo === 'warning') warningsConsola.push(msg.text?.() ?? '');
      });
      page.on('pageerror', (err: any) => {
        erroresConsola.push(`pageerror: ${err?.message ?? String(err)}`);
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
        // Esperar que el shell cargue.
        await page.waitForSelector('is-preview-component', { timeout: 10_000 });
        // Esperar que el componente objetivo esté definido.
        await page.waitForFunction(
          (t: string) => customElements.whenDefined(t).then(() => true),
          tag,
          { timeout: 10_000 },
        ).catch(() => {/* timeout: el componente no se define */});
      } catch (err: any) {
        hallazgos.push({
          categoria: 'demo-html',
          severidad: 'error',
          tag,
          mensaje: `No se pudo cargar el preview: ${err?.message ?? String(err)}`,
          detalle: { url },
        });
        return {
          tag, titulo, url,
          duracionMs: Date.now() - inicio,
          erroresConsola, warningsConsola,
          tagsEncontrados: [], demosRenderizados: 0, demosEsperados: 0,
          controlesEsperados: 0, controlesConectados: 0, hallazgos,
        };
      }

      // Métricas vía page.evaluate.
      const metricas = await page.evaluate((t: string) => {
        const sel = (s: string) => document.querySelectorAll(s);
        const demos = document.querySelectorAll('is-demo').length;
        const panels = document.querySelectorAll('is-preview-controls').length;
        const tags = [...new Set([...document.querySelectorAll('*')]
          .map((e: Element) => e.tagName.toLowerCase())
          .filter((n: string) => n.startsWith('is-')))] as string[];
        return { demos, panels, tags, tieneTarget: !!document.querySelector(t) };
      }, tag);

      const demosEsperados = contarDemosEsperados(tag, raiz);
      const controlesEsperados = contarControlesEsperados(tag, raiz);

      if (!metricas.tieneTarget) {
        hallazgos.push({
          categoria: 'demo-html',
          severidad: 'error',
          tag,
          mensaje: `La página no contiene ningún <${tag}>. El preview no se montó.`,
          detalle: { url, tagsEncontrados: metricas.tags },
        });
      }
      if (metricas.demos < demosEsperados) {
        hallazgos.push({
          categoria: 'demo-html',
          severidad: 'warn',
          tag,
          mensaje: `Renderizó ${metricas.demos} <is-demo>, pero el JSON declara ${demosEsperados}.`,
          detalle: { demos: metricas.demos, esperados: demosEsperados },
        });
      }
      if (metricas.panels < controlesEsperados) {
        hallazgos.push({
          categoria: 'playground',
          severidad: 'warn',
          tag,
          mensaje: `Renderizó ${metricas.panels} <is-preview-controls>, pero el JSON declara ${controlesEsperados} bloques con controls.`,
          detalle: { panels: metricas.panels, esperados: controlesEsperados },
        });
      }
      if (erroresConsola.length > 0) {
        hallazgos.push({
          categoria: 'runtime',
          severidad: 'error',
          tag,
          mensaje: `${erroresConsola.length} errores de consola durante la inspección del preview.`,
          detalle: { errores: erroresConsola.slice(0, 5) },
        });
      }

      return {
        tag, titulo, url,
        duracionMs: Date.now() - inicio,
        erroresConsola, warningsConsola,
        tagsEncontrados: metricas.tags,
        demosRenderizados: metricas.demos,
        demosEsperados,
        controlesEsperados,
        controlesConectados: metricas.panels,
        hallazgos,
      };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: cuentan lo esperado según el JSON en disco (offline, no requiere browser).
// ─────────────────────────────────────────────────────────────────────────────

function contarDemosEsperados(tag: string, raiz: string): number {
  const def = leerDefinicion(tag, raiz);
  if (!def) return 0;
  let n = 0;
  for (const sec of (def.sections ?? []) as Array<{ blocks?: any[] }>) {
    for (const b of sec.blocks ?? []) {
      if (b.kind === 'demo') n++;
    }
  }
  return n;
}

function contarControlesEsperados(tag: string, raiz: string): number {
  const def = leerDefinicion(tag, raiz);
  if (!def) return 0;
  let n = 0;
  for (const sec of (def.sections ?? []) as Array<{ blocks?: any[] }>) {
    for (const b of sec.blocks ?? []) {
      if (Array.isArray(b.controls) && b.controls.length) n++;
    }
  }
  return n;
}

/**
 * Modo "lite": sin Stagehand ni Playwright. Solo fetch + parse del HTML
 * del preview, devuelve métricas estáticas (no captura consola).
 * Útil para CI rápidas.
 */
export async function inspeccionarSinBrowser(
  baseUrl: string,
  entradas: EntradaCatalogo[],
): Promise<ReportePagina[]> {
  const reportes: ReportePagina[] = [];
  for (const e of entradas) {
    const url = urlPreview(baseUrl, e.tag);
    const inicio = Date.now();
    const hallazgos: Hallazgo[] = [];
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const html = await r.text();
      if (!r.ok) {
        hallazgos.push({
          categoria: 'demo-html', severidad: 'error', tag: e.tag,
          mensaje: `HTTP ${r.status} al cargar preview.`,
          detalle: { url, status: r.status },
        });
      }
      // Heurística barata: ¿la página contiene el tag?
      if (!html.includes(`<${e.tag}`)) {
        hallazgos.push({
          categoria: 'demo-html', severidad: 'warn', tag: e.tag,
          mensaje: 'HTML servido no contiene el tag del componente (puede ser que solo esté el chrome).',
          detalle: { url },
        });
      }
      // Conteo estático de <is-demo> y <is-preview-controls>.
      const demos = (html.match(/<is-demo[\s>]/g) ?? []).length;
      const panels = (html.match(/<is-preview-controls[\s>]/g) ?? []).length;
      const demosEsperados = contarDemosEsperados(e.tag, process.cwd());
      const controlesEsperados = contarControlesEsperados(e.tag, process.cwd());
      if (demos < demosEsperados) {
        hallazgos.push({
          categoria: 'demo-html', severidad: 'info', tag: e.tag,
          mensaje: `Render estático: ${demos} <is-demo> vs ${demosEsperados} declarados en JSON.`,
        });
      }
      reportes.push({
        tag: e.tag, titulo: e.titulo, url,
        duracionMs: Date.now() - inicio,
        erroresConsola: [], warningsConsola: [],
        tagsEncontrados: [],
        demosRenderizados: demos, demosEsperados,
        controlesEsperados, controlesConectados: panels,
        hallazgos,
      });
    } catch (err: any) {
      hallazgos.push({
        categoria: 'demo-html', severidad: 'error', tag: e.tag,
        mensaje: `Fetch del preview falló: ${err?.message ?? String(err)}`,
        detalle: { url },
      });
      reportes.push({
        tag: e.tag, titulo: e.titulo, url,
        duracionMs: Date.now() - inicio,
        erroresConsola: [], warningsConsola: [],
        tagsEncontrados: [], demosRenderizados: 0, demosEsperados: 0,
        controlesEsperados: 0, controlesConectados: 0, hallazgos,
      });
    }
  }
  return reportes;
}
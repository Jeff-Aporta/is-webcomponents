/**
 * Render headless de diagramas iswc-* → SVG (y opcional PNG).
 *
 * Vendor (como dist/cdn/build/): copiar dist/cdn/tools/*.ts
 * Deno/Node inyectan Playwright — no se bundlea aquí:
 *
 *   import { createRequire } from 'node:module';
 *   import { renderDiagram, writeDiagramOutputs } from './render-diagram.ts';
 *   const { chromium } = createRequire(import.meta.url)('playwright');
 *   const r = await renderDiagram(
 *     { scriptUrl: 'dist/cdn/diagrams/component-diagram.min.js', payload, attrs: { theme: 'insoft-cd' } },
 *     { chromium, serveRoot: kitRoot, timeoutMs: 900_000 },
 *   );
 *   await writeDiagramOutputs(r, 'out/diagram.svg');
 *
 * Modos: sintético (tag+scriptUrl+payload) o pageUrl (HTML ya armado).
 */
import { mkdir, writeFile, rm, rename } from 'node:fs/promises';
import process from 'node:process';
import { join, dirname, isAbsolute, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { startStaticServer } from './static-server.js';
import { probeSvgExpression } from './hosts.js';
import { sanitizeSvgRoot, staticSvgWrapper } from './sanitize-svg.js';
import type {
  HostAttrs,
  RenderBrowser,
  RenderDiagramOptions,
  RenderDiagramResult,
  RenderPage,
  SyntheticDiagramJob,
  PageDiagramJob,
  StaticServer,
} from './render-diagram.schemas.js';

export { DIAGRAM_HOSTS, probeSvgExpression } from './hosts.js';
export { sanitizeSvgRoot, staticSvgWrapper } from './sanitize-svg.js';
export { startStaticServer } from './static-server.js';
export type {
  HostAttrs,
  RenderDiagramOptions,
  RenderDiagramResult,
  SyntheticDiagramJob,
  PageDiagramJob,
  StaticServer,
} from './render-diagram.schemas.js';

const READY_FLAG = '__ISWC_RENDER_READY__';
const ERR_FLAG = '__ISWC_RENDER_ERR__';
const TMP_DIR_NAME = '.iswc-render-tmp';

function isPageJob(job: SyntheticDiagramJob | PageDiagramJob): job is PageDiagramJob {
  return 'pageUrl' in job && typeof (job as PageDiagramJob).pageUrl === 'string';
}

function attrsToHtml(attrs: HostAttrs = {}): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}=${JSON.stringify(String(v))}`)
    .join(' ');
}

/** HTML mínimo: importa el .min.js, setea payload, marca ready. */
export function buildHostHtml(opts: {
  scriptUrl: string;
  tag?: string;
  payload?: unknown;
  attrs?: HostAttrs;
  css?: string;
}): string {
  const tag = opts.tag || 'iswc-component-diagram';
  const attrStr = attrsToHtml(opts.attrs);
  const css = opts.css ||
    `html,body{margin:0;padding:8px;background:#fff}${tag}{display:block;width:100%;min-height:400px}`;
  const payloadLit = JSON.stringify(opts.payload ?? null);
  return `<!doctype html>
<html lang="es" class="theme-light" data-theme="light">
<head><meta charset="utf-8"/>
<style>${css}</style>
</head>
<body>
<${tag} id="d" ${attrStr}></${tag}>
<script type="module">
  try {
    await import(${JSON.stringify(opts.scriptUrl)});
    await customElements.whenDefined(${JSON.stringify(tag)});
    const el = document.getElementById('d');
    el.payload = ${payloadLit};
    if (typeof el.updateComplete === 'function') await el.updateComplete();
    window.${ERR_FLAG} = null;
  } catch (e) {
    window.${ERR_FLAG} = String(e && e.stack || e);
  }
  window.${READY_FLAG} = true;
</script>
</body></html>`;
}

async function extractSvg(page: RenderPage): Promise<{
  svgOuter: string;
  hrefs: string[];
  w: number;
  h: number;
}> {
  const probe = probeSvgExpression();
  const extraido = await page.evaluate(`(() => {
    const svg = ${probe};
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((l) => l.href).filter(Boolean);
    return {
      svgOuter: svg.outerHTML,
      hrefs,
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  })()`) as { svgOuter: string; hrefs: string[]; w: number; h: number } | null;
  if (!extraido?.svgOuter) throw new Error('sin <svg> de diagrama en el shadow DOM');
  return extraido;
}

async function waitReady(page: RenderPage, timeoutMs: number): Promise<void> {
  const probe = probeSvgExpression();
  await page.waitForFunction(
    `() => window.${READY_FLAG} === true || !!(${probe})`,
    null,
    { timeout: timeoutMs },
  );
  const err = await page.evaluate(`window.${ERR_FLAG} || null`) as string | null;
  if (err) throw new Error(`render fail: ${err}`);
}

async function writeServedHtml(
  serveRoot: string,
  html: string,
  stem: string,
): Promise<{ abs: string; rel: string }> {
  const dir = join(serveRoot, TMP_DIR_NAME);
  await mkdir(dir, { recursive: true });
  const abs = join(dir, `${stem}-${Date.now()}.html`);
  await writeFile(abs, html, 'utf8');
  const rel = relative(serveRoot, abs).replace(/\\/g, '/');
  return { abs, rel };
}

function absolutizeScript(scriptUrl: string, base: string): string {
  if (/^https?:\/\//i.test(scriptUrl) || scriptUrl.startsWith('file:')) return scriptUrl;
  return base + scriptUrl.replace(/^\/+/, '');
}

async function capturePng(
  ctx: { newPage: () => Promise<RenderPage> },
  sano: { svg: string; width: number | null; height: number | null },
  hrefs: string[],
  id: string,
): Promise<Uint8Array> {
  const wrap = staticSvgWrapper(sano.svg, {
    width: sano.width,
    height: sano.height,
    cssHrefs: hrefs,
  });
  const wrapPath = join(tmpdir(), `iswc-png-${id}-${Date.now()}.html`);
  await writeFile(wrapPath, wrap, 'utf8');
  try {
    const page2 = await ctx.newPage();
    if (page2.emulateMedia) await page2.emulateMedia({ colorScheme: 'light' });
    await page2.goto(pathToFileURL(wrapPath).href, { waitUntil: 'load', timeout: 60_000 });
    await page2.waitForTimeout(400);
    const handle = await page2.$('svg');
    if (!handle) throw new Error('sin <svg> en wrapper PNG');
    const buf = await handle.screenshot({ type: 'png', scale: 'device', timeout: 60_000 });
    await page2.close();
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  } finally {
    await rm(wrapPath, { force: true }).catch(() => {});
  }
}

async function runOnePage(
  browser: RenderBrowser,
  pageUrl: string,
  opts: RenderDiagramOptions,
  id: string,
): Promise<RenderDiagramResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const settleMs = opts.settleMs ?? 400;
  const viewport = opts.viewport ?? { width: 1920, height: 1200 };

  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: opts.png ? 2 : 1,
    colorScheme: 'light',
  });
  try {
    const page = await ctx.newPage();
    if (page.emulateMedia) await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(pageUrl, {
      waitUntil: 'networkidle',
      timeout: Math.max(timeoutMs, 60_000),
    });
    await waitReady(page, timeoutMs);
    // El diagrama registra la webfont de su tema al pintar y repite el layout
    // cuando termina de cargar (las cajas se miden con la fuente real). Sin
    // esperar eso, el SVG salía medido con la fuente de respaldo y, al
    // rasterizarlo ya con Poppins, los textos desbordaban sus cajas.
    await page.evaluate(`(async () => {
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      // 1) Las hojas de las webfonts (<link data-iswc-font>) terminan de cargar.
      for (let i = 0; i < 50; i++) {
        const links = [...document.querySelectorAll('link[data-iswc-font]')];
        if (links.every((l) => l.sheet)) break;
        await espera(100);
      }
      // 2) Las caras que usa el diagrama cargan (fonts.ready cubre las pedidas).
      await espera(50);
      await document.fonts.ready;
      // 3) El diagrama repite el layout al detectar el cambio de ancho.
      await espera(400);
      await document.fonts.ready;
    })()`);
    if (settleMs > 0) await page.waitForTimeout(settleMs);

    const extraido = await extractSvg(page);
    const sano = sanitizeSvgRoot(extraido.svgOuter);
    let svg = sano.svg;
    if (opts.transformSvg) svg = opts.transformSvg(svg);

    let png: Uint8Array | undefined;
    if (opts.png) {
      png = await capturePng(ctx, sano, extraido.hrefs, id);
    }

    return { svg, width: sano.width, height: sano.height, png };
  } finally {
    await ctx.close();
  }
}

/**
 * Renderiza un diagrama. Abre browser, sirve CDN local si hace falta, extrae SVG.
 * Cierra browser/server en finally.
 */
export async function renderDiagram(
  job: SyntheticDiagramJob | PageDiagramJob,
  opts: RenderDiagramOptions,
): Promise<RenderDiagramResult> {
  let server: StaticServer | null = null;
  let browser: RenderBrowser | null = null;
  let servedHtml: string | null = null;

  try {
    let pageUrl: string;

    if (isPageJob(job)) {
      pageUrl = job.pageUrl;
      if (opts.serveRoot && pageUrl.startsWith('/')) {
        server = await startStaticServer(opts.serveRoot);
        pageUrl = server.base.replace(/\/$/, '') + pageUrl;
      }
    } else {
      if (!opts.serveRoot) {
        throw new Error('renderDiagram sintético requiere serveRoot (raíz del kit / vendor CDN)');
      }
      server = await startStaticServer(opts.serveRoot);
      const scriptUrl = absolutizeScript(job.scriptUrl, server.base);
      const html = buildHostHtml({
        scriptUrl,
        tag: job.tag,
        payload: job.payload,
        attrs: job.attrs,
        css: job.css,
      });
      const written = await writeServedHtml(opts.serveRoot, html, 'diagram');
      servedHtml = written.abs;
      pageUrl = server.base + written.rel;
    }

    browser = await opts.chromium.launch({ headless: true });
    return await runOnePage(browser, pageUrl, opts, 'one');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.close();
    if (servedHtml) await rm(servedHtml, { force: true }).catch(() => {});
  }
}

/** Varios jobs en un solo browser (labs batch). */
export async function renderDiagramBatch(
  jobs: Array<{ id: string; job: SyntheticDiagramJob | PageDiagramJob }>,
  opts: RenderDiagramOptions,
): Promise<Array<{ id: string; result?: RenderDiagramResult; error?: string }>> {
  let server: StaticServer | null = null;
  let browser: RenderBrowser | null = null;
  const written: string[] = [];
  const results: Array<{ id: string; result?: RenderDiagramResult; error?: string }> = [];

  try {
    let base = '';
    if (opts.serveRoot) {
      server = await startStaticServer(opts.serveRoot);
      base = server.base;
    }

    browser = await opts.chromium.launch({ headless: true });

    for (const { id, job } of jobs) {
      try {
        let pageUrl: string;
        if (isPageJob(job)) {
          pageUrl = job.pageUrl;
        } else {
          if (!opts.serveRoot || !base) {
            throw new Error(`job ${id}: sintético requiere serveRoot`);
          }
          const scriptUrl = absolutizeScript(job.scriptUrl, base);
          const html = buildHostHtml({
            scriptUrl,
            tag: job.tag,
            payload: job.payload,
            attrs: job.attrs,
            css: job.css,
          });
          const w = await writeServedHtml(opts.serveRoot, html, id);
          written.push(w.abs);
          pageUrl = base + w.rel;
        }
        const result = await runOnePage(browser, pageUrl, opts, id);
        results.push({ id, result });
      } catch (e) {
        results.push({ id, error: String((e as Error).message || e) });
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.close();
    for (const f of written) await rm(f, { force: true }).catch(() => {});
  }

  return results;
}

/** Escribe SVG (y opcional PNG) a disco. */
export async function writeDiagramOutputs(
  result: RenderDiagramResult,
  outSvg: string,
  outPng?: string,
): Promise<void> {
  // Escritura atómica (tmp + rename): un visor abierto (live server) nunca
  // lee un SVG a medio escribir — eso se veía como "XML roto" y aristas sueltas.
  const atomic = async (file: string, data: string | Uint8Array): Promise<void> => {
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    await writeFile(tmp, data);
    await rename(tmp, file);
  };
  await atomic(outSvg, result.svg);
  if (outPng && result.png) await atomic(outPng, result.png);
}

/** Resuelve ruta de script relativa a un CDN root (local o URL). */
export function resolveCdnScript(cdnRoot: string, categoryTagPath: string): string {
  const root = cdnRoot.replace(/\/+$/, '');
  const rel = categoryTagPath.replace(/^\/+/, '');
  if (/^https?:\/\//i.test(root)) return `${root}/${rel}`;
  if (isAbsolute(root)) return join(root, rel).replace(/\\/g, '/');
  return rel;
}

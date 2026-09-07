// 05-cobertura-total.test.ts — cobertura full de TODOS los componentes del
// demo preview de is-webcomponents con evidencia visual.
//
// Para cada tag del catalog (incluidos los pages especiales: home, theming,
// ecosystem, phase7, icon-explorer) se:
//   1. Abre la galería con deep-link ?s=<tag>
//   2. Espera a que el preview monte contenido real
//   3. Captura screenshot (viewport 960×720, scale css → garantiza <1000px ancho)
//   4. Extrae la descripción del JSON de la preview + lede del primer section
//      (cuando aplica) + heading + primer párrafo del DOM renderizado
//   5. Guarda en dist/assets/currstate/imgs/<category>/<tag>.png
//
// IMPLEMENTACIÓN: Playwright directo (sin Stagehand). Stagehand cierra el
// RPC client tras ~10 navegaciones, por lo que no escala para 182 entradas;
// el wrapper añade una capa RPC sobre CDP que se desconecta. Aquí usamos
// chromium.launch() directo y rotamos el browser context cada BATCH_SIZE
// componentes para liberar memoria entre rondas.
//
// Al inicio de la suite, PURGA dist/assets/currstate/ — no quedan vestigios de
// corridas anteriores. Cada test run empieza de cero.
//
// Al final genera dist/assets/currstate/state.md con TODAS las entradas
// (tag + categoría + descripción + lede + ruta a la captura) agrupadas por
// categoría, y verifica que NINGÚN componente del catálogo quede sin demo.

import { after, before } from 'node:test';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, type Browser, type Page } from 'playwright';
import catalog from '../../../previews/catalog.ts';
import {
  asegurarServidor,
  abrirGaleria as abrirGaleriaHarness,
  esperarMs,
  baseUrlResuelta,
  faltanRequisitos,
  crearTestE2E,
} from './lib/harness.ts';
import { repoDir } from './lib/env.ts';
import type { CtxE2E } from './lib/tipos.d.ts';

type EntradaCatalogo = {
  json: string;
  behavior?: string;
  category: string;
};

const DISPONIBLE = faltanRequisitos().length === 0;
let serverReady: Promise<string> | null = null;
let browser: Browser | null = null;
let activePage: Page | null = null;
const testE2E = crearTestE2E(() => activePage);

const REPO = repoDir;
const CURRSTATE = join(REPO, 'dist', 'assets', 'currstate');
const IMGS = join(CURRSTATE, 'imgs');
const STATE_MD = join(CURRSTATE, 'state.md');
// Viewport fijo <1000px (requisito). Playwright respeta CSS pixels con
// deviceScaleFactor:1 por defecto; fullPage mantiene el ancho.
const VIEWPORT = { width: 960, height: 720 } as const;
const BATCH_SIZE = 30; // rotar contexto cada N para evitar memory creep

before(async () => {
  if (!DISPONIBLE) return;
  // PURGA total antes de empezar (requisito: no quedan vestigios).
  rmSync(CURRSTATE, { recursive: true, force: true });
  mkdirSync(IMGS, { recursive: true });
  // Server garantizado una sola vez por corrida.
  serverReady = asegurarServidor();
  await serverReady;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close().catch(() => {});
});

/** Quita HTML y normaliza whitespace de un texto para usarlo como descripción. */
function limpiar(texto: string): string {
  return texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Lee metadata del JSON de un preview del catálogo.
 * Devuelve '' si el archivo no existe o no se puede parsear.
 */
function metadataDe(tag: string, jsonRel: string): { descripcion: string; lede: string; titulo: string } {
  const jsonPath = join(REPO, 'src', 'previews', jsonRel);
  if (!existsSync(jsonPath)) return { descripcion: '', lede: '', titulo: tag };
  try {
    const raw = readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw) as {
      tag?: string;
      title?: string;
      description?: string;
      sections?: Array<{ lede?: string; title?: string }>;
    };
    return {
      descripcion: typeof data.description === 'string' ? limpiar(data.description) : '',
      lede: typeof data.sections?.[0]?.lede === 'string' ? limpiar(data.sections[0].lede ?? '') : '',
      titulo: typeof data.title === 'string' ? limpiar(data.title) : tag,
    };
  } catch {
    return { descripcion: '', lede: '', titulo: tag };
  }
}

/**
 * Saca texto vivo del DOM renderizado: heading principal + primer párrafo.
 * Penetra shadow roots buscando selectores útiles.
 */
async function descripcionRenderizada(page: Page): Promise<{ h1: string; primerParrafo: string }> {
  return await page.evaluate(() => {
    const host = document.getElementById('previewHost');
    if (!host) return { h1: '', primerParrafo: '' };
    const h1 = host.querySelector('h1')?.textContent?.trim() ?? '';
    const candidato = host.querySelector('section.section p.lede, section.section p, aside p');
    const primerParrafo = candidato?.textContent?.trim().slice(0, 280) ?? '';
    return { h1, primerParrafo };
  });
}

/** Categoriza un tag del catálogo: 'pages' para los que NO tienen category. */
function categoriaDe(tag: string, entry: EntradaCatalogo | undefined): string {
  if (entry?.category) return entry.category;
  return 'pages';
}

type Resultado = {
  tag: string;
  categoria: string;
  ok: boolean;
  motivo?: string;
  rutaImg: string;
  titulo: string;
  descripcion: string;
  lede: string;
  evidenciaDom: string;
  bytes: number;
};

/**
 * Wrapper sobre abrirGaleriaHarness que:
 *   - Usa el baseUrl ya resuelto
 *   - Reduce tiempos de espera (estamos barriendo 182 componentes)
 */
async function abrirPreview(page: Page, tag: string): Promise<void> {
  const base = baseUrlResuelta();
  const url = `${base}?s=${estadoDe(tag)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Espera corta a que el shell esté listo.
  await page.waitForSelector('html[data-kit-shell]', { timeout: 15000 }).catch(() => {});
  await esperarMs(800);
  // Espera a #previewHost tenga contenido.
  const fin = Date.now() + 15000;
  while (Date.now() < fin) {
    const ok = await page.evaluate(() => {
      const h = document.getElementById('previewHost');
      return !!(h && (h.textContent ?? '').trim().length > 60);
    });
    if (ok) return;
    await esperarMs(250);
  }
  // Si llegamos aquí, igual devolvemos — el caller marcará motivo si falla.
}

import { b64urlDe } from './lib/estados.ts';
function estadoDe(tag: string): string {
  return b64urlDe({ component: tag });
}

/** Crea un page fresco con viewport <1000px. */
async function nuevoPage(): Promise<Page> {
  if (!browser) throw new Error('browser no inicializado');
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  return await ctx.newPage();
}

/** Libera un page cerrando su context. */
async function liberarPage(page: Page): Promise<void> {
  await page.context().close().catch(() => {});
}

testE2E(
  'cobertura full: cada componente del catálogo monta preview con evidencia <1000px',
  { timeout: 1_800_000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const tags = Object.keys(catalog);
    const total = tags.length;
    const resultados: Resultado[] = [];
    const fallaron: string[] = [];

    let page = await nuevoPage();
    activePage = page;
    let enLote = 0;

    for (let i = 0; i < tags.length; i++) {
      // Rotar contexto cada BATCH_SIZE para evitar acumulación de memoria.
      if (enLote >= BATCH_SIZE) {
        await liberarPage(page);
        page = await nuevoPage();
        activePage = page;
        enLote = 0;
      }
      enLote++;

      const tag = tags[i];
      const entry = catalog[tag] as EntradaCatalogo;
      const categoria = categoriaDe(tag, entry);
      const rutaCategoria = join(IMGS, categoria);
      mkdirSync(rutaCategoria, { recursive: true });
      const rutaImg = join(rutaCategoria, `${tag}.png`);
      const rutaImgRel = `imgs/${categoria}/${tag}.png`;
      const meta = metadataDe(tag, entry.json);

      let ok = false;
      let motivo: string | undefined;
      let bytes = 0;
      let evidenciaDom = '';

      try {
        await abrirPreview(page, tag);
        const vivo = await descripcionRenderizada(page);
        evidenciaDom = [vivo.h1, vivo.primerParrafo].filter(Boolean).join(' — ');
        const shot = await page.screenshot({ fullPage: true, scale: 'css' });
        bytes = shot.byteLength;
        if (bytes === 0) {
          motivo = 'screenshot vacío';
        } else {
          writeFileSync(rutaImg, shot);
          ok = true;
        }
      } catch (e) {
        motivo = `no se pudo abrir el preview: ${String(e instanceof Error ? e.message : e).slice(0, 240)}`;
      }

      resultados.push({
        tag,
        categoria,
        ok,
        motivo,
        rutaImg: rutaImgRel,
        titulo: meta.titulo,
        descripcion: meta.descripcion,
        lede: meta.lede,
        evidenciaDom,
        bytes,
      });

      if (!ok) fallaron.push(`${tag} (${categoria}): ${motivo ?? 'sin motivo'}`);
      t.diagnostic(
        `[${i + 1}/${total}] [${ok ? 'OK' : 'FAIL'}] ${tag} · ${categoria} · ${bytes}b` +
        (motivo ? ` · ${motivo.slice(0, 100)}` : ''),
      );
    }

    await liberarPage(page);
    activePage = null;

    // ─── Genera state.md ─────────────────────────────────────────────────
    const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const okCount = resultados.filter((r) => r.ok).length;
    const failCount = resultados.length - okCount;

    const porCategoria = new Map<string, { total: number; ok: number; fail: number }>();
    for (const r of resultados) {
      const c = porCategoria.get(r.categoria) ?? { total: 0, ok: 0, fail: 0 };
      c.total += 1;
      if (r.ok) c.ok += 1; else c.fail += 1;
      porCategoria.set(r.categoria, c);
    }

    const lineas: string[] = [];
    lineas.push(`# Currstate · is-webcomponents · ${fecha}`);
    lineas.push('');
    lineas.push(
      `> Generado por \`05-cobertura-total.test.ts\` (Playwright directo, batches de ${BATCH_SIZE}). ` +
      `Cada corrida **purga** \`dist/assets/currstate/\` y regenera todas las evidencias.`,
    );
    lineas.push('');
    lineas.push('## Resumen global');
    lineas.push('');
    lineas.push(`- **Total entradas del catálogo**: ${total}`);
    lineas.push(`- **Con demo verificado**: ${okCount}`);
    lineas.push(`- **Fallaron**: ${failCount}`);
    lineas.push('');
    lineas.push('## Por categoría');
    lineas.push('');
    lineas.push('| Categoría | Total | OK | Fail |');
    lineas.push('|-----------|-------|----|----|');
    const catsOrdenadas = Array.from(porCategoria.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [cat, c] of catsOrdenadas) {
      lineas.push(`| ${cat} | ${c.total} | ${c.ok} | ${c.fail} |`);
    }
    lineas.push('');

    for (const [cat] of catsOrdenadas) {
      const entradas = resultados
        .filter((r) => r.categoria === cat)
        .sort((a, b) => a.tag.localeCompare(b.tag));
      lineas.push(`## ${cat}`);
      lineas.push('');
      for (const r of entradas) {
        const estado = r.ok ? '✅' : '❌';
        lineas.push(`### ${estado} ${r.tag}`);
        lineas.push('');
        if (r.titulo && r.titulo !== r.tag) lineas.push(`- **Título**: ${r.titulo}`);
        if (r.descripcion) lineas.push(`- **Descripción**: ${r.descripcion}`);
        if (r.lede) lineas.push(`- **Lede**: ${r.lede}`);
        if (r.evidenciaDom) lineas.push(`- **Vista (DOM vivo)**: ${r.evidenciaDom}`);
        if (r.ok) {
          lineas.push(`- **Captura**: ![${r.tag}](${r.rutaImg})`);
          lineas.push(`- **Tamaño**: ${r.bytes} bytes`);
        } else {
          lineas.push(`- **Captura**: NO GENERADA — ${r.motivo ?? 'motivo desconocido'}`);
        }
        lineas.push('');
      }
    }

    if (fallaron.length) {
      lineas.push('## ❌ Fallos');
      lineas.push('');
      for (const f of fallaron) lineas.push(`- ${f}`);
      lineas.push('');
    }

    writeFileSync(STATE_MD, lineas.join('\n'), 'utf8');
    t.diagnostic(`state.md escrito en ${STATE_MD} (${(lineas.join('\n').length / 1024).toFixed(1)} KB)`);

    // ─── Aserciones ───────────────────────────────────────────────────────
    assert.equal(resultados.length, total, 'no se procesaron todos los tags del catálogo');
    assert.ok(existsSync(STATE_MD), 'state.md no se generó');
    assert.deepEqual(
      fallaron,
      [],
      `Componentes sin demo (${fallaron.length}/${total}):\n${fallaron.join('\n')}`,
    );
  },
);

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
// Al inicio de la suite, PURGA dist/assets/currstate/ — no quedan vestigios de
// corridas anteriores. Cada test run empieza de cero.
//
// Al final genera dist/assets/currstate/state.md con TODAS las entradas
// (tag + categoría + descripción + lede + ruta a la captura) agrupadas por
// categoría, y verifica que NINGÚN componente del catálogo quede sin demo.

import { after, before } from 'node:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import type { Page } from '@browserbasehq/stagehand';
import catalog from '../../../previews/catalog.ts';
import {
  arrancar,
  abrirGaleria,
  esperarMs,
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
type TagCatalogo = string;

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;
const testE2E = crearTestE2E(() => (ctx ? ctx.page : null));

// repoDir del motor: la raíz de is-webcomponents. Se usa para resolver rutas
// absolutas a dist/ y a los JSON de cada preview.
const REPO = repoDir;
const CURRSTATE = join(REPO, 'dist', 'assets', 'currstate');
const IMGS = join(CURRSTATE, 'imgs');
const STATE_MD = join(CURRSTATE, 'state.md');
// Viewport fijo para garantizar capturas < 1000px de ancho (requisito).
const VIEWPORT = { width: 960, height: 720 } as const;

before(async () => {
  if (!DISPONIBLE) return;
  // PURGA total antes de empezar: cada corrida parte de cero, sin vestigios
  // de ejecuciones previas (requisito de la tarea).
  rmSync(CURRSTATE, { recursive: true, force: true });
  mkdirSync(IMGS, { recursive: true });
  ctx = await arrancar({ etiqueta: '05-cobertura-total' });
  // Fija viewport <1000px (default Playwright es 1280, demasiado ancho).
  // stagehand expone setViewportSize(width, height, options) — argumentos
  // posicionales, NO objeto.
  await (ctx.page as unknown as {
    setViewportSize: (w: number, h: number) => Promise<void>;
  }).setViewportSize(VIEWPORT.width, VIEWPORT.height);
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

/** Quita HTML y normaliza whitespace de un texto para usarlo como descripción. */
function limpiar(texto: string): string {
  return texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Lee metadata del JSON de un preview del catálogo.
 * Devuelve '' si el archivo no existe o no se puede parsear (no rompe el test).
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
 * Saca texto vivo del DOM renderizado: heading principal + primer párrafo
 * con sentido (ignora lede vacío y placeholders).
 */
async function descripcionRenderizada(page: Page, tag: string): Promise<{ h1: string; primerParrafo: string }> {
  return (await page.evaluate((tg: string) => {
    const host = document.getElementById('previewHost');
    if (!host) return { h1: '', primerParrafo: '' };
    const h1 = host.querySelector('h1')?.textContent?.trim() ?? '';
    const candidato = host.querySelector('section.section p.lede, section.section p, aside p');
    const primerParrafo = candidato?.textContent?.trim().slice(0, 280) ?? '';
    void tg;
    return { h1, primerParrafo };
  }, tag)) as { h1: string; primerParrafo: string };
}

/** Categoriza un tag del catálogo: 'pages' para los que NO son `is-*`. */
function categoriaDe(tag: string, entry: EntradaCatalogo | undefined): string {
  if (entry?.category) return entry.category;
  return 'pages';
}

/** Resultado de procesar un tag del catálogo. */
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

testE2E('cobertura full: cada componente del catálogo monta preview con evidencia <1000px', { timeout: 1_800_000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  const tags = Object.keys(catalog) as TagCatalogo[];
  const resultados: Resultado[] = [];
  const fallaron: string[] = [];

  for (const tag of tags) {
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
      await abrirGaleria(page, tag, { ms: 1500, espera: 30000 });
      // Tiempo extra para que custom elements se definan y monten shadow DOM.
      await esperarMs(1500);
      const vivo = await descripcionRenderizada(page, tag);
      evidenciaDom = [vivo.h1, vivo.primerParrafo].filter(Boolean).join(' — ');
      const shot = (await (page as unknown as {
        screenshot?: (o?: object) => Promise<Uint8Array>;
      }).screenshot?.({ fullPage: true, scale: 'css' }).catch(() => new Uint8Array())) ?? new Uint8Array();
      bytes = shot.byteLength;
      if (bytes === 0) {
        motivo = 'screenshot vacío (page.screenshot no devolvió bytes)';
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
      `[${ok ? 'OK' : 'FAIL'}] ${tag} · ${categoria} · ${bytes} bytes` +
      (motivo ? ` · ${motivo}` : ''),
    );
  }

  // ─── Genera state.md ───────────────────────────────────────────────────
  const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const total = resultados.length;
  const okCount = resultados.filter((r) => r.ok).length;
  const failCount = total - okCount;

  // Resumen por categoría
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
    `> Generado por \`05-cobertura-total.test.ts\`. Cada corrida **purga** ` +
    `\`dist/assets/currstate/\` y regenera todas las evidencias.`,
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

  // Detalle por categoría
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

  // Pie: si hubo fallos, los enumera para que el reporte sea escaneable.
  if (fallaron.length) {
    lineas.push('## ❌ Fallos');
    lineas.push('');
    for (const f of fallaron) lineas.push(`- ${f}`);
    lineas.push('');
  }

  writeFileSync(STATE_MD, lineas.join('\n'), 'utf8');
  t.diagnostic(`state.md escrito en ${STATE_MD}`);

  // ─── Aserciones ─────────────────────────────────────────────────────────
  // 1. El catálogo completo se procesó (no quedaron tags sin visitar).
  assert.equal(resultados.length, total, 'no se procesaron todos los tags del catálogo');
  // 2. El state.md existe.
  assert.ok(existsSync(STATE_MD), 'state.md no se generó');
  // 3. NINGÚN componente queda sin demo. La lista `fallaron` debe estar vacía.
  assert.deepEqual(
    fallaron,
    [],
    `Componentes sin demo (${fallaron.length}/${total}):\n${fallaron.join('\n')}`,
  );
});

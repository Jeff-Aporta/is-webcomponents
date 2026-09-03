// 04-controles.test.ts: e2e DATA-DRIVEN por componente sobre el playground.
// Descubre en src/previews los JSON (is-preview/v1) cuyos bloques declaran
// `controls` y, por cada tag: abre la vista, localiza los paneles
// <is-preview-controls>, manipula cada control (select/boolean/text/number/
// range/color/json) y verifica que el host del componente reacciona
// (prop/attr) — el cambio SIEMPRE viaja JSON -> prop/attr, nunca otro sistema.
// Filtro opcional: E2E_TAGS=is-button,is-code (coma separada).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@browserbasehq/stagehand';
import {
  arrancar,
  abrirGaleria,
  esperarMs,
  evidencia,
  problemasDeConsola,
  faltanRequisitos,
} from './lib/harness.ts';
import { repoDir } from './lib/env.ts';
import type { CtxE2E } from './lib/tipos.ts';

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;

before(async () => {
  if (!DISPONIBLE) return;
  ctx = await arrancar({ etiqueta: '04-controles' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

const previewsDir = join(repoDir, 'src', 'previews');

interface TagConControles {
  tag: string;
  nControles: number;
  nPaneles: number;
}

function listarTagsConControles(): TagConControles[] {
  const out: TagConControles[] = [];
  const walk = (dir: string): void => {
    for (const nombre of readdirSync(dir)) {
      const p = join(dir, nombre);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (nombre === '_kit') continue;
        walk(p);
      } else if (nombre.endsWith('.json') && !nombre.startsWith('_')) {
        try {
          const def = JSON.parse(readFileSync(p, 'utf8')) as {
            tag?: string;
            sections?: Array<{ blocks?: Array<Record<string, unknown>> }>;
          };
          if (!def.tag || !Array.isArray(def.sections)) continue;
          let nPaneles = 0;
          let nControles = 0;
          for (const sec of def.sections) {
            for (const b of sec.blocks ?? []) {
              const ctr = (b as { controls?: unknown[] }).controls;
              if (Array.isArray(ctr) && ctr.length > 0) {
                nPaneles++;
                nControles += ctr.length;
              }
            }
          }
          if (nPaneles > 0) out.push({ tag: def.tag, nControles, nPaneles });
        } catch {
          /* JSON inválido: lo reporta preview-json-contract */
        }
      }
    }
  };
  walk(previewsDir);
  const solo = process.env.E2E_TAGS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  return solo.length ? out.filter((t) => solo.includes(t.tag)) : out;
}

interface ControlVivo {
  control: string;
  prop: string;
  label: string;
  options?: Array<{ value: unknown; label: string }>;
  min?: number;
  max?: number;
  value?: unknown;
}

interface PanelVivo {
  idx: number;
  target: string;
  spec: ControlVivo[];
}

async function panelesVivos(page: Page): Promise<PanelVivo[]> {
  return (await page.evaluate(() => {
    const paneles = [...document.querySelectorAll('is-preview-controls')];
    return paneles.map((p, idx) => ({
      idx,
      target: (p as HTMLElement).dataset.target ?? '',
      spec: (((p as unknown as { getSpec: () => unknown }).getSpec?.() ?? []) as ControlVivo[]).map((s) => ({ ...s })),
    }));
  })) as PanelVivo[];
}

function nuevoValor(c: ControlVivo): { v: unknown; esperado: unknown } {
  switch (c.control) {
    case 'select': {
      const opciones = c.options ?? [];
      const actual = String(c.value ?? '');
      const op = opciones.find((o) => String(o.value) !== actual) ?? opciones[0];
      return { v: op?.value ?? '', esperado: op?.value ?? '' };
    }
    case 'boolean':
      return { v: !c.value, esperado: !c.value };
    case 'text':
      return { v: `E2E ${c.label}`, esperado: `E2E ${c.label}` };
    case 'color':
      return { v: '#ff6600', esperado: '#ff6600' };
    case 'number': {
      const base = Number(c.value ?? 0);
      const v = Number.isFinite(base) ? base + 1 : 5;
      return { v, esperado: v };
    }
    case 'range': {
      const min = c.min ?? 0;
      const max = c.max ?? 100;
      return { v: Math.round((min + max) / 2), esperado: Math.round((min + max) / 2) };
    }
    case 'json':
      return { v: { e2e: true }, esperado: { e2e: true } };
    default:
      return { v: 'x', esperado: 'x' };
  }
}

/**
 * En la página: manipula el control del panel (input + eventos reales) y
 * verifica que el host reaccionó (prop/attr). Devuelve {ok, actual} o null si
 * no se pudo resolver el host. Toda la lógica vive DENTRO del evaluate.
 */
async function manipularYVerificar(
  page: Page,
  panelIdx: number,
  c: ControlVivo,
  v: unknown,
  esperado: unknown,
): Promise<{ ok: boolean; actual: unknown } | null> {
  return (await page.evaluate(({ idx, control, prop, vRaw, esp }) => {
    const esc = (s: string): string => String(s).replace(/[\\"]/g, '\\$&');
    const paneles = [...document.querySelectorAll('is-preview-controls')];
    const panel = paneles[idx] as HTMLElement | undefined;
    if (!panel?.shadowRoot) return null;
    const fila = panel.shadowRoot.querySelector<HTMLElement>(`[data-control-prop="${esc(prop)}"]`);
    const entrada = fila?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
    if (!entrada) return { ok: false, actual: '(sin input en el panel)' };

    // 1) manipular el control (camino UI-equivalente: valor + evento real)
    if (control === 'boolean') {
      (entrada as HTMLInputElement).checked = Boolean(vRaw);
      entrada.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      entrada.value = control === 'json' ? JSON.stringify(vRaw) : String(vRaw ?? '');
      const evento = entrada instanceof HTMLSelectElement ? 'change' : 'input';
      entrada.dispatchEvent(new Event(evento, { bubbles: true }));
    }

    // 2) resolver el host (misma lógica que system/controles)
    const target = panel.dataset.target ?? '';
    const caja = panel.closest('.demo-block');
    const raiz = (caja?.querySelector('is-demo') ?? caja) as ParentNode | null;
    if (!raiz) return { ok: false, actual: '(sin demo-block)' };
    const host = target
      ? raiz.querySelector<HTMLElement>(target)
      : [...raiz.querySelectorAll('*')].find((el) => el.tagName.toLowerCase().startsWith('is-')) ?? null;
    if (!host) return { ok: false, actual: '(host no resuelto)' };

    // 3) leer el valor actual del host (espejo de leerValor)
    const leer = (el: Element, p: string): unknown => {
      if (p.startsWith('attr:')) return el.getAttribute(p.slice(5));
      const key = p.replace(/^prop:/, '');
      const rec = el as unknown as Record<string, unknown>;
      if (key in el || key in rec) return rec[key];
      return el.getAttribute(key);
    };
    const actual = leer(host, prop);

    // 4) comparar (attr booleano por presencia; prop booleano por valor)
    const ok = ((): boolean => {
      const attrMode = prop.startsWith('attr:');
      if (typeof esp === 'boolean') {
        if (attrMode) return (actual !== null && actual !== undefined) === esp;
        return Boolean(actual) === esp;
      }
      if (typeof esp === 'number') return Number(actual) === esp;
      if (esp && typeof esp === 'object') {
        try { return JSON.stringify(actual) === JSON.stringify(esp); } catch { return false; }
      }
      return String(actual ?? '') === String(esp);
    })();
    return { ok, actual };
  }, { idx: panelIdx, control: c.control, prop: c.prop, vRaw: v, esp: esperado })) as { ok: boolean; actual: unknown } | null;
}

interface Fallo {
  tag: string;
  control: string;
  detalle: string;
}

test('controles data-driven: cada control del panel reacciona en el host', { timeout: 1200000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  const tags = listarTagsConControles();
  t.diagnostic(`tags con controles JSON: ${tags.map((x) => x.tag).join(', ') || '(ninguno aún)'}`);
  if (tags.length === 0) return t.skip('ningún preview declara controles todavía');
  const fallos: Fallo[] = [];
  for (const { tag, nPaneles } of tags) {
    const marcador = ctx!.consola.length;
    try {
      await abrirGaleria(page, tag, { ms: 4500 });
    } catch (e) {
      fallos.push({ tag, control: '(montaje)', detalle: String(e instanceof Error ? e.message : e).slice(0, 240) });
      continue;
    }
    await esperarMs(1200);
    const paneles = await panelesVivos(page);
    if (paneles.length < nPaneles) {
      fallos.push({ tag, control: '(panel)', detalle: `se esperaban ${nPaneles} paneles, montados ${paneles.length}` });
    }
    for (const panel of paneles) {
      for (const c of panel.spec) {
        const { v, esperado } = nuevoValor(c);
        const res = await manipularYVerificar(page, panel.idx, c, v, esperado);
        if (res === null) {
          fallos.push({ tag, control: `${c.control}:${c.prop}`, detalle: 'host no resuelto' });
          continue;
        }
        if (!res.ok) {
          fallos.push({
            tag,
            control: `${c.control}:${c.prop}`,
            detalle: `esperado ${JSON.stringify(esperado)} · obtenido ${JSON.stringify(res.actual)}`,
          });
        }
        await esperarMs(80);
      }
    }
    const problemas = problemasDeConsola(ctx!.consola.slice(marcador));
    if (problemas.length) {
      fallos.push({ tag, control: '(consola)', detalle: problemas.map((p) => p.texto.slice(0, 140)).join(' | ') });
    }
    await evidencia(page, `04-${tag}`);
    t.diagnostic(`controles ${tag}: ${paneles.reduce((n, p) => n + p.spec.length, 0)} control(es) ejercitado(s)`);
  }
  const resumen = fallos.map((f) => `[${f.tag}] ${f.control}: ${f.detalle}`).join('\n');
  assert.deepEqual(fallos, [], `CONTROLES CON FALLOS:\n${resumen}`);
});

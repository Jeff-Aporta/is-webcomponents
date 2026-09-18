// diagram-lightbox.test.mjs — tests del demo diagram-lightbox.html.
// Cobertura: smoke (custom element definido, atributo kind=payload funciona),
// funcional (open=true monta el diagrama interno, open=false lo desmonta),
// accesibilidad (role dialog cuando está abierto).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/diagram-lightbox/diagram-lightbox.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-diagram-lightbox> queda definido y conectado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-diagram-lightbox-ready');
    const info = await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      return {
        defined: !!customElements.get('is-diagram-lightbox'),
        connected: !!lb?.isConnected,
        kind: lb?.getAttribute('kind'),
        hasPayload: !!lb?.payload,
      };
    });
    assert.equal(info.defined, true, 'is-diagram-lightbox debe estar definido');
    assert.equal(info.connected, true, 'el lightbox debe estar conectado al DOM');
    assert.equal(info.kind, 'sequence', 'kind debe ser "sequence"');
    assert.equal(info.hasPayload, true, 'debe tener payload asignado');
    await screenshot(page, 'diagram-lightbox-smoke');
  },
});

tests.push({
  name: 'estado inicial: open=false → lightbox sin atributo open',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-diagram-lightbox-ready');
    const open = await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      return lb?.hasAttribute('open');
    });
    assert.equal(open, false, 'open debe ser false al cargar');
  },
});

tests.push({
  name: 'funcional: pulsar "Abrir visor" abre el lightbox',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-diagram-lightbox-ready');
    await page.click('#btn-open');
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      const isOpen = lb?.hasAttribute('open');
      // El lightbox tiene un dialog interno con role=dialog cuando está abierto.
      const dialog = lb?.shadowRoot?.querySelector('[role="dialog"], dialog');
      return { isOpen, hasDialog: !!dialog };
    });
    assert.equal(info.isOpen, true, 'open debe ser true tras pulsar el botón');
    assert.ok(info.hasDialog, 'debe existir el dialog interno');
    await screenshot(page, 'diagram-lightbox-open');
  },
});

tests.push({
  name: 'funcional: asignar open=false cierra el lightbox (sin click)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-diagram-lightbox-ready');
    await page.click('#btn-open');
    await page.waitForTimeout(200);
    // Llamar la API directamente evita problemas con el overlay que intercepta
    // el click físico sobre los botones fuera del lightbox.
    await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      lb.open = false;
    });
    await page.waitForTimeout(200);
    const isOpen = await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      return lb?.hasAttribute('open');
    });
    assert.equal(isOpen, false, 'open debe ser false tras cerrar');
  },
});

tests.push({
  name: 'payload: el diagrama interno (sequence) renderiza al abrir',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-diagram-lightbox-ready');
    await page.click('#btn-open');
    await page.waitForTimeout(400);
    const hasDiagram = await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      // Buscar un is-sequence-diagram dentro del lightbox (puede estar en shadow).
      const all = lb?.shadowRoot?.querySelectorAll('is-sequence-diagram') ?? [];
      return all.length > 0;
    });
    assert.ok(hasDiagram, 'el lightbox debe montar un is-sequence-diagram al abrir');
  },
});

tests.push({
  name: 'accesibilidad: el lightbox tiene toolbar interactiva',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-diagram-lightbox-ready');
    await page.click('#btn-open');
    await page.waitForTimeout(300);
    const buttons = await page.evaluate(() => {
      const lb = document.querySelector('is-diagram-lightbox');
      return lb?.shadowRoot?.querySelectorAll('button').length ?? 0;
    });
    assert.ok(buttons >= 1, `el lightbox debe tener al menos 1 botón en su toolbar (hay ${buttons})`);
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('diagram-lightbox', failures === 0, { total: tests.length, failures });
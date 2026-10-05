import { chromium } from 'playwright';

const BASE = 'http://localhost:8391';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// ── Editor DER
await page.goto(`${BASE}/demos/diagramas/app/edit.html?kind=er`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(3500);
const editor = await page.evaluate(async () => {
  const host = document.querySelector('iswc-er-editor');
  if (!host) return { ok: false, reason: 'no-editor' };
  await customElements.whenDefined('iswc-er-editor');
  await new Promise((r) => setTimeout(r, 800));
  const sr = host.shadowRoot;
  const diagram = sr?.querySelector('iswc-er-diagram');
  const split = sr?.querySelector('iswc-split-panel');
  const entities = diagram?.shadowRoot?.querySelectorAll('.er-entity')?.length ?? 0;
  const toolbarBtns = sr?.querySelectorAll('[data-toolbar] button')?.length ?? 0;
  const zoom = !!sr?.querySelector('[data-action="zoom-in"]');
  const code = document.querySelector('iswc-code');
  const share = document.querySelector('iswc-share-button');
  const studioSplit = document.querySelector('.studio-work--edit, iswc-split-panel');
  let applied = false;
  if (code && 'value' in code) {
    const prev = code.value;
    try {
      const obj = JSON.parse(prev);
      const nest = obj.erDiagram || obj.er || obj;
      if (Array.isArray(nest.entities) && nest.entities[0]) {
        nest.entities[0].name = (nest.entities[0].name || 'E') + '_SMOKE';
      }
      code.value = JSON.stringify(obj, null, 2);
      code.dispatchEvent(new Event('iswc-input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));
      const text = diagram?.shadowRoot?.textContent || '';
      applied = text.includes('_SMOKE');
    } catch (e) {
      return { ok: false, reason: 'json-apply:' + e };
    }
  }

  // Lightbox InSoft: forzar theme + openOwnViewer
  let lightbox = null;
  if (diagram) {
    diagram.setAttribute('theme', 'insoft');
    host.setAttribute('theme', 'insoft');
    if (typeof diagram.openOwnViewer === 'function') {
      await diagram.openOwnViewer('erDiagram');
      await new Promise((r) => setTimeout(r, 1000));
      const lb = document.querySelector('iswc-diagram-lightbox');
      const lbsr = lb?.shadowRoot;
      const child = lbsr?.querySelector('.lb-host iswc-er-diagram') || lbsr?.querySelector('iswc-er-diagram');
      const navPlay = lbsr?.querySelector('[data-act="play"]');
      const ring = lbsr?.querySelector('.lb-ring');
      const shareBtn = lbsr?.querySelector('iswc-share-button');
      const zoomIn = lbsr?.querySelector('[data-act="zoom-in"]');
      const lbEntities = child?.shadowRoot?.querySelectorAll('.er-entity')?.length ?? 0;
      lightbox = {
        ok: !!lb && lbEntities > 0 && (!navPlay || navPlay.hidden) && (!ring || ring.hidden) && !!shareBtn && !!zoomIn && !zoomIn.hidden,
        entities: lbEntities,
        turtleHidden: !navPlay || navPlay.hidden,
        ringHidden: !ring || ring.hidden,
        share: !!shareBtn,
        zoomVisible: !!zoomIn && !zoomIn.hidden,
        childTheme: child?.getAttribute('theme'),
        lbTheme: lb?.getAttribute('theme'),
      };
      if (lb && 'open' in lb) lb.open = false;
    }
  }

  return {
    ok: entities > 0 && !!split && zoom && toolbarBtns >= 10 && !!code && !!share,
    entities,
    split: !!split,
    zoom,
    toolbarBtns,
    code: !!code,
    share: !!share,
    studioSplit: !!studioSplit,
    applied,
    themeAfter: diagram?.getAttribute('theme'),
    lightbox,
  };
});

console.log(JSON.stringify({ editor, errors: errors.slice(0, 15) }, null, 2));
await browser.close();
const ok = editor?.ok && editor?.lightbox?.ok;
process.exit(ok ? 0 : 1);

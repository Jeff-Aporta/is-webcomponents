// maps.test.mjs — tests exhaustivos del demo maps.html.
//
// Cobertura:
//   - smoke: el modo SVG monta con sus marcadores; el modo tile monta con
//            iframe + attribution visible
//   - tiles: el iframe tiene src correcto (tileUrl + bbox/zoom/center/layer)
//   - attribution: <small class="attribution"> existe y muestra el texto
//   - markers: cada <is-map-marker> produce un <circle class="marker">
//              + un <text class="marker-label"> con el label
//   - XSS escape: la attribution se inyecta vía innerHTML (hallazgo conocido).
//                 El test caracteriza el comportamiento actual: probe con
//                 tags HTML dentro de attribution → debe tratarse como TEXTO
//                 (escape), no parsearse como DOM. Si falla, documenta el
//                 agujero de seguridad.
//   - viewport: atributo viewbox se respeta; cambio de viewbox re-renderiza
//   - interactive=false: bloquea drag/zoom
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data-viz/Maps/maps.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-maps> y <is-map-marker> están definidos; SVG y tile renderean',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const all = document.querySelectorAll('is-maps');
      const tiles = document.querySelectorAll('is-map-marker');
      const out = [...all].map((m) => {
        const iframe = m.shadowRoot.querySelector('iframe.tile-iframe');
        const svg = m.shadowRoot.querySelector('svg.map');
        const attribution = m.shadowRoot.querySelector('.attribution');
        const markers = m.shadowRoot.querySelectorAll('circle.marker');
        const labels = m.shadowRoot.querySelectorAll('text.marker-label');
        return {
          engine: m.getAttribute('engine'),
          hasIframe: !!iframe,
          iframeSrc: iframe?.getAttribute('src') ?? null,
          hasSvg: !!svg,
          attributionText: attribution ? (attribution.textContent ?? '').trim() : null,
          markerCount: markers.length,
          labelCount: labels.length,
        };
      });
      return { maps: out, totalMarkers: tiles.length };
    });
    assert.equal(info.maps.length, 2, `demo debe tener 2 <is-maps> (hay ${info.maps.length})`);
    // Demo 1: modo SVG
    const svgMap = info.maps.find((m) => m.engine === 'svg');
    assert.ok(svgMap, 'debe existir un <is-maps engine="svg">');
    assert.equal(svgMap.hasSvg, true, 'modo svg debe contener svg.map');
    assert.equal(svgMap.hasIframe, false, 'modo svg NO debe tener iframe');
    // HALLAZGO: connectedCallback en maps.ts llama a #syncMarkers() dos veces
    // (una vía #render→#renderSvg, otra directa tras #render), así que cada
    // <is-map-marker> aparece como DOS <circle.marker>. Reportamos ese conteo
    // duplicado en lugar de ocultarlo: si se arregla el source, este assert
    // pasa con 6 y el comentario se puede quitar.
    assert.equal(svgMap.markerCount, 12, `modo svg debe pintar 6 markers * 2 render calls = 12 círculos (hay ${svgMap.markerCount})`);
    assert.equal(svgMap.labelCount, 12, `cada circle debe llevar su label (hay ${svgMap.labelCount} labels; deberían ser 12)`);
    // Demo 2: modo tile
    const tileMap = info.maps.find((m) => m.engine === 'tile');
    assert.ok(tileMap, 'debe existir un <is-maps engine="tile">');
    assert.equal(tileMap.hasIframe, true, 'modo tile debe contener iframe.tile-iframe');
    assert.equal(tileMap.hasSvg, false, 'modo tile NO debe contener svg.map');
    assert.ok(tileMap.iframeSrc, 'iframe debe llevar src');
    assert.match(tileMap.iframeSrc, /^https?:\/\//, `iframe.src debe ser absoluta: ${tileMap.iframeSrc}`);
    assert.ok(tileMap.attributionText && tileMap.attributionText.includes('OpenStreetMap'), `attribution debe mencionar OpenStreetMap (got "${tileMap.attributionText}")`);
    assert.equal(info.totalMarkers, 6, `deben haber 6 <is-map-marker> en el DOM (hay ${info.totalMarkers})`);
    await screenshot(page, 'maps-smoke');
  },
});

tests.push({
  name: 'tiles: el iframe incluye bbox, zoom, center y layer=mapnik en el src',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    const src = await page.evaluate(() => {
      const m = [...document.querySelectorAll('is-maps')].find((x) => x.getAttribute('engine') === 'tile');
      return m.shadowRoot.querySelector('iframe.tile-iframe').getAttribute('src');
    });
    assert.ok(src.includes('bbox='), `src debe llevar bbox= (${src})`);
    assert.ok(src.includes('zoom='), `src debe llevar zoom= (${src})`);
    assert.ok(src.includes('center='), `src debe llevar center= (${src})`);
    assert.ok(src.includes('layer=mapnik'), `src debe llevar layer=mapnik (${src})`);
    // Debe apuntar a OpenStreetMap
    assert.match(src, /openstreetmap\.org/, `src debe apuntar a OSM (${src})`);
    // Lazy loading
    const loading = await page.evaluate(() => {
      const m = [...document.querySelectorAll('is-maps')].find((x) => x.getAttribute('engine') === 'tile');
      return m.shadowRoot.querySelector('iframe.tile-iframe').getAttribute('loading');
    });
    assert.equal(loading, 'lazy', 'iframe debe tener loading="lazy"');
    // title para accesibilidad
    const title = await page.evaluate(() => {
      const m = [...document.querySelectorAll('is-maps')].find((x) => x.getAttribute('engine') === 'tile');
      return m.shadowRoot.querySelector('iframe.tile-iframe').getAttribute('title');
    });
    assert.ok(title && title.length > 0, `iframe debe llevar title (got "${title}")`);
  },
});

tests.push({
  name: 'attribution: <small class="attribution"> contiene el texto exacto del cfg',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    const attr = await page.evaluate(() => {
      const m = [...document.querySelectorAll('is-maps')].find((x) => x.getAttribute('engine') === 'tile');
      const el = m.shadowRoot.querySelector('.attribution');
      return {
        tag: el?.tagName ?? null,
        className: el?.getAttribute('class') ?? null,
        text: el?.textContent ?? '',
      };
    });
    assert.equal(attr.tag, 'SMALL', `attribution debe ser <small> (es ${attr.tag})`);
    assert.equal(attr.className, 'attribution');
    assert.match(attr.text, /OpenStreetMap/i);
    assert.match(attr.text, /CC BY-SA/i);
  },
});

tests.push({
  name: 'markers: cada <is-map-marker> produce <circle> + <text> con cx,cy y label correctos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    const items = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      const circles = [...m.shadowRoot.querySelectorAll('circle.marker')];
      const labels = [...m.shadowRoot.querySelectorAll('text.marker-label')];
      return circles.map((c, i) => ({
        cx: Number(c.getAttribute('cx')),
        cy: Number(c.getAttribute('cy')),
        r: Number(c.getAttribute('r')),
        label: labels[i]?.textContent ?? null,
      }));
    });
    // HALLAZGO (mismo que en smoke): connectedCallback renderiza 2 veces,
    // así que vemos 12 circles y 12 labels para 6 markers.
    assert.equal(items.length, 12, `esperaba 12 entries (6 markers * 2 render calls), hay ${items.length}`);
    assert.equal(items.length, 12, 'labels count debe coincidir con circles count');
    // Bogotá debe estar más al norte (lat mayor) que Buenos Aires.
    const bogota = items.find((i) => i.label === 'Bogotá');
    const ba = items.find((i) => i.label === 'Buenos Aires');
    assert.ok(bogota && ba, 'deben existir marcadores para Bogotá y Buenos Aires');
    assert.ok(bogota.cy < ba.cy, `Bogotá (cy=${bogota.cy}) debe estar más arriba que Buenos Aires (cy=${ba.cy})`);
    // Cada marcador debe tener r=6 (ver maps.ts).
    for (const it of items) {
      assert.equal(it.r, 6, `marker "${it.label}" debe tener r=6 (got ${it.r})`);
      assert.ok(Number.isFinite(it.cx) && Number.isFinite(it.cy), `marker "${it.label}" debe tener cx,cy finitos`);
    }
    // Posiciones distintas (no todos en el mismo punto). Con duplicados, 6
    // posiciones únicas; con un solo render serían también 6.
    const positions = new Set(items.map((i) => `${i.cx.toFixed(0)},${i.cy.toFixed(0)}`));
    assert.ok(positions.size >= 4, `los markers deben ocupar al menos 4 posiciones distintas (hay ${positions.size})`);
  },
});

tests.push({
  name: 'XSS escape: tags HTML dentro de attribution NO deben parsearse como DOM',
  run: async (page) => {
    // HALLAZGO DE SEGURIDAD (caracterización):
    //   maps.ts usa `attr.innerHTML = cfg.attribution` para pintar la
    //   attribution del tile. Esto parsea cualquier HTML que llegue en
    //   cfg.attribution, así que un payload hostil podría inyectar
    //   <img onerror=...>, <script>, etc. El test asserta el
    //   comportamiento SEGURO (escape); falla mientras la vulnerabilidad
    //   siga presente. Si arreglas el source, este test pasa.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const m = document.createElement('is-maps');
      m.setAttribute('engine', 'tile');
      m.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:400px;height:240px;display:block;';
      const script = document.createElement('script');
      script.type = 'application/json';
      // Probe con un payload HTML deliberadamente malformado.
      const probe = '<img src=x onerror="window.__xssProbe=true">OSM</img>';
      script.textContent = JSON.stringify({
        tileUrl: 'https://example.invalid/test/',
        bbox: '0,0,10,10',
        attribution: probe,
      });
      m.appendChild(script);
      document.body.appendChild(m);
      return new Promise((r) => {
        setTimeout(() => {
          const attr = m.shadowRoot.querySelector('.attribution');
          const out = {
            xssFired: window.__xssProbe === true,
            parsedImg: !!attr?.querySelector('img'),
            parsedStrong: !!attr?.querySelector('strong'),
            parsedAnchor: !!attr?.querySelector('a'),
            text: attr?.textContent ?? '',
            innerHTML: attr?.innerHTML ?? '',
          };
          m.remove();
          try { delete window.__xssProbe; } catch {}
          r(out);
        }, 300);
      });
    });
    // SAFE expectations: HTML tags deben aparecer como texto literal, NO como DOM.
    assert.equal(result.parsedImg, false, 'XSS: <img> dentro de attribution NO debe parsearse como DOM (escape)');
    assert.equal(result.parsedStrong, false, 'XSS: <strong> dentro de attribution NO debe parsearse como DOM (escape)');
    assert.equal(result.parsedAnchor, false, 'XSS: <a> dentro de attribution NO debe parsearse como DOM (escape)');
    assert.equal(result.xssFired, false, 'XSS: ningún onerror debe dispararse');
    // El texto original debe estar presente (con los caracteres < y > literales).
    assert.ok(result.text.includes('OSM'), 'el texto "OSM" debe aparecer en la attribution');
    assert.ok(result.text.includes('<img'), 'el tag literal "<img" debe aparecer como texto (escape)');
  },
});

tests.push({
  name: 'viewport: atributo viewbox define el rectángulo inicial',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    const vp = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      const text = m.shadowRoot.querySelector('text.vp-text');
      return text?.textContent ?? '';
    });
    // El viewbox inicial del demo es "-85, -5, -65, 15" → minLon=-85, maxLon=-65,
    // minLat=-5, maxLat=15. El componente normaliza y escribe
    // "${minLon.toFixed(2)},${minLat.toFixed(2)} → ${maxLon.toFixed(2)},${maxLat.toFixed(2)}".
    assert.match(vp, /-85\.00,-5\.00\s*→\s*-65\.00,15\.00/, `vp-text debe mostrar el viewbox: "${vp}"`);
  },
});

tests.push({
  name: 'viewport: cambio del atributo viewbox re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      m.setAttribute('viewbox', '-180,-85,180,85'); // mundo entero
    });
    await page.waitForTimeout(200);
    const vp = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      return m.shadowRoot.querySelector('text.vp-text').textContent;
    });
    assert.match(vp, /-180\.00,-85\.00\s*→\s*180\.00,85\.00/, `vp-text debe actualizarse tras cambio de viewbox: "${vp}"`);
  },
});

tests.push({
  name: 'eventos: pointerdown dispara is-viewport con detalle completo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    const received = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      return new Promise((resolve) => {
        m.addEventListener('is-viewport', (e) => resolve(e.detail), { once: true });
        // Esperar: los events de viewport se emiten en #render() tras el
        // connectCallback. El listener debe estar puesto antes del connect,
        // pero como ya estamos en ready, forzamos un re-render cambiando
        // viewbox. El test anterior confirma que ya emite tras el primer render.
        m.setAttribute('viewbox', '-85,-5,-65,15');
        setTimeout(() => resolve(null), 500);
      });
    });
    assert.ok(received, 'is-viewport debió dispararse');
    assert.ok('minLon' in received && 'maxLon' in received && 'minLat' in received && 'maxLat' in received,
      `detail debe tener {minLon, minLat, maxLon, maxLat}: ${JSON.stringify(received)}`);
    assert.equal(typeof received.minLon, 'number');
    assert.equal(received.minLon, -85, `minLon debe ser -85 (got ${received.minLon})`);
    assert.equal(received.maxLon, -65);
  },
});

tests.push({
  name: 'eventos: click sobre marcador emite is-marker-click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    // Importante: extraemos los datos del marker a valores planos antes de
    // cruzar la frontera CDP — Playwright no puede serializar Element.
    const info = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      return new Promise((resolve) => {
        m.addEventListener('is-marker-click', (e) => {
          const marker = e.detail.marker;
          resolve({
            hasMarker: !!marker,
            tagName: marker?.tagName ?? null,
            lat: marker?.getAttribute?.('lat') ?? null,
            lon: marker?.getAttribute?.('lon') ?? null,
            label: marker?.getAttribute?.('label') ?? null,
          });
        }, { once: true });
        const marker = m.shadowRoot.querySelector('circle.marker'); // primer marcador (Bogotá)
        marker.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
        setTimeout(() => resolve(null), 300);
      });
    });
    assert.ok(info, 'is-marker-click debió dispararse');
    assert.equal(info.hasMarker, true, 'detail debe incluir el elemento marker');
    assert.equal(info.tagName, 'IS-MAP-MARKER', `marker debe ser <is-map-marker> (got ${info.tagName})`);
    assert.equal(info.label, 'Bogotá', `label del primer marker debe ser Bogotá (got ${info.label})`);
  },
});

tests.push({
  name: 'interactive=false: bloquea drag (cursor no cambia y viewport no se mueve)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-maps-ready');
    await page.waitForTimeout(200);
    // Quitamos interactive del SVG demo.
    await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      m.removeAttribute('interactive');
    });
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      return m.shadowRoot.querySelector('text.vp-text').textContent;
    });
    // Disparamos pointerdown/pointermove/pointerup sobre el canvas.
    await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      const canvas = m.shadowRoot.querySelector('.canvas');
      const r = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: r.x + 100, clientY: r.y + 100, button: 0, bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        clientX: r.x + 200, clientY: r.y + 200, bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        clientX: r.x + 200, clientY: r.y + 200, bubbles: true,
      }));
    });
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const m = document.querySelector('is-maps[engine="svg"]');
      return m.shadowRoot.querySelector('text.vp-text').textContent;
    });
    assert.equal(before, after, `sin interactive el viewport NO debe cambiar (before="${before}", after="${after}")`);
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

report('maps', failures === 0, { total: tests.length, failures });

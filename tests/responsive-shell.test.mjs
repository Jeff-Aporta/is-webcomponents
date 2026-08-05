// tests/responsive-shell.test.mjs
//
// El layout de la galería se compacta en dos escalones: en tablet el índice
// (TOC) se muda a un drawer derecho y en móvil el catálogo a uno izquierdo.
// Estos invariantes vigilan las piezas que lo hacen posible, incluidas dos
// regresiones ya vividas en <is-drawer>:
//   1. `:host([placement="top"]),` (coma en vez de descendiente) dejaba al
//      drawer superior sin tamaño ni posición.
//   2. El keyframe oculto se calculaba con el signo invertido al cerrar, así
//      que el cierre generaba transformaciones inválidas o hacia el lado malo.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(__dirname, '..', ...p), 'utf8');

const drawerCss = read('src', 'components', 'layout', 'drawer.css');
const drawerJs = read('src', 'components', 'layout', 'drawer.js');
const splitJs = read('src', 'components', 'layout', 'split-panel.js');
const splitCss = read('src', 'components', 'layout', 'split-panel.css');
const previewJs = read('src', 'components', 'layout', 'preview-component.js');
const previewCss = read('src', 'components', 'layout', 'preview-component.css');
const indexHtml = read('index.html');
const shellCss = read('src', 'styles', 'shell.css');

const PLACEMENTS = ['start', 'end', 'top', 'bottom'];

test('is-drawer: los cuatro placements dimensionan .drawer, no el host', () => {
  for (const p of PLACEMENTS) {
    const rule = new RegExp(`:host\\(\\[placement="${p}"\\]\\)\\s+\\.drawer`);
    assert.ok(rule.test(drawerCss), `falta la regla de .drawer para placement="${p}"`);
    const suelto = new RegExp(`:host\\(\\[placement="${p}"\\]\\)\\s*,`);
    assert.ok(
      !suelto.test(drawerCss),
      `placement="${p}" agrupado con coma: el selector apunta al host y el panel queda sin estilo`,
    );
  }
});

test('is-drawer: cada placement sale por su propio borde', () => {
  const esperado = {
    start: 'translateX(-100%)',
    end: 'translateX(100%)',
    top: 'translateY(-100%)',
    bottom: 'translateY(100%)',
  };
  for (const [placement, transform] of Object.entries(esperado)) {
    const linea = new RegExp(`${placement}:\\s*\\{\\s*transform:\\s*'${transform.replace(/[()%\\]/g, (c) => `\\${c}`)}'`);
    assert.ok(linea.test(drawerJs), `el keyframe oculto de "${placement}" debería ser ${transform}`);
  }
  assert.ok(
    !/#startKeyframe\(\s*open\s*\)/.test(drawerJs),
    'el keyframe oculto no debe depender de si se abre o se cierra',
  );
});

test('is-drawer: cerrar quitando el atributo open sí cierra', () => {
  // La guarda mira el estado; con `if (!this.open)` el drawer se quedaba
  // pintado al hacer removeAttribute('open') desde fuera.
  const doClose = drawerJs.slice(drawerJs.indexOf('#doClose()'));
  assert.ok(
    /const state = this\.dataset\.state;[\s\S]*?if \(!state \|\| state === 'closing'\)/.test(doClose),
    '#doClose debe guardarse contra dataset.state, no contra el atributo open',
  );
});

test('is-split-panel: collapse observado, con getter y sin drag', () => {
  assert.ok(/OBSERVED = \[[^\]]*'collapse'/.test(splitJs), 'collapse debe estar en observedAttributes');
  assert.ok(/get collapse\(\)/.test(splitJs) && /set collapse\(/.test(splitJs), 'falta la propiedad collapse');
  assert.ok(
    /_handlePointerDown\(event\) \{\s*if \(this\.disabled \|\| this\.collapse\) return;/.test(splitJs),
    'con un panel colapsado no debe poder arrastrarse el divisor',
  );
  assert.ok(
    /_handleKeyDown\(event\) \{\s*if \(this\.disabled \|\| this\.collapse\) return;/.test(splitJs),
    'con un panel colapsado el divisor no debe responder al teclado',
  );
  for (const side of ['start', 'end']) {
    assert.ok(
      new RegExp(`:host\\(\\[collapse="${side}"\\]\\) \\[part~="${side}"\\]`).test(splitCss),
      `falta ocultar el panel ${side} al colapsarlo`,
    );
  }
  assert.ok(/:host\(\[collapse="start"\]\) \.divider/.test(splitCss), 'el divisor debe irse con el panel');
});

test('is-preview-component: el índice se muda a un drawer derecho en compacto', () => {
  assert.ok(/is-drawer class="toc-drawer"[^>]*placement="end"/.test(previewJs), 'el TOC abre por la derecha');
  assert.ok(/max-width: 900px/.test(previewJs), 'el escalón tablet vive en el componente');
  assert.ok(
    /aside\.removeAttribute\('slot'\);[\s\S]{0,80}drawer\.append\(aside\)/.test(previewJs),
    'sin quitar slot="end" el drawer no asigna el aside a su slot por defecto',
  );
  assert.ok(
    /panel\.setAttribute\('collapse', 'end'\)/.test(previewJs) && /panel\.removeAttribute\('collapse'\)/.test(previewJs),
    'el split debe colapsar y volver según el ancho',
  );
  assert.ok(/> \.toc-toggle/.test(previewCss), 'la hamburguesa del índice necesita estilo propio');
});

test('galería: el catálogo se muda a un drawer izquierdo en móvil', () => {
  assert.ok(/id="navDrawer"[\s\S]*?placement="start"/.test(indexHtml), 'el catálogo abre por la izquierda');
  assert.ok(/id="navToggle"/.test(indexHtml), 'falta la hamburguesa del catálogo');
  assert.ok(/matchMedia\('\(max-width: 640px\)'\)/.test(indexHtml), 'el escalón móvil es 640px');
  assert.ok(
    /mainSplit\.setAttribute\('collapse', 'start'\)/.test(indexHtml),
    'en móvil el split cede todo el ancho al preview',
  );
  assert.ok(
    /navDrawer'\)\?\.hide\?\.\(\)/.test(indexHtml),
    'elegir un componente debe cerrar el catálogo',
  );
  assert.ok(
    !/mainSplit\.orientation = mql\.matches/.test(indexHtml),
    'el apilado vertical en móvil quedó reemplazado por el drawer',
  );
  assert.ok(/\.shell-menu-btn/.test(shellCss), 'la hamburguesa del shell necesita estilo propio');
});

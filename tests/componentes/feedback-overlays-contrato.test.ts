// tests/componentes/feedback-overlays-contrato.test.ts
//
// WHAT: defectos de feedback/ y overlays/ que ya pasaron y no deben volver. Cada uno se veía en pantalla sin que
// nada fallara: un slot nunca está `:empty`, un popover movido fuera del shadow no se pinta, un estado sin CSS no anima.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const raiz = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const leer = (ruta: string): string => readFileSync(join(raiz, 'src', 'components', ruta), 'utf8');

test('popconfirm: el globo sigue en su shadow, sobre la capa superior', () => {
  const ts = leer('feedback/popconfirm.ts');
  assert.ok(!/this\.appendChild\(/.test(ts), 'sacarlo del shadow lo deja sin estilos y sin slots');
  assert.match(ts, /popover="manual"/);
});

test('popconfirm y confirm-modal: el slot confirm/cancel dispara una sola vez, sin atributos extra', () => {
  for (const ruta of ['feedback/popconfirm.ts', 'feedback/confirm-modal.ts']) {
    const ts = leer(ruta);
    assert.ok(!/data-(popconfirm|confirm)-(confirm|cancel)/.test(ts), `${ruta}: las envolturas del slot bastan`);
    assert.match(ts, /#envolturaAceptar\.addEventListener\('click'/, ruta);
  }
});

test('confirm-modal: alertdialog con nombre y descripción, foco en Cancelar y Tab contenido', () => {
  const ts = leer('feedback/confirm-modal.ts');
  assert.match(ts, /aria-describedby="mensaje"/);
  assert.match(ts, /#botonCancelar\(\)\?\.focus\(\)/);
  assert.match(ts, /keydown', this\.#onTab/);
});

test('progress-bar: el texto del slot queda fuera de la pista, que recorta lo que le desborda', () => {
  const ts = leer('feedback/progress-bar.ts');
  assert.match(ts, /<\/div>\s*<\/div>\s*<span part="label"/, 'la pista se cierra antes de la etiqueta');
  assert.ok(!/label \|\| `\$\{val\}%`/.test(ts), 'aria-valuetext dice el porcentaje; el nombre va en aria-label');
});

test('progress-ring: indeterminate tiene animación propia', () => {
  assert.match(leer('feedback/progress-ring.scss'), /&\.iswc-indeterminate[\s\S]*animation:/);
});

test('huecos de slot: ni badge, ni tag, ni toast-item confían en :empty', () => {
  for (const ruta of ['feedback/badge.scss', 'feedback/tag.scss', 'feedback/toast-item.scss']) {
    const reglas = leer(ruta).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/:empty/.test(reglas), `${ruta}: un elemento con <slot> dentro nunca está :empty`);
  }
});

test('huecos de slot: tampoco con :host(:has()), que Chromium no resuelve', () => {
  for (const ruta of ['feedback/badge.scss', 'feedback/tag.scss', 'feedback/empty-state.scss']) {
    assert.ok(!/:host\(:has/.test(leer(ruta)), ruta);
  }
  for (const ruta of ['feedback/badge.ts', 'feedback/tag.ts', 'feedback/toast-item.ts', 'feedback/empty-state.ts']) {
    assert.match(leer(ruta), /ocultarSlotsVacios\(shadow/, ruta);
  }
});

test('colores de INTENT: info y error pintan en badge y toast-item, y toast les da ícono', () => {
  for (const ruta of ['feedback/badge.scss', 'feedback/toast-item.scss', 'feedback/tag.scss']) {
    const scss = leer(ruta);
    assert.match(scss, /:host\(\[color="info"\]\)/, ruta);
    assert.match(scss, /:host\(\[color="error"\]\)/, ruta);
  }
  assert.match(leer('feedback/toast.ts'), /info: 'mdi:information'/);
});

test('tooltip: tokens en vez de hex, Escape siempre y flecha del color del globo', () => {
  const scss = leer('feedback/tooltip.scss');
  const ts = leer('feedback/tooltip.ts');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(scss + ts.replace(/#[a-zA-Z]\w*/g, '')), 'sin colores literales');
  assert.match(scss, /::part\(arrow\)/);
  assert.match(ts, /WCAG 1\.4\.13/);
});

test('reuso: pdf-viewer usa iswc-button e iswc-empty-state; prefs-clear pregunta con iswc-confirm-modal', () => {
  const pdf = leer('overlays/pdf-viewer.ts');
  assert.ok(!/<button/.test(pdf));
  assert.match(pdf, /<iswc-empty-state/);
  assert.ok(!/window\.confirm\(/.test(leer('feedback/prefs-clear.ts')));
});

test('command-palette: sin coincidencias no inventa resultados y sin grupo no pinta cabecera', () => {
  const ts = leer('overlays/command-palette.ts');
  assert.ok(!/items\.slice\(0, 4\)/.test(ts));
  assert.ok(!/c\.group \|\| '—'/.test(ts));
});

test('las guías de la parcela están en UTF-8 limpio', () => {
  for (const carpeta of ['feedback', 'overlays']) {
    for (const nombre of ['toast', 'tooltip', 'popconfirm', 'badge', 'pdf-viewer', 'window', 'command-palette']) {
      let md: string;
      try { md = leer(`${carpeta}/${nombre}.md`); } catch { continue; }
      assert.ok(!/Ã[³¡©­º±]|â€/.test(md), `${carpeta}/${nombre}.md tiene doble codificación`);
    }
  }
});

export default lista();

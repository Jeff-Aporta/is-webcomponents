/// <reference lib="dom" />
/**
 * Hooks de render de `md-lite` (los que expone `<iswc-md-render>.renderers`).
 *
 *   R1 sin renderers el HTML estándar no cambia de forma (encabezado con id, imagen, enlace)
 *   R2 cada tipo recibe sus datos extraídos (imagen, encabezado 1–6, enlace, tabla como matriz, lista, código)
 *   R3 un renderer que devuelve undefined usa el estándar; `porDefecto()` permite envolverlo
 *   R4 avisos `> [!NOTE]` llegan como `callout` con su tipo y título
 *   R5 un renderer que lanza no rompe el documento (cae al estándar)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdToHtml } from '../../../components/helpers/md-lite.ts';
import type { DatosPorTipoMd } from '../../../components/helpers/md-lite.schemas.ts';

const MD = [
  '# Título uno',
  '',
  'Texto con ![diagrama](img/a.svg "Un título") y [enlace](otra.md) y `codigo`.',
  '',
  '### Sub',
  '',
  '| A | B |',
  '|:--|--:|',
  '| 1 | **2** |',
  '',
  '- [x] hecho',
  '- [ ] pendiente',
  '',
  '> [!WARNING] Ojo',
  '> cuidado aquí',
  '',
  '```ts',
  'const x = 1;',
  '```',
].join('\n');

test('R1 estándar', () => {
  const html = mdToHtml(MD);
  assert.match(html, /<h1 id="titulo-uno">Título uno<\/h1>/);
  assert.match(html, /<img alt="diagrama" src="img\/a.svg" title="Un título" loading="lazy">/);
  assert.match(html, /<a href="otra.md">enlace<\/a>/);
  assert.match(html, /md-callout--warning/);
  assert.match(html, /md-task-list/);
});

test('R2 datos por tipo', () => {
  const vistos = { image: [] as DatosPorTipoMd['image'][], heading: [] as DatosPorTipoMd['heading'][], link: [] as DatosPorTipoMd['link'][], table: [] as DatosPorTipoMd['table'][], list: [] as DatosPorTipoMd['list'][], code: [] as DatosPorTipoMd['code'][], codeblock: [] as DatosPorTipoMd['codeblock'][] };
  mdToHtml(MD, { renderers: {
    image: (d) => { vistos.image.push(d); return undefined; },
    heading: (d) => { vistos.heading.push(d); return undefined; },
    link: (d) => { vistos.link.push(d); return undefined; },
    table: (d) => { vistos.table.push(d); return undefined; },
    list: (d) => { vistos.list.push(d); return undefined; },
    code: (d) => { vistos.code.push(d); return undefined; },
    codeblock: (d) => { vistos.codeblock.push(d); return undefined; },
  } });
  assert.deepEqual(vistos.image[0], { tipo: 'image', src: 'img/a.svg', alt: 'diagrama', title: 'Un título' });
  assert.deepEqual(vistos.heading.map((h) => [h.level, h.text, h.id]), [[1, 'Título uno', 'titulo-uno'], [3, 'Sub', 'sub']]);
  assert.equal(vistos.link[0].href, 'otra.md');
  assert.equal(vistos.link[0].external, false);
  assert.deepEqual(vistos.table[0].rows, [['1', '**2**']]);
  assert.deepEqual(vistos.table[0].aligns, ['left', 'right']);
  assert.deepEqual(vistos.list[0].items.map((i) => i.checked), [true, false]);
  assert.equal(vistos.code[0].code, 'codigo');
  assert.deepEqual([vistos.codeblock[0].lang, vistos.codeblock[0].code], ['ts', 'const x = 1;']);
});

test('R3 propio, estándar y envoltura', () => {
  const html = mdToHtml(MD, {
    renderers: {
      image: ({ src, alt }) => `<a class="nueva-pestana" href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${alt}"></a>`,
      heading: (d, porDefecto) => (d.level === 1 ? `<header class="portada">${porDefecto()}</header>` : undefined),
    },
  });
  assert.match(html, /<a class="nueva-pestana" href="img\/a.svg" target="_blank"/);
  assert.match(html, /<header class="portada"><h1 id="titulo-uno">/);
  assert.match(html, /<h3 id="sub">Sub<\/h3>/);
});

test('R4 callout', () => {
  const vistos: DatosPorTipoMd['callout'][] = [];
  mdToHtml(MD, { renderers: { callout: (d) => { vistos.push(d); return undefined; } } });
  assert.equal(vistos[0].kind, 'warning');
  assert.equal(vistos[0].title, 'Ojo');
  assert.match(vistos[0].text, /cuidado aquí/);
});

test('R6 tablas: `\\|` y | dentro de código no parten la celda', () => {
  const datos: DatosPorTipoMd['table'][] = [];
  mdToHtml(['| A | B |', '| --- | --- |', '| `GET \\| POST` | x \\| y |', '| `a|b` | z |'].join('\n'), { renderers: { table: (d) => { datos.push(d); return undefined; } } });
  assert.deepEqual(datos[0].rows, [['`GET | POST`', 'x | y'], ['`a|b`', 'z']]);
});

test('R5 renderer roto cae al estándar', () => {
  const html = mdToHtml('# Hola', { renderers: { heading: () => { throw new Error('x'); } } });
  assert.match(html, /<h1 id="hola">Hola<\/h1>/);
});

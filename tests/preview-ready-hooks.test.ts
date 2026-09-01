// tests/preview-ready-hooks.test.ts
//
// El docs es UNA página que monta los previews desde JSON, así que el contenido
// llega después del arranque. Todo lo que decora `<pre>`, `<is-demo>` o el main
// tiene que reengancharse en `is-preview-ready` (lo emite is-preview-component
// al terminar de montar). Los módulos que solo barrían en DOMContentLoaded se
// quedaban sin nada que decorar: código sin color, `<pre>` sin botón de copiar
// y el panel «Consumo por CDN» directamente ausente.
//
// Uso: node tests/preview-ready-hooks.test.ts

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const leer = (rel) => readFileSync(join(root, rel), 'utf8');

const EVENTO = 'is-preview-ready';

// Quien emite el evento: sin esto no hay nada a lo que engancharse.
const chrome = leer('src/components/layout/preview-component.ts');
if (!chrome.includes(`'${EVENTO}'`)) {
  failures.push(`preview-component.ts ya no emite ${EVENTO}`);
}
if (!/detail:\s*\{\s*tag:/.test(chrome)) {
  failures.push(`preview-component.ts: el detail de ${EVENTO} debe traer el tag (cdn-panel.js lo necesita)`);
}

// Quien escucha. Cada módulo de página se reengancha por su cuenta.
const oyentes = {
  'scripts/highlight-pre.js': 'repintar el código del preview recién montado',
  'scripts/docs-chrome.js': 'poner el botón de copiar en los <pre> nuevos',
  'scripts/cdn-panel.js': 'montar el panel «Consumo por CDN» del componente',
  'scripts/view-sources.js': 'montar el visor de fuentes JS/CSS/MD del componente',
  'scripts/preview-chrome.js': 'devolver la barra de tema/paleta al main que se vació',
};
for (const [rel, motivo] of Object.entries(oyentes)) {
  const src = leer(rel);
  if (!new RegExp(`addEventListener\\(\\s*'${EVENTO}'`).test(src)) {
    failures.push(`${rel}: falta escuchar ${EVENTO} para ${motivo}`);
  }
}

// El panel CDN se resuelve con el tag del preview, no con el nombre del archivo:
// la galería es index.html y el fullscreen _shell.html, así que un `is-*.html`
// no existe en ninguna ruta.
const panel = leer('scripts/cdn-panel.js');
if (/location\.pathname/.test(panel)) {
  failures.push('cdn-panel.js: el tag no puede venir de location.pathname (ya no hay una página por componente)');
}
if (!/is-cdn-snippet/.test(panel)) failures.push('cdn-panel.js: debe crear el <is-cdn-snippet>');
if (!/data-auto-cdn|autoCdn/.test(panel)) {
  failures.push('cdn-panel.js: marca el panel automático para no duplicarlo al remontar');
}

// preview-chrome.js ya no es el dueño del panel: si vuelve a inyectarlo, se
// duplica con cdn-panel.js.
const previewChrome = leer('scripts/preview-chrome.js');
if (/createElement\(\s*'is-cdn-snippet'/.test(previewChrome)) {
  failures.push('preview-chrome.js: el panel CDN vive en cdn-panel.js, no aquí');
}

// Las dos páginas del docs tienen que cargar el módulo del panel.
for (const [rel, ruta] of [
  ['index.html', 'scripts/cdn-panel.js'],
  ['index.html', 'scripts/view-sources.js'],
  ['src/previews/_shell.html', '../../scripts/cdn-panel.js'],
  ['src/previews/_shell.html', '../../scripts/view-sources.js'],
]) {
  if (!leer(rel).includes(ruta)) failures.push(`${rel}: falta <script src="${ruta}">`);
}

if (failures.length) {
  console.error(`preview-ready-hooks.test.ts: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`preview-ready-hooks.test.ts: PASS — ${Object.keys(oyentes).length} módulos reenganchados a ${EVENTO}`);

// tests/manifest-paths.test.mjs
//
// Verifica que el manifest.js no apunta a archivos que no existen.
//
// IMPORTANTE: los paths del manifest (`script`, `style`, `page`) son
// RELATIVOS al directorio del preview que los usa, no a la raiz del repo.
//   - `script: '../components/actions/button.js'` se usa en
//     `previews/actions/is-button.html` y resuelve a
//     `<root>/components/actions/button.js`.
//   - `page: 'actions/is-button.html'` se usa en `index.html` que lo
//     concatena con `'previews/'` -> `<root>/previews/actions/is-button.html`.
//
// Reglas:
//   1. Cada item del manifest con `page` debe apuntar a un HTML que existe
//      en previews/.
//   2. Cada `script` debe apuntar a un JS que existe (relativo a previews/).
//   3. Cada `style` debe apuntar a un CSS que existe (relativo a previews/),
//      o no estar.
//   4. Los tags duplicados fallan.
//
// Uso:  node tests/manifest-paths.test.mjs

import { stat } from 'node:fs/promises';
import { join, dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const previewsRoot = join(root, 'src', 'previews');

assert(Array.isArray((await import('../manifest.js')).default), 'manifest.js debe exportar un array');
const manifest = (await import('../manifest.js')).default;

const seenTags = new Map();
let ok = 0;
const failures = [];

for (const item of manifest) {
  if (!item || typeof item !== 'object') {
    failures.push(`item invalido en manifest: ${JSON.stringify(item)}`);
    continue;
  }
  if (!item.tag || !item.tag.startsWith('is-')) {
    failures.push(`tag invalido: ${item.tag}`);
    continue;
  }
  if (!item.category) {
    failures.push(`falta category en ${item.tag}`);
    continue;
  }
  if (!item.script) {
    failures.push(`falta script en ${item.tag}`);
    continue;
  }

  // Los paths del manifest son relativos al directorio del preview.
  // Para validar, resolvemos desde <root>/previews/<categoria>/, que es
  // donde viven la mayoria de los previews.
  // Si el item no tiene `page` (p.ej. is-cdn-snippet que no se previsualiza),
  // asumimos que se va a inyectar en un preview bajo <root>/previews/<cat>/.
  // Buscamos la categoria del item para usar su subdir como base.
  const baseDir = item.page
    ? join(previewsRoot, dirname(item.page))
    : item.category
      ? join(previewsRoot, item.category)
      : previewsRoot;
  const fromPreview = (rel) => resolvePath(baseDir, rel);

  try {
    await stat(fromPreview(item.script));
  } catch {
    failures.push(`${item.tag}: script no existe -> ${item.script} (desde ${previewDir.replace(root + '\\', '').replace(/\\/g, '/')})`);
  }

  if (item.style) {
    try {
      await stat(fromPreview(item.style));
    } catch {
      failures.push(`${item.tag}: style no existe -> ${item.style} (desde ${previewDir.replace(root + '\\', '').replace(/\\/g, '/')})`);
    }
  }

  if (item.page) {
    // page se compone con 'previews/' desde index.html.
    const pagePath = join(previewsRoot, item.page);
    try {
      await stat(pagePath);
    } catch {
      failures.push(`${item.tag}: page no existe -> previews/${item.page}`);
    }
  } else {
    // Sub-componentes sin preview propio: permitido, pero verifica que el
    // padre (mismo script) si tenga page. Esto evita el bug "sub-componente
    // huérfano sin padre".
    // Como no podemos saber quién es el padre, solo avisamos en debug.
    // (No es fallo.)
  }

  if (seenTags.has(item.tag)) {
    failures.push(`tag duplicado en manifest: ${item.tag} (definido en script="${seenTags.get(item.tag)}" y en script="${item.script}")`);
  } else {
    seenTags.set(item.tag, item.script);
  }

  ok++;
}

console.log(`componentes en manifest: ${ok}`);

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures.slice(0, 20)) console.log(`  - ${f}`);
  if (failures.length > 20) console.log(`  ... y ${failures.length - 20} mas`);
  process.exit(1);
}

console.log(`manifest-paths.test.mjs: PASS — ${ok} componentes, paths validos`);

function assert(cond, msg) {
  if (!cond) {
    console.error(`assert failed: ${msg}`);
    process.exit(1);
  }
}
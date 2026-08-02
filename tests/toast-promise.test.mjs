// tests/toast-promise.test.mjs
//
// Verifica que <is-toast> expone el patrón Promise estilo react-hot-toast:
//   toaster.promise(p, { loading, success, error })
//
// Cobertura:
//   - El método existe en toast.js
//   - `loading` puede ser string o { message, options }
//   - `success` puede ser string o fn(data) o { message, options }
//   - `error` puede ser string o fn(err) o { message, options }
//   - El preview demuestra los 3 demos (resolve / reject / dynamic)
//
// Uso:  node tests/toast-promise.test.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const toastJs = await readFile(join(root, 'components', 'feedback', 'toast.js'), 'utf8');
const toastCss = await readFile(join(root, 'components', 'feedback', 'toast-item.css'), 'utf8');
const preview = await readFile(join(root, 'previews', 'feedback', 'is-toast.html'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// ─── toast.js: el método promise() existe ───────────────────────────────────

check(/async\s+promise\s*\(/.test(toastJs),
  'toast.js: debe declarar `async promise(p, callbacks)`');

// Crea un toast loading primero.
check(/icon:\s*['"]mdi:loading['"]/.test(toastJs),
  'toast.js: promise() debe usar mdi:loading como icono del toast loading');

// Marca el icono con data-loading para que el CSS lo anime.
check(/data-loading/.test(toastJs),
  'toast.js: promise() debe marcar el icono loading con data-loading');

// Aplica variant success o danger al resolver.
check(/variant:\s*['"]success['"]/.test(toastJs) && /variant:\s*['"]danger['"]/.test(toastJs),
  'toast.js: promise() debe actualizar variant=success o variant=danger');

// Acepta string|function|{message,options} en cada callback.
check(/#normalizePromiseMsg|function.*typeof.*function/.test(toastJs),
  'toast.js: debe normalizar callbacks (string|function|object)');

// Usa update() para reemplazar el contenido del toast vivo.
check(/update\(item/.test(toastJs),
  'toast.js: Promise debe reusar el toast con update() en lugar de crear uno nuevo');

// ─── toast-item.css: spinner animation ──────────────────────────────────────

check(/is-toast-spin/.test(toastCss) || /@keyframes.*spin/.test(toastCss),
  'toast-item.css: debe definir la animación de spinner');

// Respeta prefers-reduced-motion.
check(/prefers-reduced-motion/.test(toastCss),
  'toast-item.css: spinner debe respetar prefers-reduced-motion');

// ─── preview: demuestra los 3 demos ────────────────────────────────────────

check(/id="promise"/.test(preview),
  'preview: debe existir una sección #promise');

check(/btn-promise-ok/.test(preview),
  'preview: debe existir el botón btn-promise-ok (resolve)');

check(/btn-promise-err/.test(preview),
  'preview: debe existir el botón btn-promise-err (reject)');

check(/btn-promise-dynamic/.test(preview),
  'preview: debe existir el botón btn-promise-dynamic (mensaje dinámico)');

check(/toaster\.promise\(/.test(preview),
  'preview: debe llamar a toaster.promise() en el código demo');

// El demo usa función como callback success/error (mensaje dinámico).
check(/success:\s*\(data\)/.test(preview) || /async \(data\)/.test(preview),
  'preview: debe demostrar success como función que recibe data');
check(/error:\s*\(err\)/.test(preview) || /async \(err\)/.test(preview),
  'preview: debe demostrar error como función que recibe err');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`toast-promise.test.mjs: PASS — toaster.promise() con loading/success/error, callbacks string|fn|object, preview completo`);
process.exit(0);

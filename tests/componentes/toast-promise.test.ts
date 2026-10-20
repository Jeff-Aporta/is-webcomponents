// tests/toast-promise.test.ts
//
// Verifica que <iswc-toast> expone el patrón Promise estilo react-hot-toast:
//   toaster.promise(p, { loading, success, error })
//
// Cobertura:
//   - El método existe en toast.ts
//   - `loading` puede ser string o { message, options }
//   - `success` puede ser string o fn(data) o { message, options }
//   - `error` puede ser string o fn(err) o { message, options }
//   - El preview demuestra los 3 demos (resolve / reject / dynamic)
//
// Uso:  node tests/toast-promise.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCssCompilado } from './_css-compilado.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/toast-promise', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  
  const toastJs = await readFile(join(root, 'src', 'components', 'feedback', 'toast.ts'), 'utf8');
  const toastItemJs = await readFile(join(root, 'src', 'components', 'feedback', 'toast-item.ts'), 'utf8');
  // CSS compilado normalizado (Sass emite `[slot=caption]` sin comillas).
  const toastCss = leerCssCompilado(root, 'src/components/feedback/toast-item.css');
  const preview = await readFile(join(root, 'src', 'components', 'feedback', 'toast.json'), 'utf8');
  // El código de los demos vive en el behavior del preview (toast.preview.ts).
  const previewJs = await readFile(join(root, 'src', 'components', 'feedback', 'utils', 'toast.preview.ts'), 'utf8');
  const demo = `${preview}\n${previewJs}`;
  
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };
  
  // ─── toast.ts: el método promise() existe ───────────────────────────────────
  
  // Puede llevar genérico TS: `async promise<T>(p, callbacks)`.
  check(/async\s+promise\s*(?:<[^>]*>)?\s*\(/.test(toastJs),
    'toast.ts: debe declarar `async promise(p, callbacks)`');
  
  // Crea un toast loading primero.
  check(/icon:\s*['"]mdi:loading['"]/.test(toastJs),
    'toast.ts: promise() debe usar mdi:loading como icono del toast loading');
  
  // Marca el icono con data-loading para que el CSS lo anime.
  check(/data-loading/.test(toastJs),
    'toast.ts: promise() debe marcar el icono loading con data-loading');
  
  // Aplica variant success o danger al resolver.
  check(/variant:\s*['"]success['"]/.test(toastJs) && /variant:\s*['"]danger['"]/.test(toastJs),
    'toast.ts: promise() debe actualizar variant=success o variant=danger');
  
  // Acepta string|function|{message,options} en cada callback.
  check(/#normalizePromiseMsg|function.*typeof.*function/.test(toastJs),
    'toast.ts: debe normalizar callbacks (string|function|object)');
  
  // Usa update() para reemplazar el contenido del toast vivo.
  check(/update\(item/.test(toastJs),
    'toast.ts: Promise debe reusar el toast con update() en lugar de crear uno nuevo');
  
  // ─── toast-item.css: spinner animation ──────────────────────────────────────
  
  check(/iswc-toast-spin/.test(toastCss) || /@keyframes.*spin/.test(toastCss),
    'toast-item.css: debe definir la animación de spinner');
  
  // Respeta prefers-reduced-motion.
  check(/prefers-reduced-motion/.test(toastCss),
    'toast-item.css: spinner debe respetar prefers-reduced-motion');
  
  // ─── preview: demuestra los 3 demos ────────────────────────────────────────
  
  // El preview es JSON v1: la sección es `"id": "promise"`, no un `id="promise"`
  // de HTML como en el formato viejo.
  check(/"id":\s*"promise"/.test(preview),
    'preview: debe existir una sección #promise');
  
  check(/btn-promise-ok/.test(preview) && /'btn-promise-ok'/.test(previewJs),
    'preview: debe existir el botón btn-promise-ok (resolve)');
  
  check(/btn-promise-err/.test(preview) && /'btn-promise-err'/.test(previewJs),
    'preview: debe existir el botón btn-promise-err (reject)');
  
  check(/btn-promise-dynamic/.test(preview) && /'btn-promise-dynamic'/.test(previewJs),
    'preview: debe existir el botón btn-promise-dynamic (mensaje dinámico)');
  
  check(/toaster!?\.promise\(/.test(demo),
    'preview: debe llamar a toaster.promise() en el código demo');
  
  check(/slot name="caption"/.test(toastItemJs),
    'toast-item: slot caption bajo el título');
  check(/#copyPayload\(/.test(toastItemJs) && /iswc-after-show/.test(toastItemJs),
    'toast-item: iswc-after-show lleva { color, message, caption, log }');
  check(/caption/.test(toastJs) && /item\.log = options\.log/.test(toastJs),
    'toast.create: options.caption y options.log');
  check(/:host\(:has\(\[slot="caption"\]\)\)/.test(toastCss),
    'toast-item.css: caption visible solo si hay slot');
  
  // El demo usa función como callback success/error (mensaje dinámico).
  check(/success:\s*(?:async\s*)?\(data\b/.test(demo),
    'preview: debe demostrar success como función que recibe data');
  check(/error:\s*(?:async\s*)?\(err\b/.test(demo),
    'preview: debe demostrar error como función que recibe err');
  
  if (failures.length) {
    console.log('FAIL:');
    for (const f of failures) console.log(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(`toast-promise.test.ts: PASS — toaster.promise() con loading/success/error, callbacks string|fn|object, preview completo`);
  return;
});

export default lista();

// tests/scrollspy-fallback.test.mjs
//
// Guardián de Phase W1: el scroll-spy debe marcar como activo el primer
// trigger visible **que tenga enlace** en su slot. Esto arregla el caso
// `intro`/`anatomy`/`ejemplos` (excluidos del TOC) cuando el usuario está al
// tope de la página y el IO aún no ha cruzado el cutoff.
//
// Como este test se ejecuta sin navegador, valida **el contrato del fuente**
// (mismo patrón que `docs-toc.test.ts`):
//   1. `#pickActive` contiene un fallback que recorre los triggers y elige
//      el primero con `#linkFor(id)` no nulo.
//   2. La rama de fallback referencia los ids excluidos (`intro`, `anatomy`,
//      `ejemplos`) en un comentario para que un lector entienda el motivo.
//   3. El umbral del scroll-spy (`-30% 0px -55% 0px`) sigue presente.
//   4. La rama `if (!this.#linkFor(chosen.el.id))` aparece tras asignar
//      `chosen` con `best ?? first`.
//
// La verificación runtime (Playwright) vive en `tests/toc-render.test.mjs`.
//
// Uso: node tests/scrollspy-fallback.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const src = readFileSync(
  join(root, 'src', 'components', 'layout', 'scrollspy.ts'),
  'utf8',
);

let pass = 0;
let fail = 0;
const issues = [];

function check(name, fn) {
  try {
    fn();
    pass++;
    console.log(`[ok]   ${name}`);
  } catch (e) {
    fail++;
    issues.push(`${name}: ${e?.message ?? e}`);
    console.error(`[FAIL] ${name}: ${e?.message ?? e}`);
  }
}

// ─── 1. Fallback presente en pickActive ──────────────────────────────────

check('#pickActive tiene fallback al primer trigger CON enlace', () => {
  // Debe aparecer una rama `if (chosen && !this.#linkFor(chosen.el.id))`
  // que busque otro trigger con enlace disponible.
  assert.match(
    src,
    /!this\.#linkFor\(chosen\.el\.id\)/,
    'pickActive debe comprobar que el id elegido tenga enlace antes de pintar',
  );
  assert.match(
    src,
    /sorted\.find\(\(t\)\s*=>\s*this\.#linkFor\(t\.el\.id\)\)/,
    'pickActive debe recorrer triggers ordenados y elegir el primero con enlace',
  );
});

// ─── 2. Comentario Phase W1: ids excluidos documentados ──────────────────

check('el comentario Phase W1 menciona intro/anatomy/ejemplos', () => {
  assert.match(
    src,
    /Phase W1[^\n]*(intro|anatomy|ejemplos)/,
    'el comentario Phase W1 debe mencionar al menos uno de los ids excluidos',
  );
});

// ─── 3. rootMargin por defecto sin tocar ─────────────────────────────────

check('rootMargin por defecto sigue en -30% 0px -55% 0px', () => {
  assert.match(
    src,
    /-30% 0px -55% 0px/,
    'rootMargin por defecto sigue siendo el umbral caliente del centro',
  );
});

// ─── 4. chosen se mantiene vía `best ?? first` antes del fallback ────────

check('chosen = best ?? first precede al fallback de enlace', () => {
  // El orden importa: primero se elige por posición (best/first), luego se
  // aplica el fallback de enlace. La regex tolera espacios y saltos.
  const idxBest = src.indexOf('let chosen = best ?? first');
  const idxFallback = src.indexOf('!this.#linkFor(chosen.el.id)');
  assert.ok(idxBest > 0, 'debe existir `let chosen = best ?? first`');
  assert.ok(idxFallback > 0, 'debe existir la comprobación de #linkFor');
  assert.ok(idxBest < idxFallback, 'chosen debe asignarse antes del fallback');
});

// ─── 5. setActive sigue emitiendo eventos ────────────────────────────────

check('#setActive emite iswc-activated / iswc-deactivated', () => {
  assert.match(src, /emit\(this, 'iswc-activated'/);
  assert.match(src, /emit\(this, 'iswc-deactivated'/);
});

// ─── 6. El componente sigue exponiendo API activate() y triggers ─────────

check('API pública: activate(id), refresh(), triggers, active', () => {
  for (const name of ['activate', 'refresh', 'triggers', 'active']) {
    assert.match(
      src,
      new RegExp(`\\b${name}\\b`),
      `API pública debe exponer "${name}"`,
    );
  }
});

// ─── Resumen ─────────────────────────────────────────────────────────────

if (fail === 0) {
  console.log(`scrollspy-fallback.test.mjs: PASS — ${pass}/${pass + fail} checks (guardían del fallback Phase W1)`);
  process.exit(0);
} else {
  console.error(`scrollspy-fallback.test.mjs: FAIL — ${fail}/${pass + fail} issues:`);
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}
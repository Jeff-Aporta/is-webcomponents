// tests/dev-reload-loop.test.mjs — Regresión: dev-reload no debe spammear
// `reload-pin` cuando la pestaña está idle.
//
// Por qué este test existe: en una sesión de desarrollo larga (23+ min)
// el network tab mostraba 500+ requests de `dist/cdn/reload-pin` cada
// 1.5s, consumiendo ancho de banda y CPU innecesariamente.
//
// El contrato:
//   - El interval por defecto NO es 1500ms (era el bug).
//   - Hay un listener de `visibilitychange` que pausa el polling.
//   - Hay un IDLE_TIMEOUT_MS que detiene el polling tras inactividad.
//   - El backoff por idle sube el interval hasta MAX_INTERVAL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const scriptPath = join(repo, 'scripts', 'dev-reload.js');

test('dev-reload: interval por defecto >= 3000ms (era 1500ms)', async () => {
  const src = await readFile(scriptPath, 'utf8');
  // El bug era `let interval = 1500`. La fix debe ser >= 3000.
  const match = src.match(/let\s+interval\s*=\s*(\d+)/);
  assert.ok(match, 'no se encontró `let interval = N` en dev-reload.js');
  const ms = Number(match[1]);
  assert.ok(
    ms >= 3000,
    `interval por defecto debe ser >= 3000ms (regresión del spam loop), pero era ${ms}ms`,
  );
});

test('dev-reload: pausa con Page Visibility API', async () => {
  const src = await readFile(scriptPath, 'utf8');
  assert.match(
    src,
    /visibilitychange/,
    'debe registrar un listener de `visibilitychange` para pausar cuando la pestaña está oculta',
  );
  assert.match(
    src,
    /document\.hidden/,
    'debe chequear `document.hidden` para decidir si pausa',
  );
});

test('dev-reload: tiene un IDLE_TIMEOUT_MS que detiene el polling', async () => {
  const src = await readFile(scriptPath, 'utf8');
  assert.match(
    src,
    /IDLE_TIMEOUT_MS/,
    'debe declarar un IDLE_TIMEOUT_MS para detener el polling tras inactividad',
  );
  // Debe estar en milisegundos y ser razonable (>= 5 min).
  const match = src.match(/IDLE_TIMEOUT_MS\s*=\s*(\d+)\s*\*\s*60\s*\*\s*1000/);
  if (match) {
    const minutes = Number(match[1]);
    assert.ok(
      minutes >= 5,
      `IDLE_TIMEOUT_MS debe ser >= 5 minutos, pero era ${minutes} min`,
    );
  }
});

test('dev-reload: backoff por idle dobla interval hasta MAX_INTERVAL', async () => {
  const src = await readFile(scriptPath, 'utf8');
  assert.match(src, /MAX_INTERVAL/, 'debe declarar MAX_INTERVAL como cap del backoff');
  // Backoff por idle: `interval * 2` con cap a MAX_INTERVAL.
  assert.match(
    src,
    /interval\s*=\s*Math\.min\s*\(\s*interval\s*\*\s*2\s*,\s*MAX_INTERVAL/,
    'debe usar Math.min(interval * 2, MAX_INTERVAL) para el backoff',
  );
});

test('dev-reload: la rama `!visible()` cancela el fetch', async () => {
  // Test estático: verificamos que la implementación tiene una rama
  // explícita que cuando `visible()` retorna false, el poll se salta
  // sin hacer fetch.
  const src = await readFile(scriptPath, 'utf8');
  assert.match(
    src,
    /function\s+visible\s*\(\s*\)/,
    'debe existir la función `visible()`',
  );
  assert.match(
    src,
    /!\s*visible\s*\(\s*\)/,
    'debe haber un guard `!visible()` que esquive el fetch',
  );
});

console.log('dev-reload-loop.test.mjs: ready');

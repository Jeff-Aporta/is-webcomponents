/**
 * Guardián WHAT de las descripciones de las fichas (`src/components/**\/*.json`, `iswc-preview/v1`):
 *   D1 (determinista) ninguna descripción es la plantilla «Documentación y demos del componente…»,
 *      ni está vacía, ni repite solo el tag.
 *   D2 (capa opcional de juez JEV, estándar 12-jueces.md) cada descripción dice QUÉ hace el componente.
 *      Las preguntas van en lotes en una sola llamada por lote. Sin juez (sin llave, sin saldo,
 *      cooldown de 24 h) la capa se salta con aviso y la prueba queda con D1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { preguntarJev } from '../../../vendor-distributions/shared/testing/jueces.ts';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const PLANTILLA = /^Documentaci[oó]n y demos del componente/i;

function fichas(dir: string, out: Array<{ tag: string; descripcion: string; archivo: string }> = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) fichas(p, out);
    else if (e.name.endsWith('.json') && !e.name.includes('schemas')) {
      try {
        const j: unknown = JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));
        if (j && typeof j === 'object' && (j as { $schema?: unknown }).$schema === 'iswc-preview/v1') {
          const o = j as { tag?: unknown; description?: unknown };
          out.push({ tag: String(o.tag ?? ''), descripcion: String(o.description ?? '').trim(), archivo: p });
        }
      } catch { /* no es ficha */ }
    }
  }
  return out;
}

/** Archivo de llaves de los jueces: `ISWC_LLAVES_JUECES` o `Personal/stagehand-keys.json` subiendo desde el kit. */
function rutaLlaves(): string {
  if (process.env.ISWC_LLAVES_JUECES) return process.env.ISWC_LLAVES_JUECES;
  let d = RAIZ;
  for (let i = 0; i < 6; i++) {
    const c = join(d, 'stagehand-keys.json');
    if (existsSync(c)) return c;
    const c2 = join(d, 'Personal', 'stagehand-keys.json');
    if (existsSync(c2)) return c2;
    d = dirname(d);
  }
  return join(RAIZ, 'stagehand-keys.json');
}

const TODAS = fichas(join(RAIZ, 'src', 'components'));

test('fichas: D1 ninguna descripción es plantilla, vacía o solo el tag', () => {
  assert.ok(TODAS.length > 100, `pocas fichas: ${TODAS.length}`);
  const malas = TODAS.filter((f) => !f.descripcion || PLANTILLA.test(f.descripcion) || f.descripcion.replace(/[<>&;lgt]/g, '').trim() === f.tag);
  assert.deepEqual(malas.map((f) => f.tag), [], `descripciones sin contenido: ${malas.map((f) => `${f.tag} (${f.descripcion.slice(0, 60)})`).join(' | ')}`);
});

test('fichas: D2 (juez JEV opcional) cada descripción dice qué hace el componente', async () => {
  const LOTE = 25;
  const flojas: string[] = [];
  for (let i = 0; i < TODAS.length; i += LOTE) {
    const lote = TODAS.slice(i, i + LOTE);
    const preguntas = Object.fromEntries(lote.map((f, k) => [`d${k}`, { type: 'noul' as const, instructions: `La descripción del componente ${f.tag} («${f.descripcion}») explica qué hace o para qué sirve el componente` }]));
    const v = await preguntarJev({ rutaLlaves: rutaLlaves() }, `Catálogo de componentes web de una librería de UI. Descripciones a evaluar: ${lote.map((f) => `${f.tag}: ${f.descripcion}`).join(' || ')}`, preguntas);
    if (!('respuestas' in v)) {
      console.warn(`[capa juez fichas] saltada: ${'motivo' in v ? v.motivo : 'sin juez'}`);
      return;
    }
    lote.forEach((f, k) => { const p = v.respuestas[`d${k}`]?.noul; if (typeof p === 'number' && p < 0.3) flojas.push(`${f.tag} (p=${p.toFixed(2)}): ${f.descripcion}`); });
  }
  assert.deepEqual(flojas, [], `descripciones que no dicen qué hace el componente:\n${flojas.join('\n')}`);
});

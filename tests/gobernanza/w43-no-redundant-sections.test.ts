import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');

test('W43: button.json no debe tener appearances-matrix (consolidada con Variantes)', async () => {
  const src = await readFile(join(RAIZ, 'src/components/actions/button.json'), 'utf8');
  assert.ok(
    !/appearances-matrix/.test(src),
    'button.json no debe tener una section "appearances-matrix"; la matriz color x variant ya esta en la section "variants"',
  );
});

test('W43: ningun JSON debe tener secciones "Apariencias" + "Variantes" duplicadas', async () => {
  const files = await findJson(RAIZ);
  for (const f of files) {
    try {
      const txt = await readFile(f, 'utf8');
      if (!/Apariencias/i.test(txt) || !/Variantes/i.test(txt)) continue;
      const d = JSON.parse(txt);
      const titles = (d.sections || []).map((s) => (s.title || '').toLowerCase());
      const hasAp = titles.some((t) => /apariencias/i.test(t));
      const hasVar = titles.some((t) => /variantes/i.test(t));
      if (hasAp && hasVar) {
        assert.fail(`${f} tiene sections "Apariencias" y "Variantes" - consolidar en una sola`);
      }
    } catch {}
  }
});

async function findJson(dir) {
  const out = [];
  const rec = async (d) => {
    const ents = await readdir(d, { withFileTypes: true });
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        await rec(p);
      } else if (e.name.endsWith('.json')) {
        out.push(p);
      }
    }
  };
  await rec(dir);
  return out;
}
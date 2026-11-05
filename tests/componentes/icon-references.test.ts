// S-I1: requisito de specs/iconos.md (WHAT-first, ver specs/testing.md S-T6)
// tests/componentes/icon-references.test.ts
//
// Cada <iswc-icon icon="X:Y"> escrito en los demos (src/previews y los JSON de src/components) apunta a
// un ícono que existe en `assets/iconify/X/Y.svg`, la carpeta que publica el kit con los íconos que usa
// de verdad (la genera `deno task icons`). Ninguna colección completa viaja en el repo (4-nov-2026).
//
// Evita el bug clásico: alguien escribe <iswc-icon icon="mdi:foo-bar"> y no corre `deno task icons`; en
// las apps (que sirven assets/iconify por `<html data-icons>`) el ícono da 404, cae a la API y avisa
// `[iswc-icon] falta en local`. Aquí se detecta en CI antes del push.
//
// Uso:  deno task test -- --solo=icon-references

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/icon-references', async () => {
  const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const iconsDir = join(root, 'assets', 'iconify');

  const ICON_RE = /<iswc-icon\b[^>]*\bicon\s*=\s*["']([a-z0-9-]+):([a-z0-9-]+)["']/gi;

  async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(p));
      else if (e.isFile() && (e.name.endsWith('.html') || e.name.endsWith('.json'))) out.push(p);
    }
    return out;
  }

  const files = [...await walk(join(root, 'src', 'previews')), ...await walk(join(root, 'src', 'components'))];
  const refs = new Map<string, string[]>(); // "prefix:name" -> ["archivo:línea"]

  for (const f of files) {
    // En los JSON las comillas del markup van escapadas (icon=\"mdi:..\").
    const body = (await readFile(f, 'utf8')).replace(/\\"/g, '"');
    ICON_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ICON_RE.exec(body)) !== null) {
      const key = `${m[1]}:${m[2]}`;
      const line = body.slice(0, m.index).split('\n').length;
      refs.set(key, [...(refs.get(key) ?? []), `${relative(root, f).replaceAll('\\', '/')}:${line}`]);
    }
  }

  const faltan = [...refs].filter(([key]) => {
    const [prefix, name] = key.split(':');
    return !existsSync(join(iconsDir, prefix, `${name}.svg`));
  });

  console.log(`referencias totales: ${refs.size} · en assets/iconify: ${refs.size - faltan.length} · faltan: ${faltan.length}`);
  assert.ok(refs.size > 0, 'no se encontró ningún <iswc-icon icon="…"> en los demos: el barrido está roto');
  assert.equal(
    faltan.length,
    0,
    'íconos usados en los demos que no están en assets/iconify/ (corre `deno task icons`):\n  ' +
      faltan.slice(0, 20).map(([k, sitios]) => `${k} (${sitios.slice(0, 2).join(', ')}${sitios.length > 2 ? '…' : ''})`).join('\n  '),
  );

  console.log(`icon-references.test.ts: PASS — ${refs.size} íconos de los demos en assets/iconify`);
});

export default lista();

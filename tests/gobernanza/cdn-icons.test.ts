// tests/gobernanza/cdn-icons.test.ts
//
// <iswc-icon> resuelve los íconos de los demos desde la carpeta PUBLICADA (`assets/iconify/`, la que
// sirve jsDelivr por `<html data-icons>`), sin caer a la API de Iconify. Protege contra:
//   - un demo con íconos que `deno task icons` no bajó (el barrido no los vio);
//   - un bug en icon-loader que rompa la cadena local (base mal armada, ruta `<set>/<nombre>.svg`);
//   - un SVG publicado vacío o sin `<svg`.
//
// Sin servidor (antes pedía `scripts/serve.mjs 8391`): `fetch` se intercepta y la base de
// `<html data-icons>` se sirve desde el disco; cualquier petición a la API es un fallo.
//
// Uso:  deno task test -- --solo=cdn-icons

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

/** Host ficticio de `<html data-icons>`: lo que cuelga de él se lee de assets/iconify. */
const BASE = 'https://cdn.example.test/gh/kit@sha/assets/iconify/';

test('gobernanza/cdn-icons', async () => {
  const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const carpeta = join(root, 'assets', 'iconify');
  const ICON_RE = /<iswc-icon\b[^>]*\bicon\s*=\s*["']([a-z0-9-]+):([a-z0-9-]+)["']/gi;

  async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(p));
      // Previews JSON (iswc-preview/v1): el markup de los demos viaja en strings HTML dentro del JSON.
      else if (e.isFile() && e.name.endsWith('.json')) out.push(p);
    }
    return out;
  }

  // El preview de componentes con más íconos distintos.
  let elegido = { f: '', ids: [] as string[] };
  for (const f of await walk(join(root, 'src', 'components'))) {
    const body = (await readFile(f, 'utf8')).replace(/\\"/g, '"');
    const ids = new Set<string>();
    ICON_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ICON_RE.exec(body)) !== null) ids.add(`${m[1]}:${m[2]}`);
    if (ids.size > elegido.ids.length) elegido = { f, ids: [...ids] };
  }
  assert.ok(elegido.ids.length >= 2, 'ningún preview de src/components tiene 2+ íconos para probar');
  const refs = elegido.ids.slice(0, 12);
  console.log(`preview elegido: ${elegido.f.slice(root.length + 1).replace(/\\/g, '/')} (${elegido.ids.length} íconos, se prueban ${refs.length})`);

  const loader = await import(new URL('../../src/core/icon-loader.ts', import.meta.url).href);
  const fetchOriginal = globalThis.fetch;
  const warnOriginal = console.warn;
  const docOriginal = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const pedidos: string[] = [];
  const avisos: string[] = [];
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    pedidos.push(u);
    if (!u.startsWith(BASE)) return new Response('fuera de la base', { status: 599 });
    const ruta = join(carpeta, ...decodeURIComponent(u.slice(BASE.length)).split('/'));
    if (!existsSync(ruta)) return new Response('no', { status: 404 });
    return new Response(await readFile(ruta, 'utf8'), { status: 200, headers: { 'content-type': 'image/svg+xml' } });
  }) as typeof fetch;
  console.warn = (...a: unknown[]) => { avisos.push(a.join(' ')); };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: { dataset: { icons: BASE } } },
  });
  try {
    loader.clearRawCache();
    loader.clearPersistedIcons();
    assert.equal(loader.resolveIconBase(), BASE, '<html data-icons> debe ser la base local');
    const fallos: string[] = [];
    for (const id of refs) {
      const [prefix, name] = id.split(':');
      const svg = await loader.resolveIconRaw(prefix, name);
      if (!svg || !svg.includes('<svg')) fallos.push(`${id}: sin SVG`);
    }
    const fuera = pedidos.filter((u) => !u.startsWith(BASE));
    assert.deepEqual(fallos, [], `íconos que no resolvieron desde assets/iconify:\n  ${fallos.join('\n  ')}`);
    assert.deepEqual(fuera, [], `peticiones fuera de la carpeta publicada (cayeron a la API):\n  ${fuera.join('\n  ')}`);
    assert.equal(avisos.filter((a) => a.includes(loader.AVISO_FALTA_LOCAL)).length, 0, `avisos de «falta en local»: ${avisos.join(' | ')}`);
    assert.equal(pedidos.length, refs.length, 'un fetch por ícono, a la carpeta publicada');
  } finally {
    globalThis.fetch = fetchOriginal;
    console.warn = warnOriginal;
    if (docOriginal) Object.defineProperty(globalThis, 'document', docOriginal);
    else delete (globalThis as { document?: unknown }).document;
    loader.clearRawCache();
    loader.clearPersistedIcons();
  }

  console.log(`cdn-icons.test.ts: PASS — ${refs.length} íconos servidos desde assets/iconify (sin API)`);
});

export default lista();

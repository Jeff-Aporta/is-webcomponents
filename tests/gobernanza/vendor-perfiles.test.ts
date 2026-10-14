/**
 * Guardián WHAT de los perfiles de `src/vendor-distributions/` (shared / server / client): un proyecto server
 * nunca tiene que instalar herramientas de navegador para vendorizar lo que usa.
 *   P1 ningún módulo de `shared/` ni de `server/` importa dependencias de navegador (playwright, stagehand,
 *      puppeteer, chromium…) ni usa globales de navegador (`document`, `window`, `navigator`…).
 *   P2 `shared/` solo importa de `shared/`; `server/` de `shared/` y `server/`; `client/` de `shared/` y
 *      `client/` (nunca server ↔ client), y ningún relativo sale de `vendor-distributions/`.
 *   P3 cada archivo vive en exactamente un perfil (nada suelto en la raíz salvo el README índice, ni carpetas
 *      planas anteriores) y ningún nombre se repite entre perfiles (los consumidores aplanan en `ISU/`).
 *   P4 el vendor resuelto de un consumidor `server` (todo `shared/` + `server/` y sus imports transitivos) no
 *      alcanza ningún archivo `client/` ni ninguna dependencia de navegador.
 *   P5 `perfilDeRuta` (lo que usa `vendor.ts` para filtrar) coincide con la carpeta de cada archivo.
 *   P6 COMPAT TEMPORAL: lo que queda en las rutas planas anteriores (`lib/`, `testing/`, `tools/`, `index.ts`)
 *      es solo reexport (`export * from` / `import`) marcado `@deprecated <fecha>`, apunta a un archivo que
 *      existe y ningún módulo de un perfil lo importa. Se borra cuando ISS e ISW migren.
 * Las reglas (paquetes de navegador, perfil de una ruta) se importan de `shared/tools/vendor.ts`: el guardián y la
 * herramienta comparten definición.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { dependenciasDeNavegador, perfilDeRuta } from '../../src/vendor-distributions/shared/tools/vendor.ts';
import { PERFILES } from '../../src/vendor-distributions/shared/schemas.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


const SRC = 'src/vendor-distributions';

function listar(dir: string, base = dir, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listar(p, base, out);
    else out.push(relative(base, p).replaceAll('\\', '/'));
  }
  return out;
}
const archivos = listar(SRC);
const codigo = archivos.filter((f) => /\.(m?[jt]s)$/.test(f));
const perfil = (f: string): string => f.split('/')[0]!;
const texto = (f: string): string => readFileSync(join(SRC, f), 'utf8');
const sinComentarios = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Relativos que importa `f`, resueltos a rutas dentro de `vendor-distributions/` (`.js` ↔ `.ts`). */
function relativos(f: string): { spec: string; destino: string | null }[] {
  const out: { spec: string; destino: string | null }[] = [];
  for (const m of sinComentarios(texto(f)).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.\.?\/[^"']+)["']/g)) {
    const r = posix.normalize(posix.join(posix.dirname(f), m[1]!));
    const alternas = [r, r.replace(/\.js$/, '.ts'), r.replace(/\.ts$/, '.js'), r.replace(/\.mjs$/, '.mts')];
    const destino = r.startsWith('..') ? null : alternas.find((a) => existsSync(join(SRC, a))) ?? null;
    out.push({ spec: m[1]!, destino });
  }
  return out;
}

/** Compat temporal: fuera de los perfiles, `@deprecated <fecha>` y sin más código que reexports. */
const esCompat = (f: string): boolean =>
  !(PERFILES as readonly string[]).includes(perfil(f)) && /\.(m?[jt]s)$/.test(f) &&
  /@deprecated \d{4}-\d\d-\d\d/.test(texto(f)) &&
  sinComentarios(texto(f)).split('\n').every((l) => !l.trim() || /^(export \* from|import) '\.\.?\/[^']+';$/.test(l.trim()));

const GLOBALES = /\b(?:document|window|navigator|customElements|localStorage|sessionStorage)\s*[.[]/;

denoTest('vendor-perfiles: P1 shared/ y server/ sin dependencias ni globales de navegador', () => {
  const sinNavegador = codigo.filter((f) => perfil(f) === 'shared' || perfil(f) === 'server');
  // 2026-10-13: los `*.schemas.ts` se fundieron en `shared/schemas.ts` y test-queue/pruebas-hijo en sus módulos.
  assert(sinNavegador.length >= 10, `muy pocos módulos shared/server: ${sinNavegador.length}`);
  const malos: string[] = [];
  for (const f of sinNavegador) {
    const deps = dependenciasDeNavegador(texto(f));
    if (deps.length) malos.push(`${f}: importa ${deps.join(', ')}`);
    const g = sinComentarios(texto(f)).match(GLOBALES);
    if (g) malos.push(`${f}: usa ${g[0]} (global de navegador)`);
  }
  assertEquals(malos, [], `mueve a client/ o quita la dependencia:\n${malos.join('\n')}`);
});

denoTest('vendor-perfiles: P2 shared solo importa shared; server y client nunca se cruzan', () => {
  const admite: Record<string, string[]> = { shared: ['shared'], server: ['shared', 'server'], client: ['shared', 'client'] };
  const malos: string[] = [];
  for (const f of codigo.filter((x) => !esCompat(x))) {
    const p = perfil(f);
    for (const { spec, destino } of relativos(f)) {
      if (!destino) { malos.push(`${f}: «${spec}» sale de vendor-distributions o no existe`); continue; }
      if (!(admite[p] ?? []).includes(perfil(destino))) malos.push(`${f} (${p}) importa ${destino} (${perfil(destino)})`);
    }
  }
  assertEquals(malos, [], malos.join('\n'));
});

denoTest('vendor-perfiles: P3 cada archivo en exactamente un perfil, sin nombres repetidos entre perfiles', () => {
  const sueltos = archivos.filter((f) => f !== 'README.md' && !esCompat(f) && !(PERFILES as readonly string[]).includes(perfil(f)));
  assertEquals(sueltos, [], `fuera de shared/|server/|client/: ${sueltos.join(', ')}`);
  // Los barrels (`index.ts`) y los README no se aplanan; el resto sí, así que su nombre es único.
  const porNombre = new Map<string, string[]>();
  for (const f of archivos.filter((x) => !esCompat(x))) {
    const n = f.split('/').pop()!;
    if (n === 'index.ts' || n === 'README.md') continue;
    porNombre.set(n, [...(porNombre.get(n) ?? []), f]);
  }
  const repetidos = [...porNombre.values()].filter((v) => v.length > 1).map((v) => v.join(' = '));
  assertEquals(repetidos, [], `el mismo módulo en dos lugares:\n${repetidos.join('\n')}`);
});

denoTest('vendor-perfiles: P4 el vendor resuelto de un server no alcanza client/ ni navegador', () => {
  const pendientes = codigo.filter((f) => perfil(f) === 'shared' || perfil(f) === 'server');
  const vistos = new Set<string>();
  const malos: string[] = [];
  while (pendientes.length) {
    const f = pendientes.pop()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    if (perfil(f) === 'client') { malos.push(`${f} entra al vendor server`); continue; }
    const deps = dependenciasDeNavegador(texto(f));
    if (deps.length) malos.push(`${f}: ${deps.join(', ')}`);
    for (const { destino } of relativos(f)) if (destino && !vistos.has(destino)) pendientes.push(destino);
  }
  assert(vistos.size >= 10, `resolución sospechosamente corta: ${vistos.size}`);
  assertEquals(malos, [], malos.join('\n'));
});

denoTest('vendor-perfiles: P5 perfilDeRuta coincide con la carpeta de cada archivo', () => {
  const malos = archivos
    .filter((f) => f !== 'README.md' && !esCompat(f))
    .filter((f) => perfilDeRuta(`dist/cdn/vendor-distributions/${f}`) !== perfil(f))
    .map((f) => `${f}: ${perfilDeRuta(`dist/cdn/vendor-distributions/${f}`)}`);
  assertEquals(malos, [], malos.join('\n'));
  assertEquals(perfilDeRuta('dist/cdn/vendor-distributions/testing/jueces.ts'), 'sin-perfil', 'ruta plana anterior');
  assertEquals(perfilDeRuta('dist/cdn/build/bundle-min.ts'), null, 'fuera de vendor-distributions');
  assertEquals(perfilDeRuta('dist/cdn/vendor-distributions/server/x.ts'), 'server', 'server/ es perfil aunque hoy no exista la carpeta');
  assert(dirname(SRC) === 'src');
});

denoTest('vendor-perfiles: P6 la compat temporal es solo reexport @deprecated y ningún perfil la usa', () => {
  const compat = codigo.filter((f) => !(PERFILES as readonly string[]).includes(perfil(f)));
  const malos: string[] = [];
  for (const f of compat) {
    if (!esCompat(f)) { malos.push(`${f}: no es un reexport puro marcado @deprecated <fecha>`); continue; }
    for (const { spec, destino } of relativos(f)) {
      if (!destino || !(PERFILES as readonly string[]).includes(perfil(destino))) malos.push(`${f}: «${spec}» no apunta a un perfil`);
    }
  }
  for (const f of codigo.filter((x) => (PERFILES as readonly string[]).includes(perfil(x)))) {
    for (const { destino } of relativos(f)) if (destino && compat.includes(destino)) malos.push(`${f} importa la compat ${destino}`);
  }
  assertEquals(malos, [], malos.join('\n'));
});

export default lista();

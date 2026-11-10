// @contexto INDICE.md · tests/gobernanza/README.md
// nomenclatura.test.ts — guardián del nombre único del kit: `iswc-base` (specs/plan-carga-modular.md §D11, fase F1b;
// specs/adr.md «ADR nomenclatura iswc-base, 2026-11-04»; regla en specs/constitution.md).
//   N1 ninguna aparición de `iswc-root` (nombre de un repo que nunca existió en GitHub) en el repo. Excepciones: los
//      archivos de `EXCEPCIONES` del codemod (este test, specs/lessons.md, specs/adr.md, el mapa ALIAS de pin-update y
//      su prueba, las llaves de storage en producción que se migran en código y las migraciones históricas) y las
//      listas de alias que enumeran los nombres del repo como alternativa (`iswc-base|is-webcomponents|iswc-root`).
//   N2 ninguna `wc-base`/`wc-root` suelta (fuera de `iswc-base`).
//   N3 `is-webcomponents` (nombre REAL del repo en GitHub hasta el rename) solo en el hueco del repo de una URL o slug
//      (`Jeff-Aporta/is-webcomponents`, `jeff-aporta.github.io/is-webcomponents`, `is-webcomponents@<ref>`), en un
//      campo `repo`, en una línea que declara `REPO_GITHUB` o en las mismas excepciones/listas de alias.
//   N4 lo publicado (`dist/cdn/**/*.js` y `dist/cdn/skills/**`) tampoco contiene `iswc-root`, salvo la entrada
//      `"iswc-root":"root"` del mapa de migración de `iswc-storage` (llave en producción, inlineada en los bundles) y
//      las listas de alias.
//   N5 `REPO_GITHUB` = `Jeff-Aporta/is-webcomponents` y `NOMBRE_KIT` = `iswc-base` en src/core/cdn-ref.ts; la skill
//      general vive en `skills/iswc-base/`.
//   N6 el codemod corre sobre un consumidor con `--raiz=<ruta>` (F5): reescribe su texto (el `candidato` de `reuso`
//      queda en `iswc-base`, que es lo único que acepta el schema), mueve `src/vendor/iswc-root/` a
//      `src/vendor/iswc-base/` y no reescribe el texto de lo vendorizado (copias del kit).
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';
import { listar } from '../../scripts/codemods/nomenclatura-iswc-base.mjs';
import { NOMBRE_KIT, REPO_GITHUB } from '../../src/core/cdn-ref.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);

const KIT = join(import.meta.dirname!, '..', '..');
/** Lista de alias: dos o más nombres del repo separados por `|` (regex) — se quita antes de buscar. */
const ALTERNATIVA = /(?:iswc-base|is-webcomponents|iswc-root)(?:\|(?:iswc-base|is-webcomponents|iswc-root))+/g;
/** Lista `NOMBRES_REPO` del mapa ALIAS de pin-update (viaja inlineada en los bundles online). */
const LISTA_ALIAS = /NOMBRES_REPO\s*=\s*\[[^\]]*\]/g;
/** Usos legítimos de `is-webcomponents`: hueco del repo (también escapado en una regex), `@ref` y campo `repo`. */
const REPO_EN_URL = [
  /(?:jeff-aporta\\?\/|jeff-aporta\\?\.github\\?\.io\\?\/)is-webcomponents/gi,
  /is-webcomponents(?=@)/g,
  /\brepo["']?\s*[:=]\s*["']is-webcomponents/g,
];

/** Llave de storage en producción que `iswc-storage` migra a `iswc:root` (viaja inlineada en los bundles). */
const LLAVE_LEGADA = /["']iswc-root["']\s*:\s*["']root["']/g;

const barras = (ruta: string) => ruta.replaceAll('\\', '/');

function esTexto(buf: Uint8Array): boolean {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
  return true;
}

/** Líneas `archivo:línea: texto` (recortado) donde `buscar` aparece tras quitar los usos permitidos. */
function hallazgos(archivos: string[], buscar: RegExp, permitidos: RegExp[] = [], lineaPermitida = (_: string) => false): string[] {
  const out: string[] = [];
  for (const archivo of archivos) {
    const buf = readFileSync(archivo);
    if (!esTexto(buf)) continue;
    const texto = new TextDecoder().decode(buf);
    if (!buscar.test(texto)) continue;
    texto.split('\n').forEach((linea, i) => {
      if (lineaPermitida(linea)) return;
      let limpia = linea.replace(ALTERNATIVA, '').replace(LISTA_ALIAS, '');
      for (const re of permitidos) limpia = limpia.replace(re, '');
      if (buscar.test(limpia)) out.push(`${barras(relative(KIT, archivo))}:${i + 1}: ${linea.trim().slice(0, 140)}`);
    });
  }
  return out;
}

function arbol(dir: string, re: RegExp, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) arbol(p, re, out);
    else if (re.test(n)) out.push(p);
  }
  return out;
}

const ARCHIVOS = listar(KIT);

denoTest('nomenclatura: N1 ninguna aparición de iswc-root fuera de las excepciones', () => {
  const malos = hallazgos(ARCHIVOS, /iswc-root/);
  assertEquals(malos, [], `iswc-root (correr scripts/codemods/nomenclatura-iswc-base.mjs):\n  ${malos.join('\n  ')}`);
});

denoTest('nomenclatura: N2 ninguna wc-base/wc-root suelta', () => {
  const malos = hallazgos(ARCHIVOS, /\bwc-(?:base|root)\b/);
  assertEquals(malos, [], `wc-base/wc-root sueltas:\n  ${malos.join('\n  ')}`);
});

denoTest('nomenclatura: N3 is-webcomponents solo en URLs del repo, REPO_GITHUB o ALIAS', () => {
  const malos = hallazgos(ARCHIVOS, /is-webcomponents/, REPO_EN_URL, (l) => l.includes('REPO_GITHUB'));
  assertEquals(malos, [], `is-webcomponents fuera de una URL del repo (→ iswc-base):\n  ${malos.join('\n  ')}`);
});

denoTest('nomenclatura: N4 dist/cdn (js y skills) sin iswc-root', () => {
  const cdn = join(KIT, 'dist', 'cdn');
  const publicados = [...arbol(cdn, /\.js$/), ...arbol(join(cdn, 'skills'), /./)];
  assert(publicados.length > 0, 'dist/cdn vacío: correr deno task build');
  const malos = hallazgos([...new Set(publicados)], /iswc-root/, [LLAVE_LEGADA]);
  assertEquals(malos, [], `iswc-root en lo publicado:\n  ${malos.join('\n  ')}`);
  assert(!existsSync(join(cdn, 'skills', 'iswc-root')), 'dist/cdn/skills/iswc-root no debe existir');
});

denoTest('nomenclatura: N5 constantes del repo y carpeta de la skill general', () => {
  assertEquals(REPO_GITHUB, 'Jeff-Aporta/is-webcomponents');
  assertEquals(NOMBRE_KIT, 'iswc-base');
  assert(existsSync(join(KIT, 'skills', 'iswc-base', 'SKILL.md')), 'falta skills/iswc-base/SKILL.md');
  assert(!existsSync(join(KIT, 'skills', 'iswc-root')), 'skills/iswc-root no debe existir');
});

denoTest('nomenclatura: N6 el codemod con --raiz barre un consumidor (texto propio sí, vendor solo se mueve)', () => {
  const app = Deno.makeTempDirSync({ prefix: 'nomenclatura-app-' });
  const escribir = (rel: string, texto: string) => {
    mkdirSync(dirname(join(app, rel)), { recursive: true });
    writeFileSync(join(app, rel), texto);
  };
  const reuso = '{ "reuso": { "candidato": "iswc-root", "motivo": "Paginador genérico sin dominio" } }\n';
  const vendorizado = "const NOMBRES = ['iswc-root'];\n";
  escribir('view/demo/x.json', reuso);
  escribir('src/vendor/iswc-root/tools/x.mjs', vendorizado);
  const r = new Deno.Command(Deno.execPath(), {
    args: ['run', '-A', join(KIT, 'scripts', 'codemods', 'nomenclatura-iswc-base.mjs'), `--raiz=${app}`],
    stdout: 'piped', stderr: 'piped',
  }).outputSync();
  const salida = new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr);
  assertEquals(r.code, 0, salida);
  assertEquals(readFileSync(join(app, 'view/demo/x.json'), 'utf8'), reuso.replace('iswc-root', 'iswc-base'));
  assert(!existsSync(join(app, 'src/vendor/iswc-root')), salida);
  assertEquals(readFileSync(join(app, 'src/vendor/iswc-base/tools/x.mjs'), 'utf8'), vendorizado, 'lo vendorizado no se reescribe');
  const otra = new Deno.Command(Deno.execPath(), {
    args: ['run', '-A', join(KIT, 'scripts', 'codemods', 'nomenclatura-iswc-base.mjs'), `--raiz=${app}`, '--dry-run'],
    stdout: 'piped',
  }).outputSync();
  assert(new TextDecoder().decode(otra.stdout).includes('0 menciones en 0 archivos; 0 rutas movidas'), 'idempotente');
});

function codemodEn(app: string): string {
  const r = new Deno.Command(Deno.execPath(), {
    args: ['run', '-A', join(KIT, 'scripts', 'codemods', 'nomenclatura-iswc-base.mjs'), `--raiz=${app}`],
    stdout: 'piped', stderr: 'piped',
  }).outputSync();
  const salida = new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr);
  assertEquals(r.code, 0, salida);
  return salida;
}

denoTest('nomenclatura: N7 los literales de regex del código no se reescriben (cadenas y prosa sí)', () => {
  const app = Deno.makeTempDirSync({ prefix: 'nomenclatura-regex-' });
  mkdirSync(join(app, 'src'), { recursive: true });
  const antes = [
    'const re = /iswc-root\\/dist/g;',
    'const r2 = x.replace(/Jeff-Aporta\\/is-webcomponents/i, "");',
    "const t = 'iswc-root'; const m = a / b; // iswc-root",
    'if (/[/]iswc-root/.test(s)) run();',
    '',
  ].join('\n');
  writeFileSync(join(app, 'src', 'a.mjs'), antes);
  writeFileSync(join(app, 'src', 'nota.md'), 'ver /iswc-root/ y /is-webcomponents/x\n');
  codemodEn(app);
  assertEquals(readFileSync(join(app, 'src', 'a.mjs'), 'utf8'), [
    'const re = /iswc-root\\/dist/g;',
    'const r2 = x.replace(/Jeff-Aporta\\/is-webcomponents/i, "");',
    "const t = 'iswc-base'; const m = a / b; // iswc-base",
    'if (/[/]iswc-root/.test(s)) run();',
    '',
  ].join('\n'));
  assertEquals(readFileSync(join(app, 'src', 'nota.md'), 'utf8'), 'ver /iswc-base/ y /iswc-base/x\n', 'fuera del código no hay regex');
});

denoTest('nomenclatura: N8 en un consumidor scripts/**/*.mjs se barre (también scripts/vendor/), el resto de vendor/ no', () => {
  const app = Deno.makeTempDirSync({ prefix: 'nomenclatura-scripts-' });
  const escribir = (rel: string, texto: string) => {
    mkdirSync(dirname(join(app, rel)), { recursive: true });
    writeFileSync(join(app, rel), texto);
  };
  const viejo = "const REPO = 'is-webcomponents'; const L = 'iswc-root';\n";
  escribir('scripts/vendor/vendor-iswc-tools.mjs', viejo);
  escribir('scripts/otro.mjs', viejo);
  escribir('scripts/vendor/copia.json', viejo);
  escribir('src/vendor/x.mjs', viejo);
  codemodEn(app);
  const nuevo = "const REPO = 'iswc-base'; const L = 'iswc-base';\n";
  assertEquals(readFileSync(join(app, 'scripts/vendor/vendor-iswc-tools.mjs'), 'utf8'), nuevo);
  assertEquals(readFileSync(join(app, 'scripts/otro.mjs'), 'utf8'), nuevo);
  assertEquals(readFileSync(join(app, 'scripts/vendor/copia.json'), 'utf8'), viejo, 'solo los .mjs de scripts/');
  assertEquals(readFileSync(join(app, 'src/vendor/x.mjs'), 'utf8'), viejo, 'lo vendorizado no se reescribe');
});

export default lista();

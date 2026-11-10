// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * aplanar-codemod.test.ts — `scripts/codemods/aplanar.mjs` (F9a, B1) sobre un repo temporal.
 *
 *   A1 `--dry` no escribe nada y anuncia los destinos (código y schemas).
 *   A2 la fusión: un solo archivo con los imports arriba (uno por módulo, sin el import entre partes), la sección
 *      `// ── b ──`, schemas 1:1, y el módulo que cambia de carpeta (`core/json-html` → `isp/utils/isp-json`).
 *   A3 reescribe consumidores: alias, relativos de tests, rutas en cadenas, md y `dist/cdn/<x>.min.mjs`; el mapa no.
 *   A4 idempotente: la segunda corrida no hace nada.
 *   A5 si dos partes declaran el mismo nombre, se detiene sin escribir y lo reporta.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const CODEMOD = join(RAIZ, 'scripts', 'codemods', 'aplanar.mjs');

const ARCHIVOS: Record<string, string> = {
  'src/core/a.ts': "/**\n * a.ts — parte A.\n */\nimport type { TipoA } from './schemas/a.schemas.js';\nimport { helperB } from './b.js';\nimport { z } from 'zod';\n\n/** Doble de A. */\nexport function dobleA(x: TipoA): number {\n  return helperB(x) * 2 + z.number().parse(0);\n}\n",
  'src/core/b.ts': "// b.ts — parte B.\nimport { z } from 'zod';\nimport { otra } from '@jeff-aporta/iswc-base/core/c.js';\n\nexport function helperB(x: number): number {\n  return otra(x) + z.number().parse(1);\n}\n",
  'src/core/c.ts': 'export function otra(x: number): number {\n  return x;\n}\n',
  'src/core/json-html.ts': "import { otra } from './c.js';\n\nexport const jh = otra(1);\n",
  'src/core/schemas/a.schemas.ts': 'export type TipoA = number;\n',
  'src/core/schemas/b.schemas.ts': 'export type TipoB = string;\n',
  'src/components/isp/utils/form.ts': "import { dobleA } from '@jeff-aporta/iswc-base/core/a.js';\nimport { helperB } from '@jeff-aporta/iswc-base/core/b.js';\nimport { jh } from '@jeff-aporta/iswc-base/core/json-html.js';\nexport const r = dobleA(helperB(jh));\n",
  'tests/a.test.ts': "import { dobleA } from '../src/core/a.ts';\nconst ruta = 'src/core/b.ts';\nexport default [dobleA, ruta];\n",
  'README.md': '# Doc\nVer `core/a`, `src/core/b.ts` y `dist/cdn/core/b.min.mjs`.\n',
  'scripts/codemods/aplanar-prueba.json': JSON.stringify({ 'core/a': 'core/ab', 'core/b': 'core/ab', 'core/json-html': 'components/isp/utils/isp-json' }),
};

function repo(extra: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'aplanar-'));
  for (const [r, t] of Object.entries({ ...ARCHIVOS, ...extra })) {
    mkdirSync(dirname(join(dir, r)), { recursive: true });
    writeFileSync(join(dir, r), t);
  }
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  return dir;
}

function correr(dir: string, ...args: string[]) {
  const r = spawnSync(Deno.execPath(), ['run', '-A', CODEMOD, join(dir, 'scripts', 'codemods', 'aplanar-prueba.json'), `--raiz=${dir}`, ...args], { cwd: RAIZ, encoding: 'utf8' });
  return { codigo: r.status, salida: `${r.stdout}${r.stderr}` };
}

const leer = (dir: string, r: string) => readFileSync(join(dir, r), 'utf8');

test('gobernanza/aplanar-codemod: A1 --dry no escribe y anuncia destinos', () => {
  const dir = repo();
  try {
    const { codigo, salida } = correr(dir, '--dry');
    assert.equal(codigo, 0, salida);
    assert.match(salida, /\[dry\] src\/core\/ab\.ts ← a\.ts \+ b\.ts/);
    assert.match(salida, /\[dry\] src\/core\/schemas\/ab\.schemas\.ts ← a\.schemas\.ts \+ b\.schemas\.ts/);
    assert.match(salida, /\[dry\] src\/components\/isp\/utils\/isp-json\.ts ← json-html\.ts/);
    assert.ok(existsSync(join(dir, 'src/core/a.ts')) && !existsSync(join(dir, 'src/core/ab.ts')), 'dry no mueve');
    assert.equal(leer(dir, 'README.md'), ARCHIVOS['README.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gobernanza/aplanar-codemod: A2–A4 fusiona, reescribe consumidores y es idempotente', () => {
  const dir = repo();
  try {
    const { codigo, salida } = correr(dir);
    assert.equal(codigo, 0, salida);
    const ab = leer(dir, 'src/core/ab.ts');
    assert.ok(!existsSync(join(dir, 'src/core/a.ts')) && !existsSync(join(dir, 'src/core/b.ts')));
    assert.match(ab, /^\/\*\*\n \* a\.ts — parte A\./);
    assert.equal((ab.match(/from 'zod'/g) ?? []).length, 1, 'zod una vez');
    assert.ok(!/from '\.\/b\.js'|from '\.\/ab\.js'/.test(ab), 'sin import entre partes');
    assert.match(ab, /import type \{ TipoA \} from '\.\/schemas\/ab\.schemas\.js';/);
    assert.match(ab, /\n\/\/ ── b ──\n\/\/ b\.ts — parte B\.\nexport function helperB/);
    assert.match(leer(dir, 'src/core/schemas/ab.schemas.ts'), /TipoA[\s\S]*TipoB/);
    assert.match(leer(dir, 'src/components/isp/utils/isp-json.ts'), /from '@jeff-aporta\/iswc-base\/core\/c\.js'/, 'relativo que sale de carpeta → alias');
    const form = leer(dir, 'src/components/isp/utils/form.ts');
    assert.match(form, /import \{ dobleA, helperB \} from '@jeff-aporta\/iswc-base\/core\/ab\.js';/);
    assert.match(form, /from '@jeff-aporta\/iswc-base\/components\/isp\/utils\/isp-json\.js'/);
    assert.equal(leer(dir, 'tests/a.test.ts'), "import { dobleA } from '../src/core/ab.ts';\nconst ruta = 'src/core/ab.ts';\nexport default [dobleA, ruta];\n");
    assert.equal(leer(dir, 'README.md'), '# Doc\nVer `core/ab`, `src/core/ab.ts` y `dist/cdn/core/ab.min.mjs`.\n');
    assert.equal(leer(dir, 'scripts/codemods/aplanar-prueba.json'), ARCHIVOS['scripts/codemods/aplanar-prueba.json'], 'el mapa no se reescribe');
    const otra = correr(dir);
    assert.equal(otra.codigo, 0, otra.salida);
    assert.match(otra.salida, /nada que hacer \(3 claves ya aplicadas\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gobernanza/aplanar-codemod: A5 una colisión de nombres detiene todo sin escribir', () => {
  const dir = repo({ 'src/core/b.ts': "export function dobleA(): number {\n  return 1;\n}\nexport function helperB(x: number): number {\n  return x;\n}\n" });
  try {
    const { codigo, salida } = correr(dir);
    assert.equal(codigo, 1, salida);
    assert.match(salida, /colisiones en src\/core\/ab\.ts:\n\s+dobleA: src\/core\/a\.ts y src\/core\/b\.ts/);
    assert.ok(existsSync(join(dir, 'src/core/a.ts')) && !existsSync(join(dir, 'src/core/ab.ts')));
    assert.equal(leer(dir, 'README.md'), ARCHIVOS['README.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

export default lista();

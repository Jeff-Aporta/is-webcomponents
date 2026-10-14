// cooldown-guardian.test.ts — guardián (spec: specs/testing.md S-T7): TODA prueba del kit corre dentro del sistema de
// cooldown (`src/vendor-distributions/shared/testing/test-cooldown.ts`, vía `deno-test.ts` o `pruebas.ts`).
//   C1 cada tarea `test*` de deno.json es composición de otras tareas o lanza un runner que entra al cooldown;
//      ninguna corre `deno test` directo.
//   C2 ningún script del kit lanza un runner de pruebas (`deno test`, `node --test`) sin pasar por el cooldown.
//   C3 caja negra del runner estándar (`denoTest`): un archivo verde entra en cooldown y la siguiente corrida lo
//      salta; uno rojo no entra y vuelve a correr; sin cooldown (`disabled`) corre todo y no registra nada.
//   C4 rojo a la primera se reintenta de a uno: intermitente → verde con cooldown; persistente → rojo (until -1).
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { denoTest } from '../../../vendor-distributions/shared/testing/deno-test.ts';
import { createTestCooldown, testId } from '../../../vendor-distributions/shared/testing/test-cooldown.ts';

const KIT = join(import.meta.dirname!, '..', '..', '..', '..');
const ESTE = relative(KIT, import.meta.filename!).replaceAll('\\', '/');
/** Módulos del sistema de cooldown: importar cualquiera de ellos es "entrar al cooldown". */
const COOLDOWN = /from\s+['"][^'"]*\/(?:deno-test|test-cooldown|pruebas)\.(?:ts|js|mjs)['"]/;
/** Lanzar un runner de pruebas: `deno test …` en un string, `['test', …]` como argumentos de un spawn, `node --test`. */
const LANZA_PRUEBAS = /['"`]deno test\b|\[\s*['"]test['"]\s*,|['"]--test['"]/;
const RAICES = ['src', 'scripts', 'skills', 'demos', 'labs'];
const SALTAR = new Set(['node_modules', 'dist', 'vendor']);

function sinComentarios(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

function archivos(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (!SALTAR.has(n) && !n.startsWith('.')) archivos(p, out); continue; }
    if (/\.(ts|mts|mjs|js)$/.test(n) && !/\.test\.(ts|mjs|js)$/.test(n) && !n.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

Deno.test('cooldown: C1 cada tarea test* de deno.json es composición o un runner que entra al cooldown', () => {
  const tareas: Record<string, string> = JSON.parse(readFileSync(join(KIT, 'deno.json'), 'utf8')).tasks;
  const malas: string[] = [];
  for (const [nombre, comando] of Object.entries(tareas)) {
    if (!/^test(?::|$)/.test(nombre)) continue;
    for (const parte of comando.split(/&&|\|\||;/).map((s) => s.trim()).filter(Boolean)) {
      const tarea = parte.match(/^deno task ([\w:-]+)/)?.[1];
      if (tarea) {
        if (!(tarea in tareas)) malas.push(`${nombre}: compone una tarea inexistente (${tarea})`);
        continue;
      }
      if (/^deno test\b/.test(parte)) { malas.push(`${nombre}: corre deno test directo (${parte})`); continue; }
      const script = parte.match(/^deno run\b.*?\s([\w./-]+\.(?:ts|mjs|js))\b/)?.[1];
      if (!script) { malas.push(`${nombre}: no se reconoce el runner de «${parte}»`); continue; }
      const ruta = join(KIT, script);
      if (!existsSync(ruta)) { malas.push(`${nombre}: ${script} no existe`); continue; }
      if (!COOLDOWN.test(readFileSync(ruta, 'utf8'))) malas.push(`${nombre}: ${script} no entra al cooldown`);
    }
  }
  assertEquals(malas, []);
});

Deno.test('cooldown: C2 ningún script lanza pruebas sin pasar por el cooldown', () => {
  const malos: string[] = [];
  for (const r of RAICES) {
    for (const p of archivos(join(KIT, r))) {
      const rel = relative(KIT, p).replaceAll('\\', '/');
      if (rel === ESTE) continue;
      const codigo = readFileSync(p, 'utf8');
      if (LANZA_PRUEBAS.test(sinComentarios(codigo)) && !COOLDOWN.test(codigo) && !rel.endsWith('shared/testing/deno-test.ts')) malos.push(rel);
    }
  }
  assertEquals(malos, [], `lanzan pruebas por fuera del cooldown (usar denoTest/runQueue+cooldown):\n${malos.join('\n')}`);
});

// C3 Casos del runner estándar, como datos: cada archivo, si corre en cada una de las dos corridas.
const C3 = [
  { caso: 'con cooldown', deshabilitado: false, corridas: { verde: [true, false], rojo: [true, true] }, registra: true },
  { caso: 'sin cooldown', deshabilitado: true, corridas: { verde: [true, true], rojo: [true, true] }, registra: false },
] as const;

for (const c of C3) {
  Deno.test({
    name: `cooldown: C3 denoTest ${c.caso}: verde ${c.corridas.verde.join('/')} · rojo ${c.corridas.rojo.join('/')}`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      // Dentro del kit (.tmp/ está en .gitignore): el id de cooldown es la ruta relativa al cwd.
      const dir = join(KIT, '.tmp', `cooldown-guardian-${Deno.pid}-${c.deshabilitado ? 'off' : 'on'}`);
      mkdirSync(dir, { recursive: true });
      try {
        const contador = join(dir, 'corridas.txt');
        const escribir = (nombre: string, cuerpo: string) => {
          const f = join(dir, `${nombre}.test.ts`);
          writeFileSync(f, `Deno.test('${nombre}', async () => {\n  Deno.writeTextFileSync(${JSON.stringify(contador)}, '${nombre}\\n', { append: true });\n${cuerpo}\n});\n`);
          return f;
        };
        // El verde dura >= 50 ms: su cooldown (× 1440) supera de sobra la duración de esta prueba.
        const verde = escribir('verde', '  await new Promise((r) => setTimeout(r, 60));');
        const rojo = escribir('rojo-a-proposito', "  throw new Error('rojo a propósito (cooldown-guardian C3)');");
        const db = join(dir, 'cooldown.json');
        const corridas: { verde: boolean; rojo: boolean }[] = [];
        for (let i = 0; i < 2; i++) {
          writeFileSync(contador, '');
          const cooldown = createTestCooldown({ dbPath: db, disabled: c.deshabilitado });
          const codigo = await denoTest([verde, rojo], { args: ['-A', '--no-check'], cooldown, reintentos: 0 });
          assert(codigo !== 0, 'el rojo hace fallar la corrida');
          const lineas = readFileSync(contador, 'utf8').split('\n');
          corridas.push({ verde: lineas.includes('verde'), rojo: lineas.includes('rojo-a-proposito') });
        }
        assertEquals(corridas.map((x) => x.verde), [...c.corridas.verde]);
        assertEquals(corridas.map((x) => x.rojo), [...c.corridas.rojo]);
        assertEquals(existsSync(db), c.registra, 'solo registra con cooldown activo');
        if (c.registra) {
          const entradas = createTestCooldown({ dbPath: db }).entries();
          const id = (f: string) => testId(relative(Deno.cwd(), f).replaceAll('\\', '/'), '*');
          assert((entradas[id(verde)]?.until ?? 0) > Date.now(), JSON.stringify(entradas));
          assertEquals(entradas[id(rojo)]?.until, -1, 'el rojo queda auditado con until -1');
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  });
}

// C4 Rojo a la primera: se reintenta de a uno (como `pruebas.ts`). Si el reintento pasa, la corrida es verde y el
//    archivo entra en cooldown; si sigue rojo, la corrida falla y queda con until -1.
const C4 = [
  { caso: 'intermitente (rojo y luego verde)', fallosAntesDeVerde: 1, codigoVerde: true, corridas: 2 },
  { caso: 'rojo persistente', fallosAntesDeVerde: 99, codigoVerde: false, corridas: 2 },
] as const;

for (const c of C4) {
  Deno.test({
    name: `cooldown: C4 denoTest reintenta de a uno — ${c.caso}`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const dir = join(KIT, '.tmp', `cooldown-guardian-${Deno.pid}-c4-${c.fallosAntesDeVerde}`);
      mkdirSync(dir, { recursive: true });
      try {
        const contador = join(dir, 'corridas.txt');
        writeFileSync(contador, '');
        const f = join(dir, 'intermitente.test.ts');
        writeFileSync(f, [
          "Deno.test('intermitente', async () => {",
          `  const previas = Deno.readTextFileSync(${JSON.stringify(contador)}).split('\\n').filter(Boolean).length;`,
          `  Deno.writeTextFileSync(${JSON.stringify(contador)}, 'x\\n', { append: true });`,
          '  await new Promise((r) => setTimeout(r, 60));',
          `  if (previas < ${c.fallosAntesDeVerde}) throw new Error('rojo a propósito (cooldown-guardian C4)');`,
          '});',
          '',
        ].join('\n'));
        const db = join(dir, 'cooldown.json');
        const codigo = await denoTest([f], { args: ['-A', '--no-check'], cooldown: createTestCooldown({ dbPath: db }), reintentos: 1 });
        assertEquals(codigo === 0, c.codigoVerde);
        assertEquals(readFileSync(contador, 'utf8').split('\n').filter(Boolean).length, c.corridas, 'una corrida + un reintento');
        const entrada = createTestCooldown({ dbPath: db }).entries()[testId(relative(Deno.cwd(), f).replaceAll('\\', '/'), '*')];
        if (c.codigoVerde) assert((entrada?.until ?? 0) > Date.now(), JSON.stringify(entrada));
        else assertEquals(entrada?.until, -1);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  });
}

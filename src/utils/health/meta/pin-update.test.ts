// pin-update.test.ts — QUÉ reporta el inventario de pines del kit (src/vendor-distributions/shared/tools/pin-update.mjs), como caja
// negra: una app en disco → salida y código de salida. Sin red (el inventario no la usa).
//   P1 un único SHA de 40 hex en todas sus formas (@sha y raw por SHA) → verde.
//   P2 refs mutables del KIT (rama, @latest, SHA corto, GitHub Pages del kit) → rojo y se listan.
//   P3 el sitio propio de la app (`iswc.host` en github.io) no es un pin del kit → no alerta.
//   P4 dos SHA distintos → rojo (heterogéneo).
//   P5 `verificarLocal` (protocolo --nuevo=ultimo --local): el checkout local se omite con motivo, nunca falla.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TOOL = join(Deno.cwd(), 'src/vendor-distributions/shared/tools/pin-update.mjs');
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

function inventario(archivos: Record<string, string>): { code: number; out: string } {
  const raiz = Deno.makeTempDirSync({ prefix: 'pin-' });
  mkdirSync(join(raiz, 'src'), { recursive: true });
  for (const [rel, txt] of Object.entries(archivos)) writeFileSync(join(raiz, rel), txt);
  const r = new Deno.Command(Deno.execPath(), {
    args: ['run', '-A', TOOL, '--repo=Jeff-Aporta/iswc-root', '--raices=src,deno.json'],
    cwd: raiz, stdout: 'piped', stderr: 'piped',
  }).outputSync();
  const dec = new TextDecoder();
  return { code: r.code, out: dec.decode(r.stdout) + dec.decode(r.stderr) };
}

const SANO = {
  'src/a.ts': `import 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@${A}/dist/cdn/loader.min.js';`,
  'deno.json': JSON.stringify({
    iswc: { host: 'https://jeff-aporta.github.io/mi-app/' },
    imports: { '@iswc/x': `https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/${A}/src/cdn/loader.schemas.ts` },
  }),
};

Deno.test('pin-update: P1/P3 un SHA en @sha y raw, con el host propio de la app en github.io → verde', () => {
  const r = inventario(SANO);
  assertEquals(r.code, 0, r.out);
  assert(r.out.includes(A));
  assert(!/ALERTA/.test(r.out), r.out);
});

Deno.test('pin-update: P2 refs mutables del kit → rojo y listadas', () => {
  for (const mala of [
    'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@main/x.js',
    'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@latest/x.js',
    'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@abc1234/x.js',
    'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/x.ts',
    'https://jeff-aporta.github.io/iswc-root/dist/cdn/x.js',
  ]) {
    const r = inventario({ ...SANO, 'src/b.ts': `const u = '${mala}';` });
    assertEquals(r.code, 1, `${mala}\n${r.out}`);
    assert(r.out.includes('src/b.ts'), r.out);
  }
});

Deno.test('pin-update: P4 dos SHA distintos → rojo', () => {
  const r = inventario({ ...SANO, 'src/b.ts': `import 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@${B}/x.js';` });
  assertEquals(r.code, 1, r.out);
  assert(r.out.includes(A) && r.out.includes(B));
});

// P5 PROTOCOLO (`--nuevo=ultimo --local=<ruta>`, lo corre vendor.ts al terminar): el checkout local es solo
//    información y NUNCA falla: ruta inexistente o sin git → `accesible: false` con motivo; un repo real → su HEAD
//    y si tiene (o no) el SHA pedido. Sin red aquí: se importa la función (importar el .mjs no barre nada).
Deno.test('pin-update: P5 verificarLocal nunca falla: sin ruta, ruta inexistente, sin git y repo real', async () => {
  const { verificarLocal, SHA } = await import('../../../vendor-distributions/shared/tools/pin-update.mjs');
  assertEquals(verificarLocal('').accesible, false);
  const noExiste = verificarLocal(join(Deno.makeTempDirSync(), 'nada'));
  assert(!noExiste.accesible && /no accesible|no existe/.test(noExiste.motivo), JSON.stringify(noExiste));
  const sinGit = verificarLocal(Deno.makeTempDirSync({ prefix: 'singit-' }));
  assert(!sinGit.accesible && /repo git/.test(sinGit.motivo), JSON.stringify(sinGit));
  const real = verificarLocal(Deno.cwd(), A);
  assert(real.accesible && SHA.test(real.head), JSON.stringify(real));
  assertEquals(real.tieneSha, false, 'un SHA inventado no está en el checkout');
  assertEquals(verificarLocal(Deno.cwd(), real.head).tieneSha, true, 'su propio HEAD sí');
});

// P6 Los scripts ONLINE del kit se citan desde raw@main con --reload (forma canónica, Jeff 2026-10-13): no son refs mutables.
Deno.test('pin-update: P6 las URL raw@main de los scripts online (vendor, pin-update, download-iconify, render-lote) y el --reload no alertan', () => {
  const r = inventario({
    ...SANO,
    'src/c.ts': [
      "import { descargarIconos } from 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs';",
      '// deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/ https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs x.json',
      "const lote = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/dist/cdn/vendor-distributions/client/tools/render-lote.mjs';",
      "const app = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs';",
    ].join('\n'),
  });
  assertEquals(r.code, 0, r.out);
  const malo = inventario({ ...SANO, 'src/d.ts': "import 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/src/vendor-distributions/shared/testing/pruebas.ts';" });
  assertEquals(malo.code, 1, 'lo que se vendoriza (pruebas.ts) sigue sin poder ir por main');
  const fuente = inventario({ ...SANO, 'src/e.ts': "const u = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/src/vendor-distributions/shared/tools/vendor.ts';" });
  assertEquals(fuente.code, 1, 'la FUENTE .ts por main tampoco: online va el bundle de dist/cdn');
});

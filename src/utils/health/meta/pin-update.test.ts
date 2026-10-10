// pin-update.test.ts — QUÉ reporta el inventario de pines del kit (src/cdn/tools/ISPinUpdate.mjs), como caja
// negra: una app en disco → salida y código de salida. Sin red (el inventario no la usa).
//   P1 un único SHA de 40 hex en todas sus formas (@sha y raw por SHA) → verde.
//   P2 refs mutables del KIT (rama, @latest, SHA corto, GitHub Pages del kit) → rojo y se listan.
//   P3 el sitio propio de la app (`iswc.host` en github.io) no es un pin del kit → no alerta.
//   P4 dos SHA distintos → rojo (heterogéneo).
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TOOL = join(Deno.cwd(), 'src/cdn/tools/ISPinUpdate.mjs');
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

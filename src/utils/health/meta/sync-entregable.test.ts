/**
 * Sync comun `_experimental` -> `_entregable` (`vendor-distributions/shared/tools/sync-entregable.ts`).
 *
 *   S1 coincideGlob: `**`, `*` y prefijos de carpeta
 *   S2 replace: crea, actualiza, borra lo que sobra; respeta excluir y bloqueados; cuenta iguales
 *   S3 push: crea y actualiza pero nunca borra
 *   S4 transformar: compara y escribe el contenido transformado (idempotente)
 *   S5 check/dry-run no escriben; check con drift -> codigo 1
 *   S6 gate en rojo: no se toca el destino; en verde escribe y corre `despues`
 *   S7 checkpoint: commit en el origen (repo git temporal), sin push
 *   S8 checkpoint obligatorio: sin remoto el sync lanza (entregable ya copiado); con remoto bare commit+push; sin cambios push al día
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { codigoSync, coincideGlob, correrSync } from '../../../vendor-distributions/shared/tools/sync-entregable.ts';
import type { ConfigSync } from '../../../vendor-distributions/shared/schemas.ts';

const silencio = () => undefined;
function arbol(raiz: string, archivos: Record<string, string>) {
  for (const [rel, txt] of Object.entries(archivos)) {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true });
    writeFileSync(join(raiz, rel), txt);
  }
}
const leer = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
function base() {
  const raiz = mkdtempSync(join(tmpdir(), 'sync-'));
  const origen = join(raiz, 'exp');
  const destino = join(raiz, 'ent');
  arbol(origen, { 'src/a.ts': 'A', 'src/b.ts': 'B', 'src/testing/t.ts': 'T', 'README.md': 'R' });
  arbol(destino, { 'src/a.ts': 'A', 'src/b.ts': 'viejo', 'src/sobra.ts': 'X', 'src/.git/keep': 'G', 'package.json': '{}' });
  return { raiz, origen, destino };
}

test('S1 coincideGlob', () => {
  assert.ok(coincideGlob('testing/x/y.ts', 'testing/**'));
  assert.ok(coincideGlob('a.test.ts', '*.test.ts'));
  assert.ok(!coincideGlob('dir/a.test.ts', '*.test.ts'));
  assert.ok(coincideGlob('dir/a.test.ts', '**/*.test.ts'));
  assert.ok(coincideGlob('a.test.ts', '**/*.test.ts'), 'globstar: cero carpetas');
  assert.ok(coincideGlob('testing/x.ts', '**/testing/**') && coincideGlob('a/testing/x.ts', '**/testing/**'));
  assert.ok(!coincideGlob('footesting/x.ts', '**/testing/**'), 'no parte nombres');
});

test('S2/S3 replace y push', async () => {
  const { raiz, origen, destino } = base();
  const cfg: ConfigSync = {
    origen, destino,
    entradas: [
      { desde: 'src', accion: 'replace', excluir: ['testing/**'] },
      { desde: 'README.md', accion: 'push' },
    ],
    bloqueados: ['src/.git/**'],
  };
  const r = await correrSync(cfg, 'real', silencio);
  assert.equal(leer(join(destino, 'src/b.ts')), 'B', 'actualiza');
  assert.equal(leer(join(destino, 'src/sobra.ts')), null, 'replace borra lo que sobra');
  assert.equal(leer(join(destino, 'src/testing/t.ts')), null, 'excluir no viaja');
  assert.equal(leer(join(destino, 'src/.git/keep')), 'G', 'bloqueado no se borra');
  assert.equal(leer(join(destino, 'README.md')), 'R', 'push crea');
  assert.equal(r.entradas[0].iguales, 1, 'a.ts igual');
  const push = await correrSync({ origen, destino, entradas: [{ desde: 'src', accion: 'push' }] }, 'real', silencio);
  writeFileSync(join(destino, 'src/extra.ts'), 'E');
  await correrSync({ origen, destino, entradas: [{ desde: 'src', accion: 'push' }] }, 'real', silencio);
  assert.equal(leer(join(destino, 'src/extra.ts')), 'E', 'push nunca borra');
  assert.ok(push.entradas[0].cambios.every((c) => c.tipo !== 'borrar'));
  rmSync(raiz, { recursive: true, force: true });
});

test('S4 transformar es idempotente', async () => {
  const { raiz, origen, destino } = base();
  const cfg: ConfigSync = { origen, destino, entradas: [{ desde: 'src', accion: 'replace', excluir: ['testing/**'], transformar: (_r, c) => new TextEncoder().encode(`//x\n${new TextDecoder().decode(c)}`) }] };
  await correrSync(cfg, 'real', silencio);
  assert.equal(leer(join(destino, 'src/a.ts')), '//x\nA');
  const otra = await correrSync(cfg, 'check', silencio);
  assert.equal(otra.cambios, 0, 'segunda corrida sin drift');
  assert.equal(codigoSync(otra), 0);
  rmSync(raiz, { recursive: true, force: true });
});

test('S5 check y dry-run no escriben', async () => {
  const { raiz, origen, destino } = base();
  const cfg: ConfigSync = { origen, destino, entradas: [{ desde: 'src', accion: 'replace' }] };
  const c = await correrSync(cfg, 'check', silencio);
  assert.ok(c.cambios > 0);
  assert.equal(codigoSync(c), 1);
  await correrSync(cfg, 'dry-run', silencio);
  assert.equal(leer(join(destino, 'src/b.ts')), 'viejo', 'nada escrito');
  rmSync(raiz, { recursive: true, force: true });
});

test('S6 gate rojo no toca; verde escribe y corre despues', async () => {
  const { raiz, origen, destino } = base();
  const node = process.execPath;
  const rojo: ConfigSync = { origen, destino, entradas: [{ desde: 'src', accion: 'replace' }], gate: { cmd: node, args: ['-e', 'process.exit(3)'] } };
  await assert.rejects(() => correrSync(rojo, 'real', silencio), /gate en ROJO/);
  assert.equal(leer(join(destino, 'src/b.ts')), 'viejo');
  let despues = false;
  await correrSync({ ...rojo, gate: { cmd: node, args: ['-e', 'process.exit(0)'] }, despues: () => { despues = true; } }, 'real', silencio);
  assert.equal(leer(join(destino, 'src/b.ts')), 'B');
  assert.ok(despues);
  rmSync(raiz, { recursive: true, force: true });
});

test('S7 checkpoint en el origen, sin push', async () => {
  const { raiz, origen, destino } = base();
  const git = (...a: string[]) => spawnSync('git', ['-C', origen, ...a], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  const r = await correrSync({ origen, destino, entradas: [{ desde: 'src', accion: 'replace' }], checkpoint: { mensaje: 'feat: sync to entregable', push: false } }, 'real', silencio);
  assert.ok(r.checkpoint?.commit, JSON.stringify(r.checkpoint));
  assert.equal(git('log', '-1', '--format=%s').stdout.trim(), 'feat: sync to entregable');
  assert.equal(existsSync(join(destino, '.git')), false, 'el destino no recibe commits');
  rmSync(raiz, { recursive: true, force: true });
});

// S8 El checkpoint es obligatorio (Jeff, 2026-10-13): cada sync real en verde deja commit y, con `push: true`, push
//    del mirror. Si falla, el sync LANZA diciendo que el entregable ya quedó copiado. Casos como datos:
//    `remoto`: sin remoto | bare; `cambios`: si el mirror trae cambios sin commitear antes del sync.
const S8: { caso: string; remoto: 'ninguno' | 'bare'; cambios: boolean; lanza: boolean; commit: boolean }[] = [
  { caso: 'sin remoto: el push falla y el sync lanza', remoto: 'ninguno', cambios: true, lanza: true, commit: true },
  { caso: 'con remoto bare: commit y push hechos', remoto: 'bare', cambios: true, lanza: false, commit: true },
  { caso: 'sin cambios y al día: no commitea, intenta el push y no falla', remoto: 'bare', cambios: false, lanza: false, commit: false },
];

for (const c of S8) {
  test(`S8 checkpoint obligatorio: ${c.caso}`, async () => {
    const { raiz, origen, destino } = base();
    const git = (cwd: string, ...a: string[]) => spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });
    git(origen, 'init', '-q', '-b', 'main');
    git(origen, 'config', 'user.email', 't@t');
    git(origen, 'config', 'user.name', 't');
    const bare = join(raiz, 'remoto.git');
    if (c.remoto === 'bare') {
      spawnSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
      git(origen, 'remote', 'add', 'origin', bare);
    }
    if (!c.cambios) {
      git(origen, 'add', '-A');
      git(origen, 'commit', '-q', '-m', 'base');
      if (c.remoto === 'bare') git(origen, 'push', '-q', '-u', 'origin', 'main');
    } else if (c.remoto === 'bare') {
      // Rama con upstream para que `git push` sin argumentos sepa adónde ir.
      writeFileSync(join(origen, 'base.txt'), 'base');
      git(origen, 'add', 'base.txt');
      git(origen, 'commit', '-q', '-m', 'base');
      git(origen, 'push', '-q', '-u', 'origin', 'main');
    }
    const antes = git(origen, 'rev-parse', 'HEAD').stdout.trim();
    const cfg: ConfigSync = { origen, destino, entradas: [{ desde: 'src', accion: 'replace' }], checkpoint: { mensaje: 'feat: sync to entregable', push: true } };
    try {
      if (c.lanza) {
        await assert.rejects(() => correrSync(cfg, 'real', silencio), (e: Error) => /checkpoint/.test(e.message) && /YA quedó copiado/.test(e.message) && e.message.includes(destino));
      } else {
        const r = await correrSync(cfg, 'real', silencio);
        assert.equal(r.checkpoint?.push, true, JSON.stringify(r.checkpoint));
        assert.equal(!!r.checkpoint?.commit, c.commit, JSON.stringify(r.checkpoint));
        const local = git(origen, 'rev-parse', 'HEAD').stdout.trim();
        assert.equal(spawnSync('git', ['-C', bare, 'rev-parse', 'main'], { encoding: 'utf8' }).stdout.trim(), local, 'el remoto queda al día');
        assert.equal(local !== antes, c.commit);
      }
      assert.equal(leer(join(destino, 'src/b.ts')), 'B', 'el entregable quedó copiado en todos los casos');
      if (c.commit) assert.equal(git(origen, 'log', '-1', '--format=%s').stdout.trim(), 'feat: sync to entregable');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
}

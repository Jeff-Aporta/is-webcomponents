// scss-migrar.mjs — migra una carpeta del SCSS y hace el commit.
//
//   deno run -A scripts/codemods/scss-migrar.mjs <carpeta> [--ancho=160] [--sin-commit]
//
// Aplica los codemods (mixins + colapso) a una carpeta, comprueba que el CSS compilado no
// cambia y deja un commit por carpeta.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const RAIZ = process.cwd();
const args = process.argv.slice(2);
const carpeta = args.find((a) => !a.startsWith('--'));
const valor = (k, def) => args.find((a) => a.startsWith('--' + k + '='))?.slice(k.length + 3) ?? def;
const ANCHO = valor('ancho', '160');
const SIN_COMMIT = args.includes('--sin-commit');

if (!carpeta) {
  console.error('uso: scss-migrar.mjs <carpeta> [--ancho=160] [--sin-commit]');
  process.exit(1);
}

const run = (cmd, args2) => execFileSync(cmd, args2, { encoding: 'utf8', cwd: RAIZ });

// 1) Los mixins.
run('deno', ['run', '-A', '--no-check', 'scripts/codemods/scss-mixin.mjs', '--carpeta=' + carpeta]);
// 2) El colapso.
run('deno', ['run', '-A', '--no-check', 'scripts/codemods/scss-colapsar.mjs', '--carpeta=' + carpeta, '--ancho=' + ANCHO]);

// 3) La equivalencia del CSS.
const sonda = run('deno', ['task', 'css:equivalente']);
const linea = (sonda.match(/archivos: \d+ \| distintos: \d+/) ?? ['?'])[0];
if (!/distintos: 0/.test(linea)) {
  console.log('CUIDADO: ' + linea + ' — el CSS cambio; revierte.');
  console.log(sonda.split('\n').filter((l) => l.includes('DISTINTO') || l.includes('ERROR')).slice(0, 10).join('\n'));
  process.exit(1);
}

// 4) El commit.
if (!SIN_COMMIT) {
  const nombre = carpeta.replace(/^src\/components\//, '').replace(/\//g, '-');
  const lineas = [
    'refactor(scss): ' + nombre + ' con los mixins del kit y las reglas en una linea',
    '',
    '- Los bloques repetidos pasan por los mixins del kit.',
    '- Las reglas que caben en una linea se colapsan: el codemod comprueba el CSS compilado antes',
    '  y despues y no deja pasar lo que no sea equivalente.',
    '',
    'Verificacion: deno task css:equivalente -> ' + linea + '.',
    '',
    'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>',
    '',
  ];
  writeFileSync('.tmp/commit-carpeta.txt', lineas.join('\n'), 'utf8');
  run('git', ['-c', 'core.safecrlf=false', 'add', carpeta]);
  const hay = run('git', ['diff', '--cached', '--name-only']).trim();
  if (hay) run('git', ['commit', '-F', '.tmp/commit-carpeta.txt']);
}

console.log(carpeta + ': ' + linea + (SIN_COMMIT ? '' : ' (commit hecho)'));

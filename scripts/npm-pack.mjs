// npm-pack.mjs — `deno task npm:pack`: arma el tarball de npm del kit en `.tmp/npm/` y reporta tamaño y archivos
// (plan D9, fase F6). NO publica nada: no hay cuenta ni token, y `npm publish` no se corre nunca desde aquí.
// Requiere `deno task build` antes (genera `package.json` y `dist/cdn/`). Lo usa también
// `tests/gobernanza/npm-pack.test.ts` (`empaquetar`).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

/** Corre `npm pack --json` hacia `destino` (relativa a `raiz`) y devuelve el tarball, su peso y sus archivos. */
export function empaquetar({ raiz = RAIZ, destino = '.tmp/npm' } = {}) {
  if (!existsSync(join(raiz, 'package.json'))) throw new Error('npm-pack: falta package.json (corre `deno task build`)');
  const salida = join(raiz, destino);
  mkdirSync(salida, { recursive: true });
  // `shell`: en Windows `npm` es `npm.cmd`. `--ignore-scripts`: el package.json no trae scripts, pero por si acaso.
  const json = execSync(`npm pack --json --ignore-scripts --pack-destination "${salida}"`, { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
  const [info] = JSON.parse(json.slice(json.indexOf('[')));
  const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  return {
    nombre: pkg.name,
    version: pkg.version,
    tarball: join(salida, info.filename),
    bytes: info.size,
    desempacado: info.unpackedSize,
    archivos: info.files.map((f) => f.path),
  };
}

if (import.meta.main) {
  const r = empaquetar();
  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  console.log(`npm:pack ${r.nombre}@${r.version}`);
  console.log(`  tarball      ${r.tarball}`);
  console.log(`  tamaño       ${r.bytes} B (${mb(r.bytes)} MB gzip) · ${mb(r.desempacado)} MB sin comprimir`);
  console.log(`  archivos     ${r.archivos.length}`);
  console.log('  publicado    no (F6: preparado, sin npm publish)');
}

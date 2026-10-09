#!/usr/bin/env node
/**
 * sync-pins.mjs — captura el SHA del kit y actualiza pines de consumidores.
 *
 * Uso:
 *   node scripts/sync-pins.mjs
 *   node scripts/sync-pins.mjs <sha>
 *   node scripts/sync-pins.mjs --remote
 *   node scripts/sync-pins.mjs --install-hook
 *   node scripts/sync-pins.mjs --dry-run
 *   deno task sync:pins
 *
 * Lista de destinos: scripts/pin-targets
 * También escribe PIN y dist/cdn/PIN.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TARGETS = join(ROOT, 'scripts', 'pin-targets');

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const wantsHook = args.includes('--install-hook');
const wantsRemote = args.includes('--remote');
const shaArg = args.find((a) => /^[0-9a-fA-F]{7,40}$/.test(a));

function git(...gitArgs) {
  return execFileSync('git', ['-C', ROOT, ...gitArgs], {
    encoding: 'utf8',
  }).trim();
}

function installHook() {
  const hook = join(ROOT, '.git', 'hooks', 'post-commit');
  mkdirSync(dirname(hook), { recursive: true });
  const body = `#!/usr/bin/env bash
# Generado por scripts/sync-pins.mjs --install-hook
ROOT="$(git rev-parse --show-toplevel)"
if command -v node >/dev/null 2>&1; then
  exec node "$ROOT/scripts/sync-pins.mjs"
fi
exec deno run -A "$ROOT/scripts/sync-pins.mjs"
`;
  writeFileSync(hook, body.replace(/\r\n/g, '\n'));
  try { chmodSync(hook, 0o755); } catch { /* Windows */ }
  console.log('hook instalado:', hook);
  process.exit(0);
}

if (wantsHook) installHook();

function resolveSha() {
  if (shaArg) {
    const full = git('rev-parse', shaArg);
    return full.toLowerCase();
  }
  if (wantsRemote) {
    const out = execFileSync(
      'git',
      ['-C', ROOT, 'ls-remote', 'origin', 'refs/heads/main'],
      { encoding: 'utf8' },
    );
    const sha = out.trim().split(/\s+/)[0];
    if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`ls-remote falló: ${out}`);
    return sha.toLowerCase();
  }
  return git('rev-parse', 'HEAD').toLowerCase();
}

const SHA = resolveSha();
if (!/^[0-9a-f]{40}$/.test(SHA)) {
  console.error('SHA inválido:', SHA);
  process.exit(1);
}
console.log('pin SHA =', SHA);

function writePin(path) {
  if (dry) {
    console.log('dry:', path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${SHA}\n`);
  console.log('ok ', path);
}

writePin(join(ROOT, 'PIN'));
writePin(join(ROOT, 'dist', 'cdn', 'PIN'));

function patchFile(kind, file) {
  if (!existsSync(file)) {
    console.log('skip (no existe) ', file);
    return;
  }
  if (dry) {
    console.log(`dry: [${kind}]`, file);
    return;
  }
  let text = readFileSync(file, 'utf8');
  const before = text;
  if (kind === 'kit_pin') {
    text = text.replace(
      /(KIT_PIN\s*=\s*['"])[0-9a-fA-F]{7,40}(['"])/,
      `$1${SHA}$2`,
    );
  } else if (kind === 'cdn_url') {
    text = text.replace(
      /(?:iswc-root|is-webcomponents)@[0-9a-fA-F]{7,40}/gi,
      `iswc-root@${SHA}`,
    );
  } else {
    console.error('modo desconocido:', kind);
    process.exit(2);
  }
  if (text === before) console.log('noop', file);
  else {
    writeFileSync(file, text);
    console.log('ok ', file);
  }
}

if (!existsSync(TARGETS)) {
  console.error('falta', TARGETS);
  process.exit(1);
}

for (const raw of readFileSync(TARGETS, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const parts = line.split(/\t+/);
  let kind;
  let rel;
  if (parts.length >= 2) {
    [kind, rel] = parts;
  } else {
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (!m) continue;
    kind = m[1];
    rel = m[2];
  }
  patchFile(kind.trim(), resolve(ROOT, rel.trim()));
}

console.log('listo — consumidores alineados a', SHA);

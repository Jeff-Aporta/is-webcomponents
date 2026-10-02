/**
 * Segundo pase: cualquier token is-<kebab> residual → iswc-,
 * excepto lista PRESERVE (repo, css base, skills, prefs root).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const EXTS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.css', '.html']);

const PRESERVE = [
  'is-webcomponents',
  'is-webcomponents-demo',
  'is-webcomponents-demo-bundle',
  'is-cdn-install',
  'is-base',
  'is-base.min',
  'is-base.css',
  'is-base.min.css',
  'is-components', // legacy prefs key
  'is-sheets-v1',
  'is-wc-modules-v1',
  'is-cdn-css',
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (EXTS.has(path.extname(ent.name)) || ent.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function isPreserved(token) {
  return PRESERVE.some((p) => token === p || token.startsWith(p + '.') || token.startsWith(p + '-demo'));
}

function transform(text) {
  // No tocar ya-iswc (lookbehind)
  return text.replace(/(?<![A-Za-z0-9-])is-([a-z][a-z0-9-]*)/g, (full, rest) => {
    if (isPreserved(full)) return full;
    if (full.startsWith('iswc-')) return full;
    return `iswc-${rest}`;
  });
}

function main() {
  const roots = ['src', 'specs', 'scripts']
    .map((d) => path.join(ROOT, d))
    .filter(fs.existsSync);
  const files = roots.flatMap((r) => walk(r)).filter((f) => !f.includes('rename-is-to-iswc'));

  const tokenCounts = new Map();
  let changed = 0;
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    if (raw.includes('\0')) continue;
    const out = transform(raw);
    if (out === raw) continue;
    // collect tokens changed
    const re = /(?<![A-Za-z0-9-])is-([a-z][a-z0-9-]*)/g;
    let m;
    while ((m = re.exec(raw))) {
      if (!isPreserved(m[0])) tokenCounts.set(m[0], (tokenCounts.get(m[0]) || 0) + 1);
    }
    changed++;
    if (!DRY) fs.writeFileSync(file, out, 'utf8');
  }
  const top = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
  console.log(top.map(([t, n]) => `${n}\t${t}`).join('\n'));
  console.log(`changed=${changed} dry=${DRY} unique=${tokenCounts.size}`);
}

main();

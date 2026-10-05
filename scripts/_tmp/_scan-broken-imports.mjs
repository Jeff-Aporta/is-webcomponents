import fs from 'node:fs';
import path from 'node:path';

const root = 'c:/ContaPyme/Personal/apps/is-webcomponents';
const bad = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(e.name)) walk(p);
      continue;
    }
    if (!/\.(ts|js|mjs|md|json)$/.test(e.name)) continue;
    const t = fs.readFileSync(p, 'utf8');
    for (const m of t.matchAll(/(?:from\s+|read\(|join\([^)]*?,\s*|['"`])(\.?\.?\/[^'"`\s]*iswc-[^'"`\s]+)/g)) {
      const spec = m[1].replace(/^['"`]/, '');
      if (/^https?:/.test(spec)) continue;
      const clean = spec.replace(/\?.*$/, '').replace(/\.js$/, '');
      const dir = path.dirname(p);
      const cands = ['.ts', '.js', '.mjs', ''].map((ext) => path.resolve(dir, clean + ext));
      // also try as absolute from root if starts with src/
      if (spec.startsWith('src/') || spec.startsWith('./src/')) {
        cands.push(path.join(root, clean.replace(/^\.\//, '')));
        cands.push(path.join(root, clean.replace(/^\.\//, '') + '.ts'));
      }
      if (!cands.some((c) => fs.existsSync(c))) {
        bad.push(path.relative(root, p) + ' -> ' + spec);
      }
    }
  }
}

walk(path.join(root, 'src'));
console.log([...new Set(bad)].join('\n') || 'none');
console.log('count', new Set(bad).size);

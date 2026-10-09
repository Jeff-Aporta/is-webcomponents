import fs from 'node:fs';
import path from 'node:path';

const root = 'c:/ContaPyme/Personal/apps/iswc-root/src';
const hits = [];
const pat = /is-\$\{|<is-[a-z0-9]|<\/is-[a-z0-9]|defineElement\(['"]is-|tag: 'is-|startsWith\(['"]is-['"]\)|matchAll\(\/<is-/g;

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'dist'].includes(e.name)) walk(p);
      continue;
    }
    if (!/\.(ts|js|json|css|mjs)$/.test(e.name)) continue;
    const t = fs.readFileSync(p, 'utf8');
    const m = t.match(pat);
    if (m) hits.push(path.relative(root, p) + ' => ' + [...new Set(m)].join(', '));
  }
}

walk(root);
console.log(hits.slice(0, 60).join('\n') || 'CLEAN');
console.log('total', hits.length);

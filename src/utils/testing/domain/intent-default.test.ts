// Guardián: default color=brand + helpers CDN (intent.ts)
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));
const modUrl = `file:///${join(root, 'src/components/_shared/intent.ts').replace(/\\/g, '/')}`;
const {
  DEFAULT_INTENT,
  INTENT,
  ensureDefaultColor,
  normalizeIntent,
} = await import(modUrl);

const failures = [];
let checks = 0;
function eq(a, e, msg) {
  checks++;
  if (JSON.stringify(a) !== JSON.stringify(e)) failures.push(`${msg}: got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`);
}

eq(DEFAULT_INTENT, 'brand', 'default intent');
eq(INTENT.includes('info'), true, 'intent has info');
eq(INTENT.includes('error'), true, 'intent has error');
eq(normalizeIntent('danger'), 'danger', 'normalize ok');
eq(normalizeIntent('nope'), 'brand', 'normalize fallback');

class FakeEl {
  attrs = new Map();
  hasAttribute(n) { return this.attrs.has(n); }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n, v) { this.attrs.set(n, String(v)); }
}

const a = new FakeEl();
eq(ensureDefaultColor(a), 'brand', 'ensure sets brand');
eq(a.getAttribute('color'), 'brand', 'attr brand');

const b = new FakeEl();
b.setAttribute('color', 'success');
eq(ensureDefaultColor(b), 'success', 'ensure preserves consumer');

if (failures.length) {
  console.error('FAIL', failures);
  process.exit(1);
}
console.log(`OK intent-default ${checks} checks`);

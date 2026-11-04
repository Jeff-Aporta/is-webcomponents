// bundle-demos.mjs — rebuilds dist/cdn/diagrams/er-{diagram,editor}.min.js
// + theme.min.mjs + themes/*.json. Necesario porque los HTML de los demos
// cargan desde dist/cdn/ y el build principal puede fallar en otros tags.
import { build } from 'esbuild';
import { aliasKit } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';
import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist/cdn/diagrams');
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'themes'), { recursive: true });

await build({
  entryPoints: [join(ROOT, 'src/components/diagrams/er-diagram.ts')],
  bundle: true, format: 'esm', target: 'es2020',
  outfile: join(OUT, 'er-diagram.min.mjs'),
  minify: true, sourcemap: false, treeShaking: true,
  loader: { '.json': 'json' },
  plugins: [aliasKit(), cssVirtual()],
});
console.log('OK er-diagram.min.mjs');

await build({
  entryPoints: [join(ROOT, 'src/components/diagrams/er-editor.ts')],
  bundle: true, format: 'esm', target: 'es2020',
  outfile: join(OUT, 'er-editor.min.mjs'),
  minify: true, sourcemap: false, treeShaking: true,
  loader: { '.json': 'json' },
  plugins: [aliasKit(), cssVirtual()],
});
console.log('OK er-editor.min.mjs');

// Utils puros (json2css, resolveErTheme, INSOFT_THEME) — Deno/vendor/CDN.
await build({
  entryPoints: [join(ROOT, 'src/components/diagrams/utils/theme.ts')],
  bundle: true, format: 'esm', target: 'es2020',
  outfile: join(OUT, 'theme.min.mjs'),
  minify: true, sourcemap: false, treeShaking: true,
  loader: { '.json': 'json' },
  plugins: [aliasKit(), cssVirtual()],
});
console.log('OK theme.min.mjs');

// JSON editable (fuente de verdad también embebida en theme.min.mjs).
const themesSrc = join(ROOT, 'src/components/diagrams/themes');
for (const name of readdirSync(themesSrc)) {
  if (!name.endsWith('.json')) continue;
  copyFileSync(join(themesSrc, name), join(OUT, 'themes', name));
  console.log(`OK themes/${name}`);
}

// Fuentes TS para vendor Deno (extender sin minificar).
copyFileSync(
  join(ROOT, 'src/components/diagrams/utils/theme.ts'),
  join(OUT, 'theme.ts'),
);
console.log('OK theme.ts (vendor)');

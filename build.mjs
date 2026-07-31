// build.mjs — CDN artifacts: flat dist/cdn/{tag}.min.js + {tag}.min.css + is-base.min.css
import { access, readdir, mkdir, stat, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'components');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const bundleJs = (entry, outfile) =>
  build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
  });

const bundleCss = (entry, outfile) => build({ entryPoints: [entry], outfile, minify: true });

async function walk(dir, out = []) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '_shared') continue;
      await walk(p, out);
    } else if (/\.js$/.test(name.name)) {
      out.push(p);
    }
  }
  return out;
}

const entries = (await walk(compRoot)).sort();

for (const inFile of entries) {
  const tag = inFile.replace(/\\/g, '/').split('/').pop().replace(/\.js$/, '');
  const cssIn = inFile.replace(/\.js$/i, '.css');
  const outJs = join(dist, `${tag}.min.js`);
  const outCss = join(dist, `${tag}.min.css`);

  await bundleJs(inFile, outJs);

  // No todo módulo trae CSS propio (helpers como diagram-kinds no tienen shadow)
  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleCss(cssIn, outCss);

  const [jsIn, jsOut] = await Promise.all([stat(inFile), stat(outJs)]);
  const cssSize = hasCss ? String((await stat(outCss)).size) : '—';
  console.log(
    `  ${tag.padEnd(18)} js ${String(jsIn.size).padStart(6)}→${String(jsOut.size).padStart(6)}  css ${cssSize.padStart(6)}`,
  );
}

const baseIn = join(root, 'styles', 'is-base.css');
const baseOut = join(dist, 'is-base.min.css');
await bundleCss(baseIn, baseOut);
const baseStat = await stat(baseOut);
console.log(`  ${'is-base'.padEnd(18)} css ${String(baseStat.size).padStart(6)}`);

await writeFile(
  join(dist, 'README.txt'),
  [
    'CDN flat artifacts',
    '  is-base.min.css          — themes + brand palettes (link in the host app)',
    '  <name>.min.js            — component (bundles adopt-css; loads sibling .min.css into shadow)',
    '  <name>.min.css           — component styles (must sit next to the .min.js)',
    '  Custom element tags keep the is-* prefix (e.g. button.min.js → <is-button>).',
    '',
    'Usage:',
    '  <link rel="stylesheet" href=".../is-base.min.css">',
    '  <script type="module" src=".../button.min.js"></script>',
    '  <!-- button.min.css is fetched automatically by the component -->',
    '',
  ].join('\n'),
);

console.log(`OK dist/cdn  ${entries.length} components + is-base`);

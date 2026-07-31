// build.mjs — CDN artifacts: flat dist/cdn/{tag}.min.js + {tag}.min.css + is-base.min.css
// Ademas genera bundles por categoria (categoria.min.js) y all.min.js para
// poder cargar varios componentes con un solo <script type="module" src="..."></script>.
import { access, readdir, mkdir, stat, rm, writeFile } from 'node:fs/promises';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
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

const bundleVirtual = async (outfile, virtualEntry, sourcefile) => {
  const r = await build({
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    write: false,
    stdin: { contents: virtualEntry, resolveDir: dist, loader: 'js', sourcefile },
  });
  const fs = await import('node:fs/promises');
  await fs.writeFile(outfile, r.outputFiles[0].text);
};

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

// Componentes por categoria segun manifest.js (single source of truth).
const manifestMod = await import('../manifest.js');
const manifest = manifestMod.default;
const byCategory = new Map();
for (const m of manifest) {
  if (!byCategory.has(m.category)) byCategory.set(m.category, []);
  byCategory.get(m.category).push(m);
}

// Mapa tag → componente
const tagToComponent = new Map();
for (const e of entries) {
  const tag = basename(e).replace(/\.js$/, '');
  tagToComponent.set(tag, e);
}

for (const inFile of entries) {
  const tag = basename(inFile).replace(/\.js$/, '');
  const cssIn = inFile.replace(/\.js$/i, '.css');
  const outJs = join(dist, `${tag}.min.js`);
  const outCss = join(dist, `${tag}.min.css`);

  await bundleJs(inFile, outJs);

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

const palettesIn = join(root, 'styles', 'palettes.css');
const palettesOut = join(dist, 'palettes.min.css');
await bundleCss(palettesIn, palettesOut);
const palettesStat = await stat(palettesOut);
console.log(`  ${'palettes'.padEnd(18)} css ${String(palettesStat.size).padStart(6)}`);

// ── Bundles por categoria ────────────────────────────────────────
// Cada categoria exporta TODOS los modulos <tag>.min.js que pertenezcan
// a la misma, lo que activa el side effect de `customElements.define`
// y deja el componente listo para usar.

const entriesImport = (tags) =>
  tags.map((t) => `import './${t}.min.js';`).join('\n');

for (const [category, items] of byCategory) {
  const tags = items.map((m) => m.tag.replace(/^is-/, '')).filter((t) => tagToComponent.has(t));
  if (!tags.length) continue;
  const virtualEntry = `// categoria: ${category}\n${entriesImport(tags)}\n`;
  const out = join(dist, `${category}.min.js`);
  await bundleVirtual(out, virtualEntry, out);
  const outStat = await stat(out);
  console.log(`  ${(category + '.min').padEnd(18)} js ${String(outStat.size).padStart(6)}  (${tags.length} comps)`);
}

// ── Bundle all ───────────────────────────────────────────────────
// Re-exporta cada <tag>.min.js, esto incluye TODOS los modulos JS.
// Los CSS los carga cada componente en su shadow (adoptCss).
const allTags = entries.map((e) => basename(e).replace(/\.js$/, '')).sort();
const allVirtual = `// all.min.js — todos los componentes de IS Web Components\n${entriesImport(allTags)}\n`;
const allOut = join(dist, 'all.min.js');
await bundleVirtual(allOut, allVirtual, allOut);
const allStat = await stat(allOut);
console.log(`  ${'all.min'.padEnd(18)} js ${String(allStat.size).padStart(6)}  (${allTags.length} comps)`);

await writeFile(
  join(dist, 'README.txt'),
  [
    'CDN flat artifacts',
    '  is-base.min.css          — themes + brand palettes (link in the host app)',
    '  <name>.min.js            — single component (bundles adopt-css; loads sibling .min.css into shadow)',
    '  <name>.min.css           — component styles (must sit next to the .min.js)',
    '  <category>.min.js        — every component of a category in one file (actions, media, forms, ...)',
    '  all.min.js               — every component in a single file',
    '  Custom element tags keep the is-* prefix (e.g. button.min.js → <is-button>).',
    '',
    'Usage:',
    '  <link rel="stylesheet" href=".../is-base.min.css">',
    '  <script type="module" src=".../button.min.js"></script>',
    '  <!-- button.min.css is fetched automatically by the component -->',
    '  <!-- or grab several at once: -->',
    '  <script type="module" src=".../actions.min.js"></script>',
    '  <script type="module" src=".../all.min.js"></script>',
    '',
  ].join('\n'),
);

console.log(`OK dist/cdn  ${entries.length} components + is-base + ${byCategory.size} categories + all`);
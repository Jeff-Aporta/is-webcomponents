/** Rebuild puntual: lightbox + diagram-lightbox + playground + gallery + pages. */
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readFile, mkdir, readdir, stat, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { bundleMinJs, bundleMinCss, docsBanner } from '../src/cdn/build/bundle-min.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');
const coreRoot = join(root, 'src', 'core');

async function walk(dir, out = []) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '_shared') continue;
      await walk(p, out);
    } else if (/\.(ts|js)$/.test(name.name) && !/^index\.(ts|js)$/.test(name.name)
               && !name.name.endsWith('.d.ts')
               && !name.name.includes('.selfcheck.')
               && !name.name.includes('.preview.')
               && !name.name.endsWith('.json')
               && !/^doc-demo-(boot|host)\.(ts|js)$/.test(name.name)) {
      out.push(p);
    }
  }
  return out;
}

const entries = (await walk(compRoot)).sort();
const manifest = (await import('../src/manifest.ts')).default;
const tagToComponent = new Map();
for (const e of entries) tagToComponent.set(basename(e).replace(/\.(ts|js)$/, ''), e);
const manifestCategoryByTag = new Map(
  manifest.map((m) => [m.tag.replace(/^iswc-/, ''), m.category]),
);
const folderFor = (file) => {
  const t = basename(file).replace(/\.(ts|js)$/, '');
  if (manifestCategoryByTag.has(t)) return manifestCategoryByTag.get(t);
  return relative(compRoot, file).split(/[\\/]/)[0];
};

const externalComponents = {
  name: 'external-components',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      if (abs === coreRoot || abs.startsWith(coreRoot + sep)) return null;
      if (basename(abs).replace(/\.(ts|js)$/, '') === 'base-sheets') {
        return { path: '../_shared/base-sheets.min.js', external: true };
      }
      if (!abs.startsWith(compRoot)) return null;
      if (abs.includes(`${sep}_shared${sep}`)) return null;
      const t = basename(abs).replace(/\.(ts|js)$/, '');
      if (!tagToComponent.has(t)) return null;
      return { path: `../${folderFor(abs)}/${t}.min.js`, external: true };
    });
  },
};

const defineCss = async (cssFile) => {
  try {
    const texto = await readFile(cssFile, 'utf8');
    return { __IS_COMPONENT_CSS__: JSON.stringify(texto) };
  } catch {
    return undefined;
  }
};

async function rebuildOne(srcRel, category) {
  const inFile = join(compRoot, srcRel);
  const tag = basename(inFile).replace(/\.(ts|js)$/, '');
  const cssIn = inFile.replace(/\.(ts|js)$/i, '.css');
  const outDir = join(dist, category);
  const outJs = join(outDir, `${tag}.min.js`);
  const outCss = join(outDir, `${tag}.min.css`);
  await mkdir(outDir, { recursive: true });
  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleMinCss(cssIn, outCss);
  await bundleMinJs({
    entry: inFile,
    outfile: outJs,
    plugins: [externalComponents],
    banner: docsBanner([`rebuild: ${tag}`]),
    define: hasCss ? await defineCss(outCss) : undefined,
  });
  console.log(`OK ${relative(root, outJs)} ${(await stat(outJs)).size}`);
  if (hasCss) {
    const cssText = await readFile(outCss, 'utf8');
    const nestedOpen = /:host\{[^}]*&\[open\]/.test(cssText);
    const flatOpen = cssText.includes(':host([open])') || cssText.includes(':host\\(\\[open\\]\\)');
    const notOpen = cssText.includes(':host(:not([open]))') || cssText.includes(':not([open])');
    console.log(`OK ${relative(root, outCss)} ${(await stat(outCss)).size} nestedOpen=${nestedOpen} flatOpen=${flatOpen} notOpen=${notOpen}`);
  }
}

await rebuildOne('diagrams/lightbox.ts', 'helpers');
await rebuildOne('diagrams/theme.ts', 'diagrams');
await rebuildOne('diagrams/diagram-lightbox.ts', 'diagrams');
await rebuildOne('diagrams/er-diagram.ts', 'diagrams');
await rebuildOne('diagrams/er-editor.ts', 'diagrams');
await rebuildOne('diagrams/diagram-studio.ts', 'diagrams');
await rebuildOne('diagrams/flowchart.ts', 'diagrams');
await rebuildOne('layout/preview-component.ts', 'layout');
await rebuildOne('preview/playground.ts', 'preview');
await rebuildOne('feedback/theme-toggle.ts', 'feedback');

// theming page behavior
{
  await mkdir(join(root, 'dist', 'pages'), { recursive: true });
  for (const name of ['icons', 'theming']) {
    const srcTs = join(root, 'src', 'pages', `${name}.ts`);
    try { await access(srcTs); } catch { continue; }
    await build({
      entryPoints: [srcTs],
      outfile: join(root, 'dist', 'pages', `${name}.min.js`),
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      legalComments: 'none',
    });
    try {
      await copyFile(
        join(root, 'src', 'pages', `${name}.json`),
        join(root, 'dist', 'pages', `${name}.json`),
      );
    } catch { /* theming.json siempre existe */ }
    console.log(`OK dist/pages/${name}.min.js + .json`);
  }
}

// theme JSON editable en CDN
try {
  await mkdir(join(dist, 'diagrams', 'themes'), { recursive: true });
  await copyFile(
    join(compRoot, 'diagrams', 'themes', 'insoft.json'),
    join(dist, 'diagrams', 'themes', 'insoft.json'),
  );
  console.log('OK dist/cdn/diagrams/themes/insoft.json');
} catch (e) {
  console.warn('theme json copy failed', e);
}

// gallery SPA
{
  const outfile = join(root, 'dist', 'gallery-app.min.js');
  await build({
    entryPoints: [join(root, 'src', 'gallery', 'app.ts')],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    legalComments: 'none',
    external: ['node:fs', 'node:url'],
  });
  console.log(`OK dist/gallery-app.min.js ${(await stat(outfile)).size}`);
}

console.log('hotfix done');


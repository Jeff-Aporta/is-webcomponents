/** Rebuild solo feedback/cdn-snippet.min.js (+ .min.css). Mismo criterio que build.mjs. */
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readFile, mkdir, readdir, stat } from 'node:fs/promises';
import { bundleMinJs, bundleMinCss, docsBanner } from '../src/cdn/build/bundle-min.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');
const inFile = join(compRoot, 'feedback', 'cdn-snippet.ts');
const tag = 'cdn-snippet';
const folder = 'feedback';
const cssIn = inFile.replace(/\.(ts|js)$/i, '.css');
const outDir = join(dist, folder);
const outJs = join(outDir, `${tag}.min.js`);
const outCss = join(outDir, `${tag}.min.css`);

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
               && !name.name.endsWith('.json')) {
      out.push(p);
    }
  }
  return out;
}

const entries = (await walk(compRoot)).sort();
const manifestMod = await import('../src/manifest.js');
const manifest = manifestMod.default;
const tagToComponent = new Map();
for (const e of entries) {
  const t = basename(e).replace(/\.(ts|js)$/, '');
  tagToComponent.set(t, e);
}
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
const sJs = (await stat(outJs)).size;
console.log(`OK dist/cdn/feedback/cdn-snippet.min.js  ${sJs} B`);
if (hasCss) console.log(`OK dist/cdn/feedback/cdn-snippet.min.css ${(await stat(outCss)).size} B`);

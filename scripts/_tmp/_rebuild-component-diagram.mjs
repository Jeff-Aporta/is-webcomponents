/** Rebuild puntual de component-diagram. */
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readFile, mkdir, readdir, stat } from 'node:fs/promises';
import { bundleMinJs, bundleMinCss, docsBanner } from '../../src/cdn/build/bundle-min.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
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
const manifest = (await import('../../src/manifest.ts')).default;
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
  // SCSS staging (W54): nunca leer .css desde src/
  const cssIn = join(root, '.tmp-scss', 'src', 'components', srcRel.replace(/\.(ts|js)$/i, '.css'));
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
}

await rebuildOne('diagrams/theme.ts', 'diagrams');
await rebuildOne('diagrams/component-pack.ts', 'diagrams');
await rebuildOne('diagrams/component-router.ts', 'diagrams');
await rebuildOne('diagrams/component-spec.ts', 'diagrams');
await rebuildOne('diagrams/component-diagram.ts', 'diagrams');
await rebuildOne('diagrams/er-spec.ts', 'diagrams');
await rebuildOne('diagrams/er-diagram.ts', 'diagrams');
await rebuildOne('diagrams/sequence-spec.ts', 'diagrams');
await rebuildOne('diagrams/sequence-diagram.ts', 'diagrams');
await rebuildOne('diagrams/flowchart-spec.ts', 'diagrams');
await rebuildOne('diagrams/flowchart.ts', 'diagrams');
await rebuildOne('diagrams/class-spec.ts', 'diagrams');
await rebuildOne('diagrams/class-diagram.ts', 'diagrams');

// JSON de tema editable en CDN
try {
  const { mkdir, copyFile } = await import('node:fs/promises');
  await mkdir(join(root, 'dist', 'cdn', 'diagrams', 'themes'), { recursive: true });
  for (const name of ['insoft.json', 'insoft-cd.json']) {
    await copyFile(
      join(root, 'src', 'components', 'diagrams', 'themes', name),
      join(root, 'dist', 'cdn', 'diagrams', 'themes', name),
    );
    console.log(`OK dist/cdn/diagrams/themes/${name}`);
  }
} catch (e) {
  console.warn('theme json copy failed', e);
}

console.log('component-diagram rebuild done');

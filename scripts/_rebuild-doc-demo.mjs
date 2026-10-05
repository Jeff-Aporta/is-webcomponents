/** Rebuild iswc-doc-demo + companions (boot ESM, host module, shell/presentation CSS). */
import { mkdir, stat, readFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { bundleMinJs, bundleMinCss, docsBanner } from '../src/cdn/build/bundle-min.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'cdn');
const previewDist = join(dist, 'preview');
const compRoot = join(root, 'src', 'components');
const layout = join(compRoot, 'layout');

await mkdir(previewDist, { recursive: true });

const banner = docsBanner(['md: src/components/layout/doc-demo.md']);

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
               && !/^doc-demo-(boot|host)\.(ts|js)$/.test(name.name)) {
      out.push(p);
    }
  }
  return out;
}

const entries = await walk(compRoot);
const tagToComponent = new Map();
for (const e of entries) {
  tagToComponent.set(basename(e).replace(/\.(ts|js)$/, ''), e);
}
const manifest = (await import('../src/manifest.js')).default;
const manifestCategoryByTag = new Map(
  manifest.map((m) => [m.tag.replace(/^iswc-/, ''), m.category]),
);
const folderFor = (file) => {
  const tag = basename(file).replace(/\.(ts|js)$/, '');
  if (manifestCategoryByTag.has(tag)) return manifestCategoryByTag.get(tag);
  return relative(compRoot, file).split(/[\\/]/)[0];
};

const coreRoot = join(root, 'src', 'core');

// core/element (defineElement, adoptCss, emit, …) NUNCA externo.
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
      const tag = basename(abs).replace(/\.(ts|js)$/, '');
      if (!tagToComponent.has(tag)) return null;
      return { path: `../${folderFor(abs)}/${tag}.min.js`, external: true };
    });
  },
};

/** Falla si el bundle dejó `defineElement(` bare (sin customElements.define). */
async function assertCoreInlined(outJs) {
  const text = await readFile(outJs, 'utf8');
  const hasDefine = text.includes('customElements.define');
  const bareDefineElement = /(?<![\w$."'])defineElement\s*\(/.test(text);
  if (!hasDefine || bareDefineElement) {
    throw new Error(
      `${relative(root, outJs)}: core/element no inlined `
      + `(customElements.define=${hasDefine}, bare defineElement=${bareDefineElement}). `
      + `¿Falta import { defineElement, … } from '../../core/element.js'?`,
    );
  }
}

const outCss = join(previewDist, 'doc-demo.min.css');
await bundleMinCss(join(layout, 'doc-demo.css'), outCss);
let cssEmbed = '';
try { cssEmbed = await readFile(outCss, 'utf8'); } catch { /* empty */ }

const docDemoOut = join(previewDist, 'doc-demo.min.js');
await build({
  entryPoints: [join(layout, 'doc-demo.ts')],
  outfile: docDemoOut,
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  legalComments: 'none',
  plugins: [externalComponents],
  banner: { js: banner },
  define: { __IS_COMPONENT_CSS__: JSON.stringify(cssEmbed) },
});
await assertCoreInlined(docDemoOut);

await bundleMinJs({
  entry: join(layout, 'doc-demo-boot.ts'),
  outfile: join(previewDist, 'doc-demo-boot.min.js'),
  format: 'esm',
  banner,
});
await bundleMinJs({
  entry: join(layout, 'doc-demo-host.ts'),
  outfile: join(previewDist, 'doc-demo-host.min.js'),
  format: 'esm',
  target: 'es2022',
  banner,
});
await bundleMinCss(join(root, 'src', 'styles', 'shell.css'), join(previewDist, 'doc-shell.min.css'));
await bundleMinCss(join(root, 'src', 'styles', 'presentation.css'), join(previewDist, 'doc-presentation.min.css'));

for (const name of [
  'doc-demo.min.js', 'doc-demo.min.css', 'doc-demo-boot.min.js',
  'doc-demo-host.min.js', 'doc-shell.min.css', 'doc-presentation.min.css',
]) {
  const s = (await stat(join(previewDist, name))).size;
  console.log(`OK preview/${name}  ${s} B`);
}

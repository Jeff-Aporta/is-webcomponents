/** Rebuild preview-controls, playground, select (+ code). Mismo criterio que build.mjs. */
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readFile, mkdir, readdir, stat } from 'node:fs/promises';
import { bundleMinJs, bundleMinCss, docsBanner } from '../src/cdn/build/bundle-min.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');

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
const manifest = (await import('../src/manifest.js')).default;
const tagToComponent = new Map();
for (const e of entries) {
  tagToComponent.set(basename(e).replace(/\.(ts|js)$/, ''), e);
}
const manifestCategoryByTag = new Map(
  manifest.map((m) => [m.tag.replace(/^iswc-/, ''), m.category]),
);
const folderFor = (file) => {
  const t = basename(file).replace(/\.(ts|js)$/, '');
  if (manifestCategoryByTag.has(t)) return manifestCategoryByTag.get(t);
  return relative(compRoot, file).split(/[\\/]/)[0];
};

const coreRoot = join(root, 'src', 'core');

// core/element (defineElement, adoptCss, emit, …) NUNCA externo: sin import
// en el entry, esbuild deja el identificador bare → ReferenceError en runtime.
const externalComponents = {
  name: 'external-components',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      // src/core/** siempre inline (return null = bundle).
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
  await assertCoreInlined(outJs);

  const sJs = (await stat(outJs)).size;
  console.log(`OK dist/cdn/${category}/${tag}.min.js  ${sJs} B`);
  if (hasCss) {
    console.log(`OK dist/cdn/${category}/${tag}.min.css ${(await stat(outCss)).size} B`);
  }
}

await rebuildOne('layout/preview-controls.ts', 'preview');
await rebuildOne('preview/playground.ts', 'preview');
await rebuildOne('forms/select.ts', 'forms');
await rebuildOne('code/code.ts', 'code');

// build-overlays.mjs — Genera los bundles para los 3 webcomponents de la
// categoría overlays (command-palette, pdf-viewer, window).
//
// El build.mjs completo falla porque `src/components/media/media-recorder.ts`
// tiene un bug pre-existente (uso de private field `#attach` antes de su
// declaración en la clase extendida), así que no podemos correr el build
// completo. Este script SOLO procesa la carpeta overlays y respeta el mismo
// protocolo de output del build principal (esbuild + plugin externalComponents
// + defineCss para inline del CSS).
import { build } from 'esbuild';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, basename, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn', 'overlays');
const compRoot = join(root, 'src', 'components');

const OVERLAYS = [
  { tag: 'command-palette', src: join(compRoot, 'overlays', 'command-palette.ts'), css: join(compRoot, 'overlays', 'command-palette.css') },
  { tag: 'pdf-viewer',       src: join(compRoot, 'overlays', 'pdf-viewer.ts'),       css: join(compRoot, 'overlays', 'pdf-viewer.css') },
  { tag: 'window',           src: join(compRoot, 'overlays', 'window.ts'),           css: join(compRoot, 'overlays', 'window.css') },
];

// tagToComponent — para resolver dependencias externas (otros componentes).
// Cualquier `import '../algo/algo.js'` o similar se externaliza si el
// basename (sin .js) está en este mapa. Cargamos solo los overlays + las
// dependencias reales que usan (icon, button).
const tagToComponent = new Map();
for (const o of OVERLAYS) {
  tagToComponent.set(o.tag, o.src);
}
// Dependencias externas que usan los overlays:
tagToComponent.set('icon',   join(compRoot, 'media', 'icon.ts'));
tagToComponent.set('button', join(compRoot, 'actions', 'button.ts'));

const externalComponents = {
  name: 'external-components',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      if (!abs.startsWith(compRoot)) return null;
      // base-sheets va externo, mismo criterio que el build principal
      if (basename(abs).replace(/\.(ts|js)$/, '') === 'base-sheets') {
        return { path: '../_shared/base-sheets.min.js', external: true };
      }
      // _shared/* se inline (excepto base-sheets, ya cubierto arriba)
      if (abs.includes(`${sep}_shared${sep}`)) return null;
      const tag = basename(abs).replace(/\.(ts|js)$/, '');
      if (!tagToComponent.has(tag)) return null;
      const ref = tagToComponent.get(tag);
      const folder = relative(compRoot, ref).split(/[\\/]/)[0];
      return { path: `../${folder}/${tag}.min.js`, external: true };
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

const bundleCss = (entry, outfile) =>
  build({ entryPoints: [entry], outfile, minify: true, bundle: true });

const bundleJs = (entry, outfile, plugins, banner, define) =>
  build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    plugins,
    ...(define ? { define } : {}),
    ...(banner ? { banner: { js: banner } } : {}),
  });

const GH_RAW = 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main';
const docsBanner = (tag) =>
  ['/*!',
   ' * IS Web Components - docs (LLM)',
   ` * component: ${GH_RAW}/src/components/overlays/${tag}.md`,
   ` * kit: ${GH_RAW}/specs/componentes.md`,
   ' */'].join('\n');

await mkdir(dist, { recursive: true });

// Emite los CSS base compartidos de la carpeta.
await bundleCss(
  join(compRoot, '_shared', 'host-base.css'),
  join(dist, 'host-base.css'),
);
await bundleCss(
  join(compRoot, '_shared', 'scrollbars.css'),
  join(dist, 'scrollbars.css'),
);

for (const o of OVERLAYS) {
  const outJs = join(dist, `${o.tag}.min.js`);
  const outCss = join(dist, `${o.tag}.min.css`);

  // bundle CSS (con @import reescritos a hermanos .min.css si existieran)
  try {
    await bundleCss(o.css, outCss);
    // reescribe @import './_surface-bar.css' → './_surface-bar.min.css' si aplica
    let css = await readFile(outCss, 'utf8');
    const next = css.replace(
      /@import\s*(url\(\s*)?["'](\.\/)?([\w-]+)\.css["']\s*\)?/g,
      (whole, _u, _d, name) => whole,
    );
    if (next !== css) await import('node:fs/promises').then(({ writeFile }) => writeFile(outCss, next));
  } catch (e) {
    console.warn(`  [warn] no se pudo bundlear CSS de ${o.tag}: ${e?.message ?? e}`);
  }

  // bundle JS con CSS inline + dependencias externalizadas.
  const cssText = await readFile(outCss, 'utf8').catch(() => '');
  const define = cssText ? { __IS_COMPONENT_CSS__: JSON.stringify(cssText) } : undefined;

  await bundleJs(o.src, outJs, [externalComponents], docsBanner(o.tag), define);
  const [inStat, outStat] = await Promise.all([stat(o.src), stat(outJs)]);
  console.log(`  overlays/${o.tag.padEnd(18)} js  ${String(inStat.size).padStart(6)} → ${String(outStat.size).padStart(6)}`);
}

console.log(`OK dist/cdn/overlays  (${OVERLAYS.length} components)`);
// bundle-scripts.mjs — bundlea los gallery scripts (../scripts/*.js) como
// ESM a ../dist/scripts/*.min.js. Necesario porque los scripts originales
// hacen `import '../src/...` (TypeScript source paths) que NO se sirven en
// GitHub Pages. Tras esto, el `index.html` y el `gallery-app.min.js`
// cargan rutas exclusivamente `dist/...`, que sí están publicadas.
//
// Lista de bundles: misma lista que `loadPageModules()` en index.html.
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

const scripts = [
  'highlight-pre',
  'demo-code',
  'docs-chrome',
  'cdn-panel',
  'view-sources',
  'demo-file-meta',
];

await mkdir('dist/scripts', { recursive: true });

let ok = 0;
let failed = 0;
for (const name of scripts) {
  try {
    await build({
      entryPoints: [`scripts/${name}.js`],
      outfile: `dist/scripts/${name}.min.js`,
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      legalComments: 'none',
      sourcemap: false,
      treeShaking: true,
      // `../src/...` resuelve a archivos .ts/.js directos. esbuild los
      // procesa. Se importan con la extensión real para evitar ambigüedad.
      resolveExtensions: ['.ts', '.js', '.tsx', '.mjs'],
      // Mantener imports de CSS/text como texto (no se usan en estos scripts
      // pero por si acaso los conserva).
      loader: { '.ts': 'ts', '.js': 'js' },
    });
    console.log(`  ✓ dist/scripts/${name}.min.js`);
    ok++;
  } catch (err) {
    console.error(`  ✗ dist/scripts/${name}.min.js — ${err}`);
    failed++;
  }
}

console.log(`\nOK ${ok}/${scripts.length} scripts bundleados${failed ? ` (${failed} fallaron)` : ''}.`);

// bundle-demos.mjs — rebuilds dist/cdn/diagrams/er-{diagram,editor}.min.js
// desde src/. Necesario porque los HTML de los demos cargan desde dist/cdn/ y
// el build principal (npm run build) tiene fallos pre-existentes en otros
// componentes (media-recorder.ts: Private name "#attach"). Sólo recompilamos
// lo que los demos necesitan.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/components/diagrams/er-diagram.ts'],
  bundle: true, format: 'esm', target: 'es2020',
  outfile: 'dist/cdn/diagrams/er-diagram.min.js',
  minify: true, sourcemap: false, treeShaking: true,
});
console.log('OK er-diagram.min.js');

await build({
  entryPoints: ['src/components/diagrams/er-editor.ts'],
  bundle: true, format: 'esm', target: 'es2020',
  outfile: 'dist/cdn/diagrams/er-editor.min.js',
  minify: true, sourcemap: false, treeShaking: true,
});
console.log('OK er-editor.min.js');
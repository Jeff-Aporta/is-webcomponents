// build-phase8.mjs — Build ONLY the new Phase 8 components into dist/cdn
// (Skips video.js which has a pre-existing esbuild/private-field bug NOT in scope here.)
import { build } from 'esbuild';
import { access, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
await mkdir(dist, { recursive: true });

const NEW = [
  ['src/components/navigation/stepper.js', 'src/components/navigation/stepper.css'],
  ['src/components/actions/fab.js', 'src/components/actions/fab.css'],
  ['src/components/feedback/popconfirm.js', 'src/components/feedback/popconfirm.css'],
  ['src/components/forms/pin-input.js', 'src/components/forms/pin-input.css'],
  ['src/components/data/stat.js', 'src/components/data/stat.css'],
  ['src/components/data/transfer.js', 'src/components/data/transfer.css'],
  ['src/components/data/gauge.js', 'src/components/data/gauge.css'],
  ['src/components/data/kanban.js', 'src/components/data/kanban.css'],
  ['src/components/feedback/cdn-snippet.js', 'src/components/feedback/cdn-snippet.css'],
];

const bundleJs = (entry, out) => build({
  entryPoints: [entry], outfile: out, bundle: true, minify: true,
  format: 'esm', target: 'es2020', legalComments: 'none',
});
const bundleCss = (entry, out) => build({
  entryPoints: [entry], outfile: out, minify: true,
});

for (const [js, css] of NEW) {
  const tag = js.split('/').pop().replace(/\.js$/, '');
  const inJs = join(root, js);
  const inCss = join(root, css);
  const outJs = join(dist, `${tag}.min.js`);
  const outCss = join(dist, `${tag}.min.css`);
  await bundleJs(inJs, outJs);
  const hasCss = await access(inCss).then(() => true, () => false);
  if (hasCss) await bundleCss(inCss, outCss);
  const j = await stat(inJs);
  const jOut = await stat(outJs);
  const c = hasCss ? String((await stat(outCss)).size) : '—';
  console.log(`  ${tag.padEnd(18)} js ${String(j.size).padStart(6)}→${String(jOut.size).padStart(6)}  css ${c.padStart(6)}`);
}

console.log('OK Phase 8 build');

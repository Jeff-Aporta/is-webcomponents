// build-phase8.mjs — Build ONLY the new Phase 8 components into dist/cdn
// (Skips video.js which has a pre-existing esbuild/private-field bug NOT in scope here.)
import { build } from 'esbuild';
import { access, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist', 'cdn');
await mkdir(dist, { recursive: true });

const NEW = [
  ['components/navigation/stepper.js', 'components/navigation/stepper.css'],
  ['components/actions/fab.js', 'components/actions/fab.css'],
  ['components/feedback/popconfirm.js', 'components/feedback/popconfirm.css'],
  ['components/forms/pin-input.js', 'components/forms/pin-input.css'],
  ['components/data/stat.js', 'components/data/stat.css'],
  ['components/data/transfer.js', 'components/data/transfer.css'],
  ['components/data/gauge.js', 'components/data/gauge.css'],
  ['components/data/kanban.js', 'components/data/kanban.css'],
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

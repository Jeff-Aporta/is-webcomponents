import { bundleMinCss, bundleMinJs, docsBanner } from '../src/cdn/build/bundle-min.ts';
import { build } from 'esbuild';
import { copyFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'cdn');
const core = join(dist, 'core');
await bundleMinCss(join(root,'src/styles/is-base.css'), join(core,'is-base.min.css'));
await bundleMinCss(join(root,'src/styles/palettes.css'), join(core,'palettes.min.css'));
await copyFile(join(core,'is-base.min.css'), join(dist,'is-base.min.css'));
await copyFile(join(core,'palettes.min.css'), join(dist,'palettes.min.css'));
await bundleMinCss(join(root,'src/components/actions/button.css'), join(dist,'actions/button.min.css'));
await bundleMinJs({
  entry: join(root,'src/components/actions/button.ts'),
  outfile: join(dist,'actions/button.min.js'),
  banner: docsBanner([
    'md: src/components/actions/button.md',
    'specs/componentes.md',
    'src/cdn/loader.md',
    'is-cdn-install/SKILL.md',
  ]),
});
await bundleMinJs({ entry: join(root,'src/components/feedback/theme-toggle.ts'), outfile: join(dist,'feedback/theme-toggle.min.js'), banner: docsBanner(['rebuild: theme-toggle']) });
await build({ entryPoints: [join(root,'src/gallery/app.ts')], outfile: join(root,'dist/gallery-app.min.js'), bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'none', external: ['node:fs','node:url'] });
for (const p of ['dist/cdn/palettes.min.css','dist/cdn/actions/button.min.css','dist/gallery-app.min.js','dist/cdn/feedback/theme-toggle.min.js']) {
  console.log(p, (await stat(join(root,p))).size);
}

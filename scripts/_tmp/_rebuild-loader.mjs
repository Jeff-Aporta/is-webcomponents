/** Rebuild solo loader.min.js (+ alias + loader.md). Hashes desde dist/cdn/asset-hashes.json. */
import { readFile, writeFile, copyFile, mkdir, stat, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, dirname, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleLoader, docsBanner } from '../src/cdn/build/bundle-min.ts';
import { hashFile, hashesJson, ASSET_HASHES_NAME } from '../src/cdn/build/stamp-hashes.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
const coreDist = join(dist, 'core');
const compRoot = join(root, 'src', 'components');

const GH_RAW = 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main';
const KIT_SKILL = `${GH_RAW}/skills/is-webcomponents/SKILL.md`;
const CDN_SKILL = `${GH_RAW}/skills/is-cdn-install/SKILL.md`;
const CDN_COMP_INDEX = `${GH_RAW}/specs/componentes.md`;
const CDN_LOADER_MD = `${GH_RAW}/src/cdn/loader.md`;

function shaDelBuild() {
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  } catch { /* sin git */ }
  return 'main';
}

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
const manifestMod = await import('../src/manifest.js');
const manifest = manifestMod.default;
const byCategory = new Map();
for (const m of manifest) {
  if (!byCategory.has(m.category)) byCategory.set(m.category, []);
  byCategory.get(m.category).push(m);
}

const tagToComponent = new Map();
for (const e of entries) {
  const tag = basename(e).replace(/\.(ts|js)$/, '');
  tagToComponent.set(tag, e);
}

const loaderCatalog = {
  aliases: { charts: 'data-viz', 'data-viz': 'data-viz', dataviz: 'data-viz' },
  categories: {},
  tags: {},
};
for (const [category, items] of byCategory) {
  const files = [];
  for (const m of items) {
    const file = m.tag.replace(/^iswc-/, '');
    if (!tagToComponent.has(file)) continue;
    files.push(file);
    loaderCatalog.tags[m.tag] = { category, file };
    loaderCatalog.tags[file] = { category, file };
  }
  if (files.length) loaderCatalog.categories[category] = files;
}

const hashesPath = join(dist, ASSET_HASHES_NAME);
let hashes;
try {
  const raw = JSON.parse(await readFile(hashesPath, 'utf8'));
  hashes = raw.files ?? raw;
} catch {
  console.error(`ERROR: falta ${hashesPath} — corre deno task build al menos una vez.`);
  process.exit(1);
}

await mkdir(coreDist, { recursive: true });
await copyFile(join(root, 'src', 'cdn', 'loader.md'), join(coreDist, 'loader.md'));

const loaderSrc = join(root, 'src', 'cdn', 'loader.ts');
const loaderOut = join(coreDist, 'loader.min.js');
const loaderBanner = docsBanner([
  `kit-skill: ${KIT_SKILL}`,
  `md: ${CDN_LOADER_MD}`,
  `specs: ${CDN_COMP_INDEX}`,
  `cdn-copy: dist/cdn/core/loader.md`,
  `kit: ${CDN_COMP_INDEX}`,
  `cdn-install: ${CDN_SKILL}`,
]);

await bundleLoader({
  entry: loaderSrc,
  outfile: loaderOut,
  banner: loaderBanner,
  catalog: loaderCatalog,
  hashes,
  sha: shaDelBuild(),
});

const loaderHash = await hashFile(loaderOut);
hashes['core/loader.min.js'] = loaderHash;
hashes['loader.min.js'] = loaderHash;
await copyFile(loaderOut, join(dist, 'loader.min.js'));
await writeFile(hashesPath, hashesJson(hashes));

const sCore = (await stat(loaderOut)).size;
const sAlias = (await stat(join(dist, 'loader.min.js'))).size;
console.log(`OK core/loader.min.js  ${sCore} B`);
console.log(`OK loader.min.js (alias) ${sAlias} B`);
console.log(`OK core/loader.md`);
console.log(`  ${Object.keys(loaderCatalog.categories).length} cats, ${Object.keys(hashes).length} hashes, sha=${shaDelBuild().slice(0, 7)}…`);

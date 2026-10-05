/**
 * watch.mjs — rebuild incremental de dist/ sin borrar todo + serve opcional.
 *
 *   deno task watch          # solo watcher (serve ya en :8391)
 *   deno task watch --serve  # serve + watcher
 *
 * La galería carga dist/cdn (preferSelf). CSS de shell/presentation va desde
 * src/ (refresh basta). Componentes / preview / gallery-app → este watcher.
 *
 * Ademas escribe `dist/cdn/reload-pin` cada vez que cambia un archivo
 * observado: el cliente embebido en cada HTML (`scripts/inject-reload.mjs`)
 * hace polling de ese endpoint y recarga el browser. Es agnóstico del
 * static server (deno serve, Live Server, python -m http.server, etc.).
 */
import { watch, existsSync } from 'node:fs';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { bundleMinJs, bundleMinCss, docsBanner } from '../src/cdn/build/bundle-min.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');
const wantServe = process.argv.includes('--serve');

const manifestMod = await import('../src/manifest.js');
const manifest = manifestMod.default;
const catByTag = new Map(manifest.map((m) => [m.tag.replace(/^iswc-/, ''), m.category]));

function folderFor(file) {
  const tag = basename(file).replace(/\.(ts|js)$/, '');
  if (catByTag.has(tag)) return catByTag.get(tag);
  return relative(compRoot, file).split(/[\\/]/)[0];
}

const tagToFile = new Map();
async function walk(dir) {
  const { readdir } = await import('node:fs/promises');
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '_shared') continue;
      await walk(p);
    } else if (/\.(ts|js)$/.test(name.name) && !name.name.endsWith('.d.ts')
      && !name.name.includes('.preview.') && !name.name.includes('.selfcheck.')
      && name.name !== 'index.ts' && name.name !== 'index.js') {
      tagToFile.set(basename(name.name).replace(/\.(ts|js)$/, ''), p);
    }
  }
}
await walk(compRoot);

const externalComponents = {
  name: 'external-components',
  setup(b) {
    b.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      if (basename(abs).replace(/\.(ts|js)$/, '') === 'base-sheets') {
        return { path: '../_shared/base-sheets.min.js', external: true };
      }
      if (!abs.startsWith(compRoot)) return null;
      if (abs.includes(`${sep}_shared${sep}`)) return null;
      const tag = basename(abs).replace(/\.(ts|js)$/, '');
      if (!tagToFile.has(tag)) return null;
      return { path: `../${folderFor(abs)}/${tag}.min.js`, external: true };
    });
  },
};

async function defineCss(cssFile) {
  try {
    return { __IS_COMPONENT_CSS__: JSON.stringify(await readFile(cssFile, 'utf8')) };
  } catch {
    return undefined;
  }
}

async function rebuildComponent(inFile) {
  const tag = basename(inFile).replace(/\.(ts|js)$/, '');
  const folder = folderFor(inFile);
  const outDir = join(dist, folder);
  await mkdir(outDir, { recursive: true });
  const cssIn = inFile.replace(/\.(ts|js)$/i, '.css');
  const outJs = join(outDir, `${tag}.min.js`);
  const outCss = join(outDir, `${tag}.min.css`);
  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleMinCss(cssIn, outCss);
  await bundleMinJs({
    entry: inFile,
    outfile: outJs,
    plugins: [externalComponents],
    banner: docsBanner([`watch: ${tag}`]),
    define: hasCss ? await defineCss(outCss) : undefined,
  });
  const sz = (await stat(outJs)).size;
  console.log(`  ✓ ${folder}/${tag}.min.js (${sz} B)`);
}

async function rebuildGallery() {
  const outfile = join(root, 'dist', 'gallery-app.min.js');
  await build({
    entryPoints: [join(root, 'src', 'gallery', 'app.ts')],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    // load-json.ts: imports node:* solo en tests; en browser usa fetch.
    external: ['node:fs', 'node:url'],
  });
  console.log(`  ✓ dist/gallery-app.min.js (${(await stat(outfile)).size} B)`);
}

async function rebuildPreviewShell() {
  for (const tag of ['preview-component', 'scrollspy']) {
    const file = tagToFile.get(tag);
    if (file) await rebuildComponent(file);
  }
}

function classify(rel) {
  const n = rel.replace(/\\/g, '/');
  if (n.startsWith('src/styles/')) return { kind: 'css-src' };
  if (n.startsWith('src/gallery/')) return { kind: 'gallery' };
  if (n.startsWith('src/previews/_kit/') || n.includes('preview-component') || n.includes('scrollspy')) {
    return { kind: 'preview-shell' };
  }
  if (n.startsWith('src/components/')) {
    const m = n.match(/^src\/components\/[^/]+\/([^/]+)\.(ts|js|css|json)$/);
    if (m) {
      const tag = m[1];
      if (tagToFile.has(tag)) return { kind: 'component', file: tagToFile.get(tag) };
    }
    return { kind: 'preview-shell' }; // _shared u otros → shell por seguridad
  }
  if (n.startsWith('src/pages/') || n === 'src/manifest.ts' || n === 'src/manifest.js') {
    return { kind: 'gallery' };
  }
  return { kind: 'skip' };
}

let timer = null;
const pending = new Set();
let busy = false;

/**
 * Escribe un hash nuevo en `dist/cdn/reload-pin` para que los clientes
 * embebidos lo detecten y recarguen. Devuelve el valor escrito.
 */
async function writeReloadPin() {
  const pinPath = join(dist, 'reload-pin');
  // timestamp base36 + sufijo aleatorio => siempre cambia entre llamadas
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(pinPath, `${token}\n`, 'utf8');
  return token;
}

async function flush() {
  if (busy) return;
  const files = [...pending];
  pending.clear();
  if (!files.length) return;
  busy = true;
  const jobs = new Set();
  const comps = new Set();
  for (const f of files) {
    const c = classify(f);
    if (c.kind === 'css-src') {
      console.log(`[watch] ${f} → CSS src (solo refresh en el navegador)`);
      continue;
    }
    if (c.kind === 'gallery') jobs.add('gallery');
    else if (c.kind === 'preview-shell') jobs.add('preview-shell');
    else if (c.kind === 'component') comps.add(c.file);
  }
  // Cualquier cambio dispara reload, incluso cuando no hay rebuild.
  const token = await writeReloadPin().catch((e) => {
    console.error('[watch] reload-pin falló:', e?.message ?? e);
    return null;
  });
  const t0 = Date.now();
  try {
    if (jobs.has('preview-shell')) await rebuildPreviewShell();
    for (const file of comps) await rebuildComponent(file);
    if (jobs.has('gallery')) await rebuildGallery();
    if (jobs.size || comps.size) {
      console.log(`[watch] listo en ${Date.now() - t0}ms — reload-pin (Live Server / cualquier static)`);
    } else if (token) {
      console.log(`[watch] reload-pin → ${token} (cambio sin rebuild)`);
    }
  } catch (e) {
    console.error('[watch] error', e?.message ?? e);
  } finally {
    busy = false;
    if (pending.size) flush();
  }
}

function schedule(rel) {
  pending.add(rel);
  clearTimeout(timer);
  timer = setTimeout(flush, 350);
}

function startWatcher() {
  const src = join(root, 'src');
  watch(src, { recursive: true }, (_ev, file) => {
    if (!file) return;
    if (/\.(ts|js|css|json|md)$/i.test(file) === false) return;
    if (file.includes(`${sep}.`) || file.includes('node_modules')) return;
    schedule(`src/${file.replace(/\\/g, '/')}`);
  });
  console.log(`[watch] mirando ${src}`);
  console.log('[watch] edita src/ → rebuild parcial → reload-pin (agnóstico del static server)');

  // Otros directorios observados SOLO para refresh (sin rebuild). El cliente
  // embebido recarga el browser, sin importar qué static server sirva los
  // archivos (deno serve, Live Server, python -m http.server, ...).
  const refreshDirs = ['demos', 'previews', 'styles'];
  for (const d of refreshDirs) {
    const dir = join(root, d);
    if (!existsSync(dir)) continue;
    watch(dir, { recursive: true }, (_ev, file) => {
      if (!file) return;
      if (/\.(html?|ts|js|mjs|css|json|md|svg|png|jpg|jpeg|webp|woff2)$/i.test(file) === false) return;
      if (file.includes(`${sep}.`) || file.includes('node_modules')) return;
      schedule(`${d}/${file.replace(/\\/g, '/')}`);
    });
    console.log(`[watch] mirando ${dir} (refresh)`);
  }

  // index.html en la raíz.
  const idx = join(root, 'index.html');
  if (existsSync(idx)) {
    watch(idx, () => schedule('index.html'));
    console.log(`[watch] mirando ${idx} (refresh)`);
  }

  // dist/cdn/: trigger refresh cuando cambian bundles (sin contar reload-pin,
  // que es lo que escribimos nosotros — bucle evitado).
  const cdnDir = join(root, 'dist', 'cdn');
  if (existsSync(cdnDir)) {
    watch(cdnDir, { recursive: true }, (_ev, file) => {
      if (!file) return;
      if (file === 'reload-pin' || file.endsWith(`${sep}reload-pin`)) return;
      if (/\.(js|css|json|html?|svg|png|jpg|jpeg|webp|woff2|map|md)$/i.test(file) === false) return;
      schedule(`dist/cdn/${file.replace(/\\/g, '/')}`);
    });
    console.log(`[watch] mirando ${cdnDir} (refresh)`);
  }
}

if (wantServe) {
  const child = spawn('deno', ['run', '-A', '--no-check', 'scripts/serve.mjs'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => {
    console.error(`[watch] serve salió (${code})`);
    process.exit(code ?? 1);
  });
}

startWatcher();
try {
  await rebuildPreviewShell();
  await rebuildGallery();
  await writeReloadPin().catch((e) => {
    console.error('[watch] reload-pin inicial falló:', e?.message ?? e);
  });
  console.log('[watch] baseline listo');
} catch (e) {
  console.error('[watch] baseline falló (el watcher sigue):', e?.message ?? e);
}

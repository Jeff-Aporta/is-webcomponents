/**
 * scripts/download-iconify.ts
 *
 * Escanea un proyecto consumidor de IS Web Components, detecta ids Iconify
 * (`colección:nombre`) en `<is-icon icon="…">` / literales, y descarga cada SVG
 * a `outputDir/<colección>/<nombre>.svg`.
 *
 * Cascada por icono (igual que `<is-icon>` en runtime):
 *   1. CDN propio del kit (GitHub Pages + jsDelivr)
 *   2. API pública de Iconify
 *
 * Uso (desde el proyecto consumidor o desde este repo):
 *   node path/to/download-iconify.ts --projectRoot=. --outputDir=dist/assets/icons
 *   node scripts/download-iconify.ts --projectRoot=../mi-app --outputDir=dist/assets/icons
 *
 * También exporta `downloadIconifyIcons(options)` para invocarlo desde otro script.
 *
 * Port adaptado de ISP-SvelteComponents `src/lib/tools/download-iconify.js`
 * (allí escaneaba `<Iconify icon=…>`; aquí escanea `<is-icon …>`).
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rgxIsIconTag = /<is-icon\s+([^>]+)\/?>/gi;
const rgxStringIcon = /(['"])([a-z0-9-]+:[a-z0-9-]+)\1/g;
const supportedSourceExtensions = new Set([
  '.html', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.svelte', '.vue', '.md',
]);
const playgroundDirFragment = '/playground';

/** Colecciones que no son Iconify (imports Node, directivas, helpers…). */
const NON_ICON_COLLECTIONS = new Set([
  'about', 'bind', 'component', 'connect', 'design', 'display', 'env', 'esbuild', 'focus',
  'hello', 'hover', 'http-proxy-3', 'legacy-compat', 'native', 'node', 'og', 'oxc', 'sea',
  'sourcemap', 'status-value', 'svelte', 'tinyspy', 'twitter', 'typescript', 'util', 'vite',
  'xml', 'xlink',
]);

/** Bases CDN del kit (mismo orden que `components/_shared/icon-loader.js`). */
const OWN_CDN_BASES = [
  'https://jeff-aporta.github.io/is-webcomponents/dist/assets/icons/',
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/assets/icons/',
];

const log = {
  dim: (m) => `\x1b[2m${m}\x1b[0m`,
  cyan: (m) => `\x1b[36m${m}\x1b[0m`,
  white: (m) => `\x1b[37m${m}\x1b[0m`,
  green: (m) => `\x1b[32m${m}\x1b[0m`,
  yellow: (m) => `\x1b[33m${m}\x1b[0m`,
  red: (m) => `\x1b[31m${m}\x1b[0m`,
  blueBright: (m) => `\x1b[1m\x1b[34m${m}\x1b[0m`,
  greenBright: (m) => `\x1b[1m\x1b[32m${m}\x1b[0m`,
};

function getAttrValue(tagContent, attrName) {
  const rgxDoubleQuoted = new RegExp(`${attrName}="([^"]*)"`);
  const rgxSingleQuoted = new RegExp(`${attrName}='([^']*)'`);
  const rgxBraced = new RegExp(`${attrName}=\\{([^}]*)\\}`);
  return rgxDoubleQuoted.exec(tagContent)?.[1]
    ?? rgxSingleQuoted.exec(tagContent)?.[1]
    ?? rgxBraced.exec(tagContent)?.[1]
    ?? null;
}

function getCandidates(value) {
  if (!value) return [];
  if (!/[${}?|]/.test(value)) return [value.trim()];
  const matches = value.match(/['"]([^'"]+)['"]/g) || [];
  return [...new Set(matches.map((m) => m.replace(/['"]/g, '').trim()))];
}

function isValidIcon(v) {
  if (!v || /[\s()]/.test(v)) return false;
  const parts = v.split(':');
  const col = parts[0];
  const name = parts[1];
  if (!col || !name || !/^[a-z0-9-]+$/.test(col) || !/^[a-z0-9-]+$/.test(name)) return false;
  if (/^[0-9]+$/.test(name)) return false;
  if (col === 'coleccion') return false;
  if (NON_ICON_COLLECTIONS.has(col)) return false;
  return true;
}

function httpsGetBuffer(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const text = buf.toString('utf8');
          if (!text.includes('<svg')) return resolve(null);
          resolve(buf);
        });
      })
      .on('error', () => resolve(null));
  });
}

function ownCdnUrls(collection, name) {
  const rel = `${collection}/${name}.svg`;
  return OWN_CDN_BASES.map((base) => base + rel);
}

/** Una petición: existe / descargado (cdn|iconify) / error. */
async function downloadSVGOnce(icon, outputDir, verbose, logError) {
  const parts = icon.split(':');
  if (parts.length !== 2) return { ok: true, skipped: true };

  const collection = parts[0];
  const name = parts[1];
  const collectionDir = path.join(outputDir, collection);
  const filePath = path.join(collectionDir, `${name}.svg`);

  if (fs.existsSync(filePath)) {
    if (verbose) console.log(`    ${log.yellow('[EXISTE]')} ${icon}`);
    return { ok: true, skipped: false, existed: true };
  }

  let body = null;
  let source = null;

  for (const url of ownCdnUrls(collection, name)) {
    body = await httpsGetBuffer(url);
    if (body) {
      source = 'cdn';
      break;
    }
  }

  if (!body) {
    body = await httpsGetBuffer(`https://api.iconify.design/${icon}.svg`);
    if (body) source = 'iconify';
  }

  if (!body) {
    if (logError) console.error(`    ${log.red('[ERROR]')} no encontrado ${icon}`);
    return { ok: false };
  }

  try {
    fs.mkdirSync(collectionDir, { recursive: true });
    fs.writeFileSync(filePath, body);
    if (verbose) {
      const tag = source === 'cdn' ? '[CDN]' : '[ICONIFY]';
      console.log(`    ${log.green(tag)} ${icon}`);
    }
    return { ok: true, skipped: false, existed: false, source };
  } catch (err) {
    if (logError) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    ${log.red('[ERROR ESCRITURA]')} ${icon}: ${msg}`);
    }
    try { fs.unlinkSync(filePath); } catch { /* empty */ }
    return { ok: false };
  }
}

async function downloadSVG(icon, outputDir, opts, cache, loggedErrors) {
  const options = opts || {};
  const verbose = options.verbose !== false;
  if (cache.has(icon)) return cache.get(icon);
  const task = (async () => {
    const logError = !loggedErrors.has(icon);
    loggedErrors.add(icon);
    const r = await downloadSVGOnce(icon, outputDir, verbose, logError);
    if (r.ok) {
      if (r.skipped) return 'skipped';
      return r.existed ? 'existed' : 'downloaded';
    }
    return 'failed';
  })();
  cache.set(icon, task);
  return task;
}

function normalizeSkipDirNames(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

function mergeStatuses(statuses) {
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('downloaded')) return 'downloaded';
  return 'existed';
}

function extractIconsFromFileContent(content) {
  const icons = [];
  let m;
  const re = new RegExp(rgxIsIconTag.source, rgxIsIconTag.flags);
  while ((m = re.exec(content)) !== null) {
    const raw = getAttrValue(m[1], 'icon') ?? getAttrValue(m[1], 'name');
    if (!raw) continue;
    const fixedCollectionMatch = raw.match(/^([a-z0-9-]+):/);
    const fixedCollection = fixedCollectionMatch ? fixedCollectionMatch[1] : null;
    const candidates = getCandidates(raw).filter(isValidIcon);
    for (const name of candidates) {
      const full = !name.includes(':') && fixedCollection ? `${fixedCollection}:${name}` : name;
      if (full.includes(':')) icons.push(full);
    }
  }
  let sm;
  const sre = new RegExp(rgxStringIcon.source, rgxStringIcon.flags);
  while ((sm = sre.exec(content)) !== null) {
    if (isValidIcon(sm[2])) icons.push(sm[2]);
  }
  return [...new Set(icons)];
}

/**
 * @param {{
 *   projectRoot: string,
 *   outputDir: string,
 *   scanDirs?: string[],
 *   skipDirNames?: string|string[],
 *   verbose?: boolean,
 * }} options
 */
export async function downloadIconifyIcons(options) {
  if (options == null) {
    throw new Error('downloadIconifyIcons: se requiere un objeto `options`.');
  }
  if (typeof options.outputDir !== 'string' || !options.outputDir.trim()) {
    throw new Error('downloadIconifyIcons: `outputDir` es obligatorio (ruta de salida de los SVG).');
  }
  if (typeof options.projectRoot !== 'string' || !options.projectRoot.trim()) {
    throw new Error('downloadIconifyIcons: `projectRoot` es obligatorio (raíz del proyecto a escanear).');
  }

  const projectRoot = path.resolve(options.projectRoot.trim());
  const outputDir = path.isAbsolute(options.outputDir)
    ? path.resolve(options.outputDir)
    : path.resolve(projectRoot, options.outputDir);

  const verbose = options.verbose !== false;
  const skip = new Set(normalizeSkipDirNames(options.skipDirNames));
  // Carpetas ruidosas por defecto en monorepos / builds.
  for (const d of ['node_modules', 'dist', '.git', 'assets', 'coverage', '.wrangler']) {
    skip.add(d);
  }

  let scanRoots = (options.scanDirs || [projectRoot]).map((d) => path.resolve(d));
  scanRoots = [...new Set(scanRoots)];

  if (verbose) {
    console.log(`${log.blueBright('--- Iconify (IS WC): escaneo ---')}\n`);
    console.log(`${log.dim('projectRoot:')} ${projectRoot}`);
    console.log(`${log.dim('outputDir:')} ${outputDir}`);
    console.log(`${log.dim('scanRoots:')} ${scanRoots.join(', ')}\n`);
    console.log(`${log.dim('cascada:')} CDN propio → api.iconify.design\n`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const pendingIcons = new Map();
  const downloadCache = new Map();
  const loggedErrors = new Set();

  function visitFile(fullPath) {
    const ext = path.extname(fullPath);
    if (!supportedSourceExtensions.has(ext)) return;
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      if (verbose) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ${log.red('[ERROR LECTURA]')} ${fullPath}: ${msg}`);
      }
      return;
    }
    const icons = extractIconsFromFileContent(content);
    if (!icons.length) return;
    const rel = path.relative(projectRoot, fullPath);
    for (const icon of icons) {
      if (!pendingIcons.has(icon)) pendingIcons.set(icon, rel);
    }
  }

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const full = path.join(dir, name);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        const fullNorm = full.split(path.sep).join('/');
        if (skip.has(name) || fullNorm.includes(playgroundDirFragment)) continue;
        walk(full);
      } else {
        visitFile(full);
      }
    }
  }

  for (const root of scanRoots) walk(root);

  const promises = [];
  for (const [icon, rel] of pendingIcons) {
    if (verbose) {
      console.log(`${log.cyan('Archivo:')} ${log.white(rel)}`);
      console.log(`  ${log.white('[icono]')} ${icon}`);
    }
    promises.push(
      downloadSVG(icon, outputDir, { verbose }, downloadCache, loggedErrors).then((status) => ({
        icon,
        status,
      })),
    );
  }

  const rows = await Promise.all(promises);
  const byIcon = new Map();
  for (const row of rows) {
    if (row.status === 'skipped') continue;
    const list = byIcon.get(row.icon) ?? [];
    list.push(row.status);
    byIcon.set(row.icon, list);
  }

  const existed = [];
  const downloaded = [];
  const failed = [];
  for (const [icon, statuses] of byIcon.entries()) {
    const m = mergeStatuses(statuses);
    if (m === 'failed') failed.push(icon);
    else if (m === 'downloaded') downloaded.push(icon);
    else existed.push(icon);
  }

  if (verbose) {
    console.log(`\n${log.greenBright('--- Iconify (IS WC): fin ---')}`);
    console.log(`\n${log.blueBright('Resumen (por id de icono)')}`);
    console.log(`  ${log.yellow('Ya existían:')} ${existed.length}`);
    console.log(`  ${log.green('Descargados:')} ${downloaded.length}`);
    console.log(`  ${log.red('Error:')} ${failed.length}`);
  }

  return { existed, downloaded, failed };
}

function parseArgs(argv) {
  const out = { projectRoot: null, outputDir: null, scanDirs: null, verbose: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--projectRoot' || a.startsWith('--projectRoot=')) {
      out.projectRoot = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
    } else if (a === '--outputDir' || a.startsWith('--outputDir=')) {
      out.outputDir = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
    } else if (a === '--scanDirs' || a.startsWith('--scanDirs=')) {
      const raw = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
      out.scanDirs = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--quiet') {
      out.verbose = false;
    }
  }
  return out;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = args.projectRoot || process.cwd();
  // Desde el 31-ago-2026 los iconos tienen una sola copia, la publicada.
  const outputDir = args.outputDir || 'dist/assets/icons';
  await downloadIconifyIcons({
    projectRoot,
    outputDir,
    scanDirs: args.scanDirs || undefined,
    verbose: args.verbose,
  });
}

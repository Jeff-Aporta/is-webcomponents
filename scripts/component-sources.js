/**
 * component-sources.js — rutas y fetch de fuentes NO minificadas (JS/CSS/MD).
 *
 * Las URLs locales salen de `import.meta.url` (scripts/ → src/components/),
 * así funcionan en `file`/dev server y en GitHub Pages sin hardcodear el
 * subpath del repo. Si el local falla (404), cae a raw.githubusercontent.
 */
import { docsBase } from './cdn-sources.js';

const GH_RAW = () => docsBase('main');

/** `../../components/actions/button.js` → `components/actions/button.js` */
export function manifestToComponentsPath(rel) {
  return String(rel || '')
    .replace(/^\.\.\/\.\.\//, '')
    .replace(/^\.\.\//, '')
    .replace(/^\/+/, '');
}

/**
 * @param {{ script?: string, style?: string, tag?: string }} entry
 * @returns {{ js?: SourceFile, css?: SourceFile, md?: SourceFile }}
 */
export function resolveSourceFiles(entry) {
  if (!entry?.script) return {};
  const scriptPath = manifestToComponentsPath(entry.script);
  if (!scriptPath.endsWith('.js')) return {};

  /** @type {{ js?: SourceFile, css?: SourceFile, md?: SourceFile }} */
  const out = {
    js: {
      kind: 'js',
      label: 'JS',
      repoPath: `src/${scriptPath}`,
      fileName: scriptPath.split('/').pop() || 'module.js',
    },
  };

  const styleRel = entry.style
    ? manifestToComponentsPath(entry.style)
    : scriptPath.replace(/\.js$/, '.css');
  if (styleRel && styleRel.endsWith('.css')) {
    out.css = {
      kind: 'css',
      label: 'CSS',
      repoPath: `src/${styleRel}`,
      fileName: styleRel.split('/').pop() || 'module.css',
    };
  }

  const mdRel = scriptPath.replace(/\.js$/, '.md');
  out.md = {
    kind: 'md',
    label: 'MD',
    repoPath: `src/${mdRel}`,
    fileName: mdRel.split('/').pop() || 'module.md',
  };

  return out;
}

/**
 * URL same-origin hacia el archivo fuente (legible, sin minify).
 * @param {string} repoPath  p.ej. `src/components/actions/button.js`
 */
export function localSourceUrl(repoPath) {
  // scripts/view-sources.js → ../src/... = repo/src/...
  const rel = repoPath.replace(/^src\//, '');
  return new URL(`../src/${rel}`, import.meta.url).href;
}

/** @param {string} repoPath */
export function rawSourceUrl(repoPath) {
  return `${GH_RAW()}/${repoPath}`;
}

/**
 * @param {SourceFile} file
 * @returns {Promise<{ text: string, url: string, source: 'local' | 'raw' }>}
 */
export async function fetchSourceFile(file) {
  const local = localSourceUrl(file.repoPath);
  try {
    const res = await fetch(local, { cache: 'no-cache' });
    if (res.ok) {
      return { text: await res.text(), url: local, source: 'local' };
    }
  } catch {
    /* red / CORS / file:// */
  }

  const raw = rawSourceUrl(file.repoPath);
  const res = await fetch(raw, { cache: 'no-cache' });
  if (!res.ok) {
    const err = new Error(`${res.status} ${file.repoPath}`);
    err.status = res.status;
    throw err;
  }
  return { text: await res.text(), url: raw, source: 'raw' };
}

/**
 * @typedef {{ kind: 'js'|'css'|'md', label: string, repoPath: string, fileName: string }} SourceFile
 */

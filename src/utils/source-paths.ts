/**
 * src/utils/source-paths.ts — rutas y fetch de fuentes NO minificadas (JS/CSS/MD).
 *
 * Migrado de `scripts/component-sources.js` (2026-09-07): la convención es que
 * `src/` no dependa de `scripts/` (S-DEP-FUERA). Las URLs locales salen de
 * `import.meta.url` (src/utils/ → src/components/), así funcionan en `file`/dev
 * server y en GitHub Pages sin hardcodear el subpath del repo. Si el local
 * falla (404), cae a raw.githubusercontent.
 */
import { docsBase } from './cdn-sources.js';

/**
 * `../../components/actions/button.js` → `components/actions/button.js`
 */
export function manifestToComponentsPath(rel: string | null | undefined): string {
  return String(rel || '')
    .replace(/^\.\.\/\.\.\//, '')
    .replace(/^\.\.\//, '')
    .replace(/^\/+/, '');
}

export interface ManifestEntry {
  script?: string;
  style?: string;
  tag?: string;
  category?: string;
}

export interface SourceFile {
  kind: 'js' | 'css' | 'md';
  label: string;
  repoPath: string;
  fileName: string;
}

/**
 * Resuelve las rutas locales (TS/CSS/MD) de una entrada del manifest.
 * El manifiesto nombra el módulo con `.js` —es un especificador, no un
 * fichero— pero en el repositorio el fuente es TypeScript. Para enlazar al
 * código hay que traducir la extensión; el `.min.js` publicado no se toca.
 */
export function resolveSourceFiles(entry: ManifestEntry): {
  js?: SourceFile;
  css?: SourceFile;
  md?: SourceFile;
} {
  if (!entry?.script) return {};
  const scriptPath = manifestToComponentsPath(entry.script);
  if (!scriptPath.endsWith('.js')) return {};

  const fuenteRel = scriptPath.replace(/\.js$/, '.ts');

  const out: ReturnType<typeof resolveSourceFiles> = {
    js: {
      kind: 'js',
      label: 'TS',
      repoPath: `src/${fuenteRel}`,
      fileName: fuenteRel.split('/').pop() || 'module.ts',
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
 * Rutas CDN minificadas (`dist/cdn/...`) del componente.
 */
export interface CdnMinPaths {
  js: string;
  css: string | null;
  short: string;
  category: string;
}

export function resolveCdnMinPaths(entry: ManifestEntry): CdnMinPaths | null {
  if (!entry?.tag || !entry?.category) return null;
  const short = String(entry.tag).replace(/^is-/, '');
  const category = entry.category;
  const js = `${category}/${short}.min.js`;
  const css = `${category}/${short}.min.css`;
  return { js, css, short, category };
}

/**
 * URL same-origin hacia el archivo fuente (legible, sin minify).
 * src/utils/ → ../src/ = repo/src/.
 */
export function localSourceUrl(repoPath: string): string {
  const rel = repoPath.replace(/^src\//, '');
  return new URL(`../src/${rel}`, import.meta.url).href;
}

export function rawSourceUrl(repoPath: string): string {
  return `${docsBase('main')}/${repoPath}`;
}

export interface FetchedSource {
  text: string;
  url: string;
  source: 'local' | 'raw';
}

export async function fetchSourceFile(file: SourceFile): Promise<FetchedSource> {
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
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return { text: await res.text(), url: raw, source: 'raw' };
}
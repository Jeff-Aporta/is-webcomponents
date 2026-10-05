// build-no-clean.ts — Variante de build.mjs SIN rm recursivo inicial.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');

await mkdir(dist, { recursive: true });

// re-export the rest of build.mjs
const buildOriginal = await import('./build.mjs');

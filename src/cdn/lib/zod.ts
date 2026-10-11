// Una sola copia de Zod en el CDN: los bundles de componentes la importan como
// `../lib/zod.min.js` (ver `external-components` en scripts/build.mjs) en vez de
// inlinear ~300 KB cada uno.
export * from 'zod';

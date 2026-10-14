// @vendor 2026-10-14T15:03:31.623Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/lib/zod.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/05-zod-y-tipos.md
// Una sola copia de Zod en el CDN: los bundles de componentes la importan como
// `../lib/zod.min.js` (ver `external-components` en scripts/build.mjs) en vez de
// inlinear ~300 KB cada uno.
//
// Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/lib/zod.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Sin imports relativos.
// Skill: skills/iswc-foundation/references/05-zod-y-tipos.md
// Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/05-zod-y-tipos.md
export * from 'zod';

// @vendor 2026-10-13T13:38:40.106Z Jeff-Aporta/is-webcomponents@local dist/cdn/vendor-distributions/index.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * COMPAT TEMPORAL — `index.ts` se movió a `shared/index.ts + client/index.ts` (perfiles shared/server/client, 2026-10-12).
 * @deprecated 2026-10-12: importa `src/vendor-distributions/shared/index.ts + client/index.ts`. Se borra cuando ISS e ISW migren
 * (sus vendor.json y las herramientas de docs que importan `src/vendor-distributions/…` del kit local).
 * Skill: skills/iswc-foundation/SKILL.md
 * Perfil: compat (fuera de los perfiles; no se vendoriza: `vendor.ts` bloquea rutas sin perfil).
 */
export * from './shared/index.ts';
export * from './client/index.ts';

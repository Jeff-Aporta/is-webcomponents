// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * COMPAT TEMPORAL — `tools/vendor.ts` se movió a `shared/tools/vendor.ts` (perfiles shared/server/client, 2026-10-12).
 * @deprecated 2026-10-12: importa `src/vendor-distributions/shared/tools/vendor.ts`. Se borra cuando ISS e ISW migren
 * (sus vendor.json y las herramientas de docs que importan `src/vendor-distributions/…` del kit local).
 * Perfil: compat (fuera de los perfiles; no se vendoriza: `vendor.ts` bloquea rutas sin perfil).
 */
export * from '../shared/tools/vendor.ts';

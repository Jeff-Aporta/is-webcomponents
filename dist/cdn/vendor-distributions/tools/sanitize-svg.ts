// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * COMPAT TEMPORAL — `tools/sanitize-svg.ts` se movió a `client/tools/sanitize-svg.ts` (perfiles shared/server/client, 2026-10-12).
 * @deprecated 2026-10-12: importa `src/vendor-distributions/client/tools/sanitize-svg.ts`. Se borra cuando ISS e ISW migren
 * (sus vendor.json y las herramientas de docs que importan `src/vendor-distributions/…` del kit local).
 * Perfil: compat (fuera de los perfiles; no se vendoriza: `vendor.ts` bloquea rutas sin perfil).
 */
export * from '../client/tools/sanitize-svg.ts';

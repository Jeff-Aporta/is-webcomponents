// @contexto INDICE.md · src/cdn/build/README.md
/**
 * npm.ts — contratos del `package.json` generado por el build (plan D9, fase F6). Nada se publica todavía.
 */
import { z } from "zod";

export const PackageJsonOptionsSchema = z.object({
  /** `dist/cdn/exports.json` tal cual (subruta → archivo, con los comodines por carpeta). */
  exports: z.record(z.string(), z.string()),
  /** Tag (`iswc-button`) → ruta publicada relativa a `dist/cdn/` (`actions/button.min.mjs`). */
  tags: z.record(z.string(), z.string()),
  /** SHA de HEAD del build (40 hex) o `main` sin git. */
  sha: z.string(),
  /** Fecha del commit en `yyyymmdd`. */
  fecha: z.string(),
  /** Repo en GitHub (`REPO_GITHUB` de `src/core/cdn-ref.ts`). */
  repo: z.string(),
  /** Licencia SPDX o `UNLICENSED` si el repo no trae LICENSE. */
  licencia: z.string(),
});
export type PackageJsonOptions = z.infer<typeof PackageJsonOptionsSchema>;

export const PackageJsonSchema = z.object({
  name: z.literal("@jeff-aporta/iswc-base"),
  version: z.string(),
  description: z.string(),
  type: z.literal("module"),
  license: z.string(),
  repository: z.object({ type: z.literal("git"), url: z.string() }),
  files: z.array(z.string()),
  exports: z.record(z.string(), z.string()),
  sideEffects: z.array(z.string()),
  peerDependencies: z.record(z.string(), z.string()),
  peerDependenciesMeta: z.record(z.string(), z.object({ optional: z.boolean() })),
});
export type PackageJson = z.infer<typeof PackageJsonSchema>;

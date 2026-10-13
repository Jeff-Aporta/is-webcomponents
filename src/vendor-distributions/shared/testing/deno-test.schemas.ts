// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
/**
 * Contratos (tipos) de `deno-test.ts`. W54: los tipos top-level viven en
 * *.schemas.ts.
 *
 * Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/testing/deno-test.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./test-cooldown.schemas.ts`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
 */
import type { TestCooldown } from "./test-cooldown.schemas.ts";

export interface DenoTestOptions {
    /** Flags de `deno test` (p. ej. `-A`, `--no-check`). */
    args?: string[];
    /** Entorno del proceso hijo. Default `process.env`. */
    env?: Record<string, string | undefined>;
    /** `true`: un archivo a la vez (estado compartido). Default: cola de `testConcurrency()`. */
    serial?: boolean;
    /** Cooldown a usar. Default `testCooldownFromEnv()`. */
    cooldown?: TestCooldown;
    /** Ejecutable de Deno. Default `"deno"`. */
    deno?: string;
}

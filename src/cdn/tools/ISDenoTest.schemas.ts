/**
 * Contratos (tipos) de `ISDenoTest.ts`. W54: los tipos top-level viven en
 * *.schemas.ts.
 */
import type { TestCooldown } from "./ISTestCooldown.schemas.ts";

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

// ISDenoTest.ts — `deno test` estándar de los proyectos is-*: cola de
// `testConcurrency()` archivos a la vez (3 por defecto) y cooldown de iswc.
//
// Unidad = archivo `.test.ts`: `deno test` con varios archivos no deja saltar
// un `Deno.test` suelto. Un archivo verde se salta duración × 360
// (1 min -> 6 h, proporcional); con un rojo no entra en cooldown. Duraciones y
// fallos salen del reporte JUnit de Deno.
//
//   const code = await denoTest(archivos, { args: ['-A', '--no-check'] });
//   const code = await denoTest(serie, { args: [...], serial: true }); // de a uno
//
// Vendor: copiar `dist/cdn/tools/{deno-test,test-cooldown,test-queue}.ts`
// a una misma carpeta.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import process from "node:process";
import { formatMs, testCooldownFromEnv, testId, type TestCooldown } from "./ISTestCooldown.ts";
import { testConcurrency } from "./ISTestQueue.ts";

export type { DenoTestOptions } from "./ISDenoTest.schemas.ts";
import type { DenoTestOptions } from "./ISDenoTest.schemas.ts";

/** `{ "./ruta/x.test.ts": { ms, ok } }` desde un reporte JUnit de Deno. */
export function readDenoJunit(path: string): Record<string, { ms: number; ok: boolean }> {
    const out: Record<string, { ms: number; ok: boolean }> = {};
    if (!existsSync(path)) return out;
    const xml = readFileSync(path, "utf8");
    for (const m of xml.matchAll(/<testsuite name="([^"]+)"[\s\S]*?<\/testsuite>/g)) {
        const ms = [...m[0].matchAll(/<testcase [^>]*time="([\d.]+)"/g)].reduce((a, t) => a + Number(t[1]) * 1000, 0);
        out[m[1]] = { ms: Math.round(ms), ok: !/<(failure|error)\b/.test(m[0]) };
    }
    return out;
}

/**
 * Corre `deno test` sobre `files` salvo los que están en cooldown, con la
 * cola estándar, y registra el resultado de cada archivo. Devuelve el exit
 * code de Deno (0 si todos estaban en cooldown).
 */
export async function denoTest(files: string[], opts: DenoTestOptions = {}): Promise<number> {
    const cooldown = opts.cooldown ?? testCooldownFromEnv();
    const rel = (f: string) => relative(process.cwd(), f).replace(/\\/g, "/");
    const idDe = (f: string) => testId(rel(f), "*");

    const correr: string[] = [];
    for (const f of files) {
        const c = cooldown.check(idDe(f));
        if (c.skip) console.log(`[cooldown] ~ ${rel(f)} (faltan ${formatMs(c.remainingMs)})`);
        else correr.push(f);
    }
    if (!correr.length) return 0;

    const junit = join(tmpdir(), `deno-test-${process.pid}-${Date.now()}.xml`);
    const args = [...(opts.args ?? []), ...(opts.serial ? [] : ["--parallel"]), `--junit-path=${junit}`];
    const env = { ...(opts.env ?? process.env), DENO_JOBS: String(opts.serial ? 1 : testConcurrency()) };
    const child = spawn(opts.deno ?? "deno", ["test", ...args, ...correr], { stdio: "inherit", env });
    const codigo = await new Promise<number | null>((res) => child.on("exit", res));

    const suites = readDenoJunit(junit);
    for (const f of correr) {
        const s = suites[`./${rel(f)}`];
        // Sin suite en el JUnit (no cargó, crash): rojo, no entra en cooldown.
        cooldown.record(idDe(f), s?.ms ?? 0, !!s?.ok);
    }
    return codigo ?? 1;
}

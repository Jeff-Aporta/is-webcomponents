// @vendor 2026-10-14T01:16:34.698Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/testing/deno-test.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
// deno-test.ts — `deno test` estándar de los proyectos is-*: cola de
// `testConcurrency()` archivos a la vez (3 por defecto) y cooldown de iswc.
//
// Unidad = archivo `.test.ts`: `deno test` con varios archivos no deja saltar
// un `Deno.test` suelto. Un archivo verde se salta duración × 1440
// (1 min -> 24 h, proporcional); con un rojo no entra en cooldown. Duraciones y
// fallos salen del reporte JUnit de Deno. Rojo a la primera: se reintenta de a
// uno (1 vez por defecto, `TEST_REINTENTOS`), como en `pruebas.ts`.
//
//   const code = await denoTest(archivos, { args: ['-A', '--no-check'] });
//   const code = await denoTest(serie, { args: [...], serial: true }); // de a uno
//
// Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/testing/deno-test.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../schemas.ts` (sección `deno-test`), `./test-cooldown.ts` (cooldown + cola).
// Skill: skills/iswc-foundation/references/07-pruebas-y-gate.md
// Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import process from "node:process";
import { formatMs, testConcurrency, testCooldownFromEnv, testId } from './test-cooldown.ts';
import { type TestCooldown } from '../schemas.ts';

import type { DenoTestOptions } from "../schemas.ts";

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
 * cola estándar, y registra el resultado de cada archivo. Un archivo rojo a la
 * primera se reintenta `reintentos` veces (1 por defecto, `TEST_REINTENTOS`),
 * de a uno: así un fallo de infraestructura (p. ej. dos Chromium lanzados a la
 * vez en Windows) no deja la corrida en rojo. Devuelve 0 si todos quedaron en
 * verde (o en cooldown) y, si no, el exit code de la última corrida.
 */
export async function denoTest(files: string[], opts: DenoTestOptions = {}): Promise<number> {
    const cooldown = opts.cooldown ?? testCooldownFromEnv();
    const rel = (f: string) => relative(process.cwd(), f).replace(/\\/g, "/");
    const idDe = (f: string) => testId(rel(f), "*");
    const envReintentos = process.env.TEST_REINTENTOS;
    const reintentos = Math.max(0, opts.reintentos ?? (envReintentos ? Number(envReintentos) || 0 : 1));

    let correr: string[] = [];
    for (const f of files) {
        const c = cooldown.check(idDe(f));
        if (c.skip) console.log(`[cooldown] ~ ${rel(f)} (faltan ${formatMs(c.remainingMs)})`);
        else correr.push(f);
    }
    if (!correr.length) return 0;

    const resultado = new Map<string, { ms: number; ok: boolean }>();
    let codigo: number | null = 0;
    for (let intento = 0; intento <= reintentos && correr.length; intento++) {
        const serial = !!opts.serial || intento > 0;
        if (intento > 0) console.log(`[deno-test] ↻ rojo a la primera (exit ${codigo}), se reintenta de a uno: ${correr.map(rel).join(", ")}`);
        const junit = join(tmpdir(), `deno-test-${process.pid}-${Date.now()}-${intento}.xml`);
        const args = [...(opts.args ?? []), ...(serial ? [] : ["--parallel"]), `--junit-path=${junit}`];
        const env = { ...(opts.env ?? process.env), DENO_JOBS: String(serial ? 1 : testConcurrency()) };
        const child = spawn(opts.deno ?? "deno", ["test", ...args, ...correr], { stdio: "inherit", env });
        codigo = await new Promise<number | null>((res) => child.on("exit", res));
        const suites = readDenoJunit(junit);
        // Sin suite en el JUnit (no cargó, crash): rojo.
        for (const f of correr) resultado.set(f, suites[`./${rel(f)}`] ?? { ms: 0, ok: false });
        correr = correr.filter((f) => !resultado.get(f)!.ok);
    }
    // Solo el verde entra en cooldown; el rojo queda auditado (until -1) y vuelve a correr la próxima vez.
    for (const [f, s] of resultado) cooldown.record(idDe(f), s.ms, s.ok);
    return correr.length ? (codigo || 1) : 0;
}

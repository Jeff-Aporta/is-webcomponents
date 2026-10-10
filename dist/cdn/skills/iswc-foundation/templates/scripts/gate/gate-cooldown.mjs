// scripts/gate/gate-cooldown.mjs
//
// Pasos del gate (guardianes, vigilantes, build, tests) con el MISMO cooldown
// que los tests (vendor iswc `ISTestCooldown.ts`, factor x600): un paso que
// paso en verde hace poco no se repite. Un rojo corre siempre.
//
// Dos clases de paso:
//   - Verificacion de estado externo (preflight, guardian): cooldown por tiempo.
//   - Paso que depende de archivos (build): cooldown por tiempo Y huella de sus
//     entradas. Si una entrada cambio, corre aunque este en cooldown: saltarlo
//     dejaria un artefacto viejo, que es justo lo que se copia al entregable.
//
// La huella vigente de cada paso verde vive en `.tmp/gate-huellas.json`; el
// tiempo, en el JSON comun del cooldown (`TEST_COOLDOWN_DB`). `TEST_COOLDOWN=0`
// o `--sin-cooldown` corren todo (solo diagnostico; el sync no los usa).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const { testCooldownFromEnv, formatMs } = await import("../../src/vendor/iswc-root/tools/ISTestCooldown.ts");

const IGNORAR = new Set(["node_modules", ".git", ".tmp", "dist", "coverage", ".cobertura"]);

/** Huella de contenido de archivos y carpetas (rutas relativas a `raiz`). */
export function huella(raiz, entradas) {
  const h = createHash("sha1");
  const visitar = (abs) => {
    if (!existsSync(abs)) return;
    const st = statSync(abs);
    if (st.isDirectory()) {
      for (const n of readdirSync(abs).sort()) if (!IGNORAR.has(n)) visitar(join(abs, n));
      return;
    }
    h.update(relative(raiz, abs).replace(/\\/g, "/"));
    h.update("\0");
    h.update(readFileSync(abs));
    h.update("\0");
  };
  for (const e of entradas) visitar(join(raiz, e));
  return h.digest("hex").slice(0, 16);
}

/**
 * `crearGate({ raiz, log, err })` -> `paso({ id, label, cmd, args, env, entradas, cooldown })`.
 * Devuelve el exit code del paso (0 si verde o si se salto por cooldown).
 * `cooldown: false` para pasos que ya aplican cooldown por dentro (runners de tests).
 */
export function crearGate({ raiz, log, err }) {
  const cd = testCooldownFromEnv();
  const rutaHuellas = join(raiz, ".tmp", "gate-huellas.json");
  const leer = () => { try { return JSON.parse(readFileSync(rutaHuellas, "utf8")); } catch { return {}; } };
  const guardar = (o) => { mkdirSync(dirname(rutaHuellas), { recursive: true }); writeFileSync(rutaHuellas, JSON.stringify(o, null, 2) + "\n", "utf8"); };

  return function paso({ id, label, cmd, args, env = {}, entradas, cooldown = true }) {
    const clave = `gate::${id}`;
    const h = entradas ? huella(raiz, entradas) : "";
    if (cooldown) {
      const c = cd.check(clave);
      const huellaOk = (leer()[id] ?? "") === h;
      if (c.skip && huellaOk) {
        log(`STEP ${label}: SKIP por cooldown (verde hace poco; vuelve a correr en ${formatMs(c.remainingMs)})`);
        return 0;
      }
      if (c.skip && !huellaOk) log(`STEP ${label}: sus entradas cambiaron desde el ultimo verde; corre aunque este en cooldown`);
    }
    log(`STEP ${label}: ${cmd} ${args.join(" ")}`);
    const t0 = Date.now();
    const r = spawnSync(cmd, args, { cwd: raiz, env: { ...process.env, ...env }, stdio: "inherit", shell: process.platform === "win32" });
    const ms = Date.now() - t0;
    const code = r.status ?? 1;
    if (cooldown) {
      cd.record(clave, ms, code === 0);
      if (code === 0) { const o = leer(); o[id] = h; guardar(o); }
    }
    if (code === 0) log(`STEP ${label} OK (${ms}ms)`);
    else err(`STEP ${label} FALLO rc=${code} (${ms}ms)`);
    return code;
  };
}

/**
 * Sync comun `_experimental` -> `_entregable` de las apps del kit (ISS, ISW).
 *
 * Cada app declara su `ConfigSync` (entradas `replace`/`push`, bloqueados,
 * gate, hooks y checkpoint) y llama a `correrSync`. Reglas comunes:
 *   - El gate corre SOLO en modo `real` y antes de escribir: rojo = no se toca el destino.
 *   - Comparacion por CONTENIDO (tras `transformar`): solo se escribe lo que cambio;
 *     `check` reporta el drift real (crear/actualizar/borrar) y `iguales`.
 *   - `replace` borra en el destino lo que no esta en el origen; `push` nunca borra.
 *   - Lo `bloqueado` en el destino no se escribe ni se borra.
 *   - Checkpoint: commit en el ORIGEN (mirror) y push sin forzar. El destino
 *     (entregable) nunca recibe commits ni push automaticos.
 * Solo `node:*`: corre igual en Node y en Deno.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';
import type { CambioSync, ConfigSync, CtxSync, EntradaSync, ModoSync, ResumenEntrada, ResumenSync } from './ISSyncEntregable.schemas.ts';

export type { AccionSync, CambioSync, CheckpointSync, ConfigSync, CtxSync, EntradaSync, GateSync, ModoSync, ResumenEntrada, ResumenSync } from './ISSyncEntregable.schemas.ts';

/**
 * Glob minimo con globstar estandar: `**\/` = cero o mas carpetas, `/**` final =
 * todo lo de adentro, `*` = un segmento. Rutas con `/`.
 */
export function coincideGlob(rel: string, patron: string): boolean {
  const re = String(patron)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0001')
    .replace(/\/\*\*$/g, '\u0002')
    .replace(/\*\*/g, '\u0003')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0001/g, '(?:.*/)?')
    .replace(/\u0002/g, '(?:/.*)?')
    .replace(/\u0003/g, '.*');
  return new RegExp(`^${re}$`).test(rel);
}

const posix = (p: string) => p.replace(/\\/g, '/');
const coincideAlguno = (rel: string, globs: readonly string[] = []) => globs.some((g) => coincideGlob(rel, g) || coincideGlob(`${rel}/`, g));

/** Archivos (relativos, posix) bajo `base`. Un archivo suelto devuelve `['']`. */
function archivos(base: string, excluir: readonly string[] = []): string[] {
  if (!existsSync(base)) return [];
  if (statSync(base).isFile()) return [''];
  const out: string[] = [];
  const caminar = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = posix(relative(base, abs));
      if (coincideAlguno(rel, excluir)) continue;
      if (e.isDirectory()) caminar(abs);
      else out.push(rel);
    }
  };
  caminar(base);
  return out.sort();
}

const iguales = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Plan de una entrada: que se crea, actualiza o borra en el destino (sin escribir). */
async function planEntrada(cfg: ConfigSync, e: EntradaSync): Promise<{ resumen: ResumenEntrada; escribir: Map<string, Uint8Array> }> {
  const hacia = e.hacia ?? e.desde;
  const src = join(cfg.origen, e.desde);
  const dst = join(cfg.destino, hacia);
  const escribir = new Map<string, Uint8Array>();
  const cambios: CambioSync[] = [];
  let igualesN = 0;
  const bloqueado = (relDestino: string) => coincideAlguno(relDestino, cfg.bloqueados);
  const aDestino = (rel: string) => posix(rel ? join(hacia, rel) : hacia);
  const origenes = archivos(src, e.excluir);
  if (!existsSync(src)) throw new Error(`sync: no existe el origen ${e.desde}`);
  for (const rel of origenes) {
    const ruta = aDestino(rel);
    if (bloqueado(ruta)) continue;
    const crudo = new Uint8Array(readFileSync(rel ? join(src, rel) : src));
    const contenido = (e.transformar ? await e.transformar(rel || posix(e.desde).split('/').pop()!, crudo) : null) ?? crudo;
    const absDst = join(cfg.destino, ruta);
    if (existsSync(absDst) && statSync(absDst).isFile() && iguales(new Uint8Array(readFileSync(absDst)), contenido)) { igualesN++; continue; }
    cambios.push({ ruta, tipo: existsSync(absDst) ? 'actualizar' : 'crear' });
    escribir.set(ruta, contenido);
  }
  if (e.accion === 'replace' && existsSync(dst) && statSync(dst).isDirectory()) {
    const enOrigen = new Set(origenes);
    for (const rel of archivos(dst)) {
      const ruta = aDestino(rel);
      if (enOrigen.has(rel) || bloqueado(ruta) || coincideAlguno(rel, e.excluir)) continue;
      cambios.push({ ruta, tipo: 'borrar' });
    }
  }
  return { resumen: { desde: e.desde, hacia, accion: e.accion, cambios, iguales: igualesN }, escribir };
}

/** Commit en el origen (mirror) y push sin forzar. */
export function checkpointGit(raiz: string, mensaje: string, push: boolean): { commit: string | null; push: boolean | null; error?: string } {
  const git = (...a: string[]) => spawnSync('git', ['-C', raiz, ...a], { encoding: 'utf8' });
  if (git('add', '-A').status !== 0) return { commit: null, push: null, error: 'git add fallo' };
  let commit: string | null = null;
  if (git('diff', '--cached', '--quiet').status !== 0) {
    const c = git('commit', '-m', mensaje);
    if (c.status !== 0) return { commit: null, push: null, error: `commit: ${(c.stderr || c.stdout).trim().slice(0, 300)}` };
    commit = git('rev-parse', '--short', 'HEAD').stdout.trim();
  }
  if (!push) return { commit, push: null };
  const p = git('push');
  return p.status === 0 ? { commit, push: true } : { commit, push: false, error: `push: ${(p.stderr || p.stdout).trim().slice(0, 300)}` };
}

/** Corre el sync: plan -> (real) antes + gate + escritura + despues + checkpoint. */
export async function correrSync(cfg: ConfigSync, modo: ModoSync, log: (l: string) => void = (l) => console.log(l)): Promise<ResumenSync> {
  const ctx: CtxSync = { modo, config: cfg, log };
  if (modo === 'real') {
    await cfg.antes?.(ctx);
    if (cfg.gate) {
      log(`[sync] gate: ${cfg.gate.cmd} ${cfg.gate.args.join(' ')}`);
      const r = spawnSync(cfg.gate.cmd, cfg.gate.args, { cwd: cfg.gate.cwd ?? cfg.origen, stdio: 'inherit', env: { ...process.env, ...cfg.gate.env }, shell: cfg.gate.shell === true });
      if (r.status !== 0) throw new Error(`gate en ROJO (exit ${r.status}): el entregable no se toca`);
      log('[sync] gate en VERDE');
    }
  }
  const planes = [];
  for (const e of cfg.entradas) planes.push(await planEntrada(cfg, e));
  const resumen: ResumenSync = { modo, entradas: planes.map((p) => p.resumen), cambios: planes.reduce((n, p) => n + p.resumen.cambios.length, 0) };
  for (const p of planes) {
    const c = p.resumen.cambios;
    log(`[sync] ${p.resumen.accion} ${p.resumen.desde} -> ${p.resumen.hacia}: ${c.filter((x) => x.tipo === 'crear').length} crear, ${c.filter((x) => x.tipo === 'actualizar').length} actualizar, ${c.filter((x) => x.tipo === 'borrar').length} borrar, ${p.resumen.iguales} iguales`);
  }
  if (modo !== 'real') return resumen;
  for (const p of planes) {
    for (const [ruta, contenido] of p.escribir) {
      const abs = join(cfg.destino, ruta);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, contenido);
    }
    for (const c of p.resumen.cambios.filter((x) => x.tipo === 'borrar')) rmSync(join(cfg.destino, c.ruta), { force: true });
  }
  await cfg.despues?.(ctx, resumen);
  if (cfg.checkpoint) {
    resumen.checkpoint = checkpointGit(cfg.origen, cfg.checkpoint.mensaje, cfg.checkpoint.push);
    const k = resumen.checkpoint;
    log(k.error ? `[sync] checkpoint: ${k.error}` : `[sync] checkpoint: ${k.commit ? `commit ${k.commit}` : 'sin cambios'}${k.push ? ', push hecho' : ''}`);
  }
  return resumen;
}

/** `--check` / `--dry-run` / real, desde argv. */
export function modoDeArgv(argv: string[] = process.argv.slice(2)): ModoSync {
  if (argv.includes('--check')) return 'check';
  if (argv.includes('--dry-run')) return 'dry-run';
  return 'real';
}

/** Codigo de salida: `check` con drift = 1; el resto 0 (los errores lanzan). */
export function codigoSync(r: ResumenSync): number {
  return r.modo === 'check' && r.cambios > 0 ? 1 : 0;
}

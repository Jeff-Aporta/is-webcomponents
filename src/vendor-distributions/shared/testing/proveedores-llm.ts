// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main src/vendor-distributions/shared/testing/proveedores-llm.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * proveedores-llm.ts — pila de proveedores LLM OpenAI-compatible (MiniMax, DeepSeek, OpenAI…) en
 * orden de prioridad, común a los jueces (`jueces.ts`, server y client) y al controlador de Stagehand
 * (`client/testing/stagehand.ts`, solo client):
 *   1. PROVEEDORES (`leerProveedoresDeArchivo`, `validarProveedores`): `[{ nombre, apiKey, model, baseUrl }]`
 *      de un JSON FUERA del repo; las llaves en cooldown de 24 h no entran.
 *   2. SONDA y BARRIDO (`sondearProveedor`, `barrerProveedores`, `elegirProveedor`,
 *      `elegirProveedorOpcional`): completion mínima con timeout a cada uno, en orden; se salta al
 *      que no tiene saldo, rechaza la key o no responde, con su causa; el elegido se cachea
 *      (`rutaCache`, 30 min). `E2E_LLM_PROVEEDOR=<nombre>` fuerza uno, `E2E_LLM_BARRIDO=1` fuerza barrido.
 *   3. `normalizarJson`: quita cercos y prosa alrededor del JSON de un modelo.
 *
 * Solo `node:*` + `fetch`: corre igual en Node y en Deno, sin navegador.
 *
 * Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/testing/proveedores-llm.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../schemas.ts` (secciones `proveedores-llm`, `test-cooldown`), `./test-cooldown.ts`.
 * Skill: skills/iswc-foundation/references/11-stagehand.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { ZArchivoProveedores, ZCacheProveedor, ZProveedorLlm } from '../schemas.ts';
import { estadoLlave, marcarCooldown } from './test-cooldown.ts';
import type { EleccionProveedor, OpcionesElegirProveedor, OpcionesSonda, ProveedorLlm, SondaLlm } from '../schemas.ts';

export type { CacheProveedor, EleccionProveedor, OpcionesElegirProveedor, OpcionesSonda, OrigenEleccion, ProveedorLlm, SondaLlm } from '../schemas.ts';

/** Vigencia por defecto de la cache del barrido. */
export const CACHE_TTL_MS = 30 * 60_000;
const SONDA_TIMEOUT_MS = 20_000;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const campo = (o: unknown, k: string): unknown => (esObjeto(o) ? o[k] : undefined);
const logConsola = (l: string): void => console.log(l);

// ── 1. Proveedores ──────────────────────────────────────────────────────────

/** Valida una lista cruda de proveedores; los que no tienen `apiKey`/`model` se descartan (no revientan). */
export function validarProveedores(crudos: unknown[]): ProveedorLlm[] {
  const out: ProveedorLlm[] = [];
  for (const c of crudos) {
    const r = ZProveedorLlm.safeParse(c);
    if (r.success && !out.some((p) => p.nombre === r.data.nombre)) out.push(r.data);
  }
  return out;
}

/**
 * Lee `{ proveedores: [...] }` de un JSON fuera del repo (p. ej. `Personal/stagehand-keys.json`).
 * Ausente, ilegible o sin lista → `[]` (el que llama decide si eso es error).
 */
export function leerProveedoresDeArchivo(ruta: string, o: { now?: number; log?: (l: string) => void } = {}): ProveedorLlm[] {
  try {
    if (!existsSync(ruta)) return [];
    const doc = ZArchivoProveedores.safeParse(JSON.parse(readFileSync(ruta, 'utf8')));
    if (!doc.success) return [];
    // Las llaves en cooldown (fallaron por saldo/key/cuota hace < 24 h) no entran a la pila.
    const vigentes = doc.data.proveedores.filter((c) => {
      const e = estadoLlave(c, o.now ?? Date.now());
      if (!e.disponible) (o.log ?? logConsola)(`[llm] ${e.motivo}`);
      return e.disponible;
    });
    return validarProveedores(vigentes);
  } catch {
    return [];
  }
}

// ── 2. Sonda y barrido ──────────────────────────────────────────────────────

/** Mensaje de error del cuerpo OpenAI-compatible (`error.message`) o de MiniMax (`base_resp.status_msg`). */
function mensajeDeError(cuerpo: unknown): string {
  return str(campo(campo(cuerpo, 'error'), 'message')) || str(campo(campo(cuerpo, 'base_resp'), 'status_msg'));
}

/** Contenido de `choices[0].message.content`, o `''`. */
export function contenidoDe(cuerpo: unknown): string {
  const choices = campo(cuerpo, 'choices');
  const primero = Array.isArray(choices) ? choices[0] : undefined;
  return str(campo(campo(primero, 'message'), 'content'));
}

/**
 * Interpreta una respuesta `chat/completions`: `ok` solo con 200 y contenido no vacío.
 * `definitivo` = el proveedor no sirve en esta corrida (saldo, key, cuota); `false` = fallo transitorio.
 */
export function evaluarSondaLlm(status: number, cuerpo: unknown): { ok: boolean; causa: string; definitivo: boolean } {
  const msg = mensajeDeError(cuerpo);
  if (status === 401 || status === 403) return { ok: false, causa: `key rechazada (HTTP ${status})`, definitivo: true };
  if (status === 402) return { ok: false, causa: 'sin saldo (HTTP 402)', definitivo: true };
  if (status === 429) return { ok: false, causa: 'cuota agotada / rate limit (HTTP 429)', definitivo: true };
  if (/insufficient|balance|quota|credit|saldo/i.test(msg)) return { ok: false, causa: `sin saldo (${msg})`, definitivo: true };
  if (status !== 200) return { ok: false, causa: `HTTP ${status}${msg ? `: ${msg}` : ''}`, definitivo: status < 500 };
  const baseCode = campo(campo(cuerpo, 'base_resp'), 'status_code');
  if (typeof baseCode === 'number' && baseCode !== 0) return { ok: false, causa: `proveedor: ${msg || baseCode}`, definitivo: true };
  if (!contenidoDe(cuerpo)) return { ok: false, causa: 'respuesta sin contenido', definitivo: false };
  return { ok: true, causa: 'ok', definitivo: false };
}

/** Sonda real: una completion de pocos tokens con timeout corto. Nunca lanza. */
export async function sondearProveedor(p: ProveedorLlm, o: OpcionesSonda = {}): Promise<SondaLlm> {
  const f = o.fetchFn ?? fetch;
  const t0 = Date.now();
  try {
    const res = await f(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({ model: p.model, max_tokens: 8, messages: [{ role: 'user', content: 'Responde solo: ok' }], ...(p.extra ?? {}) }),
      signal: AbortSignal.timeout(o.timeoutMs ?? SONDA_TIMEOUT_MS),
    });
    const cuerpo: unknown = await res.json().catch(() => ({}));
    const r = evaluarSondaLlm(res.status, cuerpo);
    return { nombre: p.nombre, ok: r.ok, causa: r.causa, ms: Date.now() - t0, ...(r.definitivo && !r.ok ? { definitivo: true } : {}) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { nombre: p.nombre, ok: false, causa: `sin respuesta (${msg.slice(0, 80)})`, ms: Date.now() - t0 };
  }
}

/** Barrido en orden: el primer proveedor funcional y las sondas de todos los consultados. */
export async function barrerProveedores(
  proveedores: ProveedorLlm[],
  sondear: (p: ProveedorLlm) => Promise<SondaLlm> = (p) => sondearProveedor(p),
): Promise<{ elegido: ProveedorLlm | null; sondas: SondaLlm[] }> {
  const sondas: SondaLlm[] = [];
  for (const p of proveedores) {
    const s = await sondear(p);
    sondas.push(s);
    if (s.ok) return { elegido: p, sondas };
  }
  return { elegido: null, sondas };
}

function leerCache(ruta: string): { nombre: string; ts: number } | null {
  try {
    if (!existsSync(ruta)) return null;
    const r = ZCacheProveedor.safeParse(JSON.parse(readFileSync(ruta, 'utf8')));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

const informeSondas = (sondas: SondaLlm[]): string => sondas.map((s) => `  - ${s.nombre}: ${s.causa}`).join('\n');

/** Pila para el generador: `primero` y después el resto en su orden, sin los saltados por el barrido. */
function ordenDesde(proveedores: ProveedorLlm[], primero: ProveedorLlm, sondas: SondaLlm[]): ProveedorLlm[] {
  const saltados = new Set(sondas.filter((s) => !s.ok).map((s) => s.nombre));
  return [primero, ...proveedores.filter((p) => p.nombre !== primero.nombre && !saltados.has(p.nombre))];
}

/**
 * Proveedor de la corrida: forzado (`forzado` o `E2E_LLM_PROVEEDOR`), el cacheado (si sigue en la
 * lista y no venció; `E2E_LLM_BARRIDO=1` lo ignora) o el primero que pase el barrido. Sin ninguno
 * funcional lanza con las causas.
 */
export async function elegirProveedor(o: OpcionesElegirProveedor): Promise<EleccionProveedor> {
  const log = o.log ?? logConsola;
  const env = o.env ?? process.env;
  const now = o.now ?? Date.now;
  const forzado = o.forzado ?? (str(env.E2E_LLM_PROVEEDOR) || undefined);
  const barridoNuevo = o.barridoNuevo ?? /^(1|true|si|sí)$/i.test(str(env.E2E_LLM_BARRIDO));
  if (!o.proveedores.length) throw new Error('Stagehand: ningún proveedor LLM configurado (lista vacía)');
  if (forzado) {
    const p = o.proveedores.find((x) => x.nombre === forzado);
    if (!p) throw new Error(`Stagehand: E2E_LLM_PROVEEDOR=${forzado} no está en la lista (${o.proveedores.map((x) => x.nombre).join(', ')})`);
    log(`[llm] proveedor ${p.nombre} (${p.model}) — forzado`);
    return { proveedor: p, origen: 'forzado', sondas: [], orden: ordenDesde(o.proveedores, p, []) };
  }
  if (!barridoNuevo && o.rutaCache) {
    const c = leerCache(o.rutaCache);
    const p = c && now() - c.ts < (o.ttlMs ?? CACHE_TTL_MS) ? o.proveedores.find((x) => x.nombre === c.nombre) : undefined;
    if (p) {
      log(`[llm] proveedor ${p.nombre} (${p.model}) — del barrido previo`);
      return { proveedor: p, origen: 'cache', sondas: [], orden: ordenDesde(o.proveedores, p, []) };
    }
  }
  const { elegido, sondas } = await barrerProveedores(o.proveedores, o.sondear);
  for (const s of sondas) log(`[llm] sonda ${s.nombre}: ${s.ok ? 'OK' : `SALTADO — ${s.causa}`} (${s.ms} ms)`);
  for (const s of sondas) if (!s.ok && s.definitivo) log(`[llm] ${marcarCooldown(o.rutaLlaves, s.nombre, s.causa, { now: now() })}`);
  if (!elegido) throw new Error(`Stagehand: ningún proveedor LLM funcional:\n${informeSondas(sondas)}`);
  if (o.rutaCache) {
    try {
      mkdirSync(dirname(o.rutaCache), { recursive: true });
      writeFileSync(o.rutaCache, JSON.stringify({ nombre: elegido.nombre, ts: now() }));
    } catch { /* la cache es opcional */ }
  }
  log(`[llm] proveedor elegido: ${elegido.nombre} (${elegido.model})`);
  return { proveedor: elegido, origen: 'barrido', sondas, orden: ordenDesde(o.proveedores, elegido, sondas) };
}

/**
 * Como `elegirProveedor`, pero NUNCA lanza: sin proveedor funcional devuelve `{ proveedor: null, motivo }`
 * para que el consumidor siga en modo determinista (el LLM es una capa extra, no la base).
 */
export async function elegirProveedorOpcional(o: OpcionesElegirProveedor): Promise<EleccionProveedor | { proveedor: null; motivo: string }> {
  try {
    return await elegirProveedor(o);
  } catch (e) {
    return { proveedor: null, motivo: e instanceof Error ? e.message : String(e) };
  }
}


/** Quita cercos ```json``` y prosa alrededor y parsea el primer objeto/array balanceado. Lanza si no hay JSON. */
export function normalizarJson(texto: string): unknown {
  let t = texto.trim();
  const cercos = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (cercos) t = cercos[1]!.trim();
  if (!/^[[{]/.test(t)) {
    const iObj = t.indexOf('{');
    const iArr = t.indexOf('[');
    const ini = iObj >= 0 && (iArr < 0 || iObj < iArr) ? iObj : iArr;
    if (ini < 0) throw new Error(`el modelo no devolvió JSON: ${texto.slice(0, 200)}`);
    const abierta = t[ini];
    const cerrada = abierta === '{' ? '}' : ']';
    let nivel = 0;
    let fin = -1;
    for (let i = ini; i < t.length; i++) {
      const c = t[i];
      if (c === abierta) nivel++;
      else if (c === cerrada && --nivel === 0) { fin = i + 1; break; }
    }
    if (fin < 0) throw new Error(`JSON incompleto del modelo: ${texto.slice(0, 200)}`);
    t = t.slice(ini, fin);
  }
  try {
    return JSON.parse(t);
  } catch (e) {
    throw new Error(`JSON inválido del modelo: ${e instanceof Error ? e.message : String(e)} | ${t.slice(0, 200)}`);
  }
}

// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * stagehand.ts — controlador compartido de Stagehand para los e2e de todos los fronts del kit
 * (ISW, ISS y los que vengan), integrado con el sistema común de pruebas (`pruebas.ts` + cooldown).
 *
 * Qué resuelve, sin depender de `@browserbasehq/stagehand` (funciones puras + `fetch`):
 *   1. PROVEEDORES LLM como array en orden de prioridad (`[{ nombre, apiKey, model, baseUrl }]`,
 *      OpenAI-compatible: `POST {baseUrl}/chat/completions`). `leerProveedoresDeArchivo` los lee de
 *      un JSON FUERA del repo.
 *   2. BARRIDO previo (`elegirProveedor`): sonda mínima con timeout a cada uno, en orden; se salta
 *      al que no tiene saldo, rechaza la key o no responde (401/402/429, «insufficient balance»,
 *      respuesta vacía) con su causa; el elegido se cachea (`rutaCache`, 30 min). Sin ninguno
 *      funcional: error con todas las causas. `E2E_LLM_PROVEEDOR=<nombre>` fuerza uno,
 *      `E2E_LLM_BARRIDO=1` fuerza barrido.
 *   3. GENERADOR para `Stagehand.create({ model: { generate } })` (`crearGenerador`): pide el esquema
 *      en el prompt, normaliza el JSON (cercos, prosa alrededor) y reintenta; round-robin con
 *      FALLBACK durante la corrida: si un proveedor falla por saldo/cuota/key o 5xx repetido pasa al
 *      siguiente sin tumbar el test; sin ninguno, error con todas las causas.
 *   4. DESTINO de pruebas por protocolo (`resolverDestino`): lista `[{ id, sondear }]` en orden de
 *      preferencia; se decide UNA vez por proceso (`unaVezPorProceso`): el preferido si su sonda
 *      pasa, si no el siguiente, con motivo; sin ninguno, error con causas. URLs, JWT y la forma de
 *      fijar el destino en la UI quedan en el consumidor.
 *
 * Uso típico en el `antes` de `definirPruebas`:
 *
 *   const sh = unaVezPorProceso(() => prepararStagehand({
 *     proveedores: leerProveedoresDeArchivo('C:/ContaPyme/Personal/stagehand-keys.json'),
 *     destinos: [{ id: 'staging', sondear: sondaStaging }, { id: 'local', sondear: sondaLocal }],
 *     preferido: destinoPreferido(process.env.E2E_DESTINO, ['staging', 'local'], 'staging'),
 *     rutaCache: '.tmp/stagehand-proveedor.json',
 *   }));
 *   const ctx = await sh.obtener();
 *   const stagehand = await Stagehand.create({ browser, model: { generate: ctx.generate } });
 *
 * Solo `node:*` + `fetch`: corre igual en Node y en Deno.
 *
 * Cooldown de llaves: una llave que falla por saldo, key o cuota queda 24 h fuera (`cooldownHasta` en su
 * entrada del archivo de llaves; `-1` a mano la reactiva). `elegirProveedorOpcional` no lanza: sin
 * proveedor devuelve el motivo para que el consumidor siga en modo determinista.
 *
 * Vendor: `dist/cdn/vendor-distributions/testing/stagehand.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `./stagehand.schemas.ts`, `./test-cooldown.ts`, `./test-cooldown.schemas.ts`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { ZArchivoProveedores, ZCacheProveedor, ZProveedorLlm } from './stagehand.schemas.ts';
import { estadoLlave, marcarCooldown } from './test-cooldown.ts';
import type {
  BloqueStagehand,
  ContextoDestino,
  ContextoStagehand,
  ControlGenerador,
  EleccionProveedor,
  EstadoGenerador,
  MensajeOpenAi,
  OpcionesElegirProveedor,
  OpcionesGenerador,
  OpcionesPrepararStagehand,
  OpcionesResolverDestino,
  OpcionesSonda,
  ParamsGenerate,
  ParteOpenAi,
  ProveedorLlm,
  RespuestaGenerate,
  SondaDestino,
  SondaLlm,
} from './stagehand.schemas.ts';

export type * from './stagehand.schemas.ts';

/** Vigencia por defecto de la cache del barrido. */
export const CACHE_TTL_MS = 30 * 60_000;
const SONDA_TIMEOUT_MS = 20_000;
const GENERAR_TIMEOUT_MS = 120_000;
const REPOSO_MS = 5 * 60_000;

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
function contenidoDe(cuerpo: unknown): string {
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

// ── 3. Generador (Stagehand `model.generate`) ───────────────────────────────

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

/** Bloques de Stagehand → partes OpenAI (texto / imagen); `tool_use` y desconocidos se serializan como texto. */
export function aPartesOpenAi(bloques: string | BloqueStagehand | BloqueStagehand[]): ParteOpenAi[] {
  if (typeof bloques === 'string') return [{ type: 'text', text: bloques }];
  const lista = Array.isArray(bloques) ? bloques : [bloques];
  const partes: ParteOpenAi[] = [];
  for (const b of lista) {
    if (!esObjeto(b)) continue;
    if (b.type === 'text') partes.push({ type: 'text', text: b.text ?? '' });
    else if (b.type === 'image') partes.push({ type: 'image_url', image_url: { url: `data:${b.mimeType ?? 'image/png'};base64,${b.data ?? ''}` } });
    else if (b.type === 'tool_result') partes.push({ type: 'text', text: `[tool_result] ${(b.content ?? []).map((x) => (x.type === 'text' ? x.text ?? '' : JSON.stringify(x))).join(' ')}` });
    else partes.push({ type: 'text', text: `[${b.type}] ${JSON.stringify(b.input ?? b)}` });
  }
  return partes;
}

/** Mensajes OpenAI-compatible a partir de los parámetros de Stagehand: el esquema se pide en el system prompt. */
export function mensajesDe(params: ParamsGenerate): MensajeOpenAi[] {
  let esquema = '';
  try { esquema = params.responseFormat?.schema ? JSON.stringify(params.responseFormat.schema) : ''; } catch { esquema = ''; }
  const avisoJson = '\n\nDevuelve UN SOLO objeto JSON válido que cumpla EXACTAMENTE el esquema pedido: sin markdown, sin explicaciones, ' +
    'sin texto fuera del JSON, sin campos extra, con todas las claves requeridas presentes. Esquema:\n' +
    (esquema ? `\`\`\`json\n${esquema}\n\`\`\`` : '(sigue las instrucciones del sistema)');
  const out: MensajeOpenAi[] = [{ role: 'system', content: (params.systemPrompt ?? 'Eres el modelo de un agente de pruebas de UI.') + avisoJson }];
  for (const m of params.messages ?? []) {
    const partes = aPartesOpenAi(m.content);
    const contenido = partes.length === 1 && partes[0]!.type === 'text' ? partes[0]!.text : partes;
    out.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: contenido });
  }
  if (out.length === 1) out.push({ role: 'user', content: 'Responde según el esquema pedido.' });
  return out;
}

class FalloProveedor extends Error {
  constructor(readonly causa: string, readonly definitivo: boolean) { super(causa); }
}

/** Una petición a un proveedor; lanza `FalloProveedor` (definitivo o no) o `Error` de JSON. */
async function generarCon(p: ProveedorLlm, params: ParamsGenerate, o: OpcionesGenerador): Promise<RespuestaGenerate> {
  const f = o.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await f(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({
        model: p.model,
        temperature: params.temperature ?? 0.1,
        max_completion_tokens: o.maxTokens ?? 4096,
        messages: mensajesDe(params),
        response_format: { type: 'json_object' },
        ...(p.extra ?? {}),
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? GENERAR_TIMEOUT_MS),
    });
  } catch (e) {
    throw new FalloProveedor(`sin respuesta (${(e instanceof Error ? e.message : String(e)).slice(0, 80)})`, false);
  }
  const raw = await res.text();
  let cuerpo: unknown = {};
  try { cuerpo = JSON.parse(raw); } catch { cuerpo = {}; }
  const ev = evaluarSondaLlm(res.status, cuerpo);
  if (!ev.ok) throw new FalloProveedor(ev.causa, ev.definitivo);
  const content = contenidoDe(cuerpo);
  const uso = campo(cuerpo, 'usage');
  const n = (k: string): number => { const v = campo(uso, k); return typeof v === 'number' ? v : 0; };
  return {
    role: 'assistant',
    content: { type: 'text', text: content },
    outputFormat: 'json_schema',
    structuredContent: normalizarJson(content),
    usage: { inputTokens: n('prompt_tokens'), outputTokens: n('completion_tokens'), totalTokens: n('total_tokens') },
  };
}

/**
 * Generador para `Stagehand.create({ model: { generate } })` sobre una lista de proveedores en orden
 * de prioridad (la `orden` de `elegirProveedor`, o la lista cruda). Round-robin con fallback: cada
 * petición va al proveedor actual; ante 429/5xx o JSON no parseable reintenta (`reintentos`) y, si
 * el fallo es por saldo/key/cuota o persiste, lo marca caído (`reposoMs`) y pasa al siguiente sin
 * tumbar el test. Sin ninguno funcional, lanza con todas las causas.
 */
export function crearGenerador(proveedores: ProveedorLlm[], o: OpcionesGenerador = {}): ControlGenerador {
  if (!proveedores.length) throw new Error('crearGenerador: lista de proveedores vacía');
  const log = o.log ?? logConsola;
  const now = o.now ?? Date.now;
  const esperar = o.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const reintentos = Math.max(1, o.reintentos ?? 3);
  const reposo = o.reposoMs ?? REPOSO_MS;
  const caidos = new Map<string, { causa: string; ts: number }>();
  let indice = 0;

  const disponibles = (): ProveedorLlm[] => {
    for (const [nombre, c] of caidos) if (now() - c.ts >= reposo) caidos.delete(nombre);
    const n = proveedores.length;
    const out: ProveedorLlm[] = [];
    for (let k = 0; k < n; k++) {
      const p = proveedores[(indice + k) % n]!;
      if (!caidos.has(p.nombre)) out.push(p);
    }
    return out;
  };
  const caer = (p: ProveedorLlm, causa: string): void => {
    caidos.set(p.nombre, { causa, ts: now() });
    indice = (proveedores.indexOf(p) + 1) % proveedores.length;
    log(`[llm] ${p.nombre} caído: ${causa} → siguiente proveedor`);
  };

  const generate = async (params: ParamsGenerate): Promise<RespuestaGenerate> => {
    const causas: string[] = [];
    for (const p of disponibles()) {
      indice = proveedores.indexOf(p);
      let ultima = '';
      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          return await generarCon(p, params, o);
        } catch (e) {
          if (e instanceof FalloProveedor && e.definitivo) { ultima = e.causa; intento = reintentos; log(`[llm] ${marcarCooldown(o.rutaLlaves, p.nombre, e.causa, { now: now() })}`); break; }
          ultima = e instanceof Error ? e.message : String(e);
          if (intento < reintentos) await esperar((e instanceof FalloProveedor ? 2000 : 1500) * intento);
        }
      }
      caer(p, ultima);
      causas.push(`${p.nombre}: ${ultima}`);
    }
    for (const [nombre, c] of caidos) if (!causas.some((x) => x.startsWith(`${nombre}:`))) causas.push(`${nombre}: ${c.causa} (caído antes)`);
    throw new Error(`Stagehand: ningún proveedor LLM funcional durante la corrida:\n${causas.map((c) => `  - ${c}`).join('\n')}`);
  };

  const estado = (): EstadoGenerador => ({
    actual: disponibles()[0] ?? null,
    caidos: [...caidos].map(([nombre, c]) => ({ nombre, causa: c.causa, ts: c.ts })),
  });
  return { generate, estado };
}

// ── 4. Destino de pruebas por protocolo ─────────────────────────────────────

/** Normaliza un id de destino del entorno contra los ids válidos; vacío o desconocido → `porDefecto`. */
export function destinoPreferido<Id extends string>(valor: string | undefined, ids: readonly Id[], porDefecto: Id, alias: Record<string, Id> = {}): Id {
  const v = str(valor).toLowerCase();
  const porAlias = alias[v];
  if (porAlias !== undefined) return porAlias;
  return ids.find((id) => id === v) ?? porDefecto;
}

/**
 * Decide el destino: el preferido (o el primero) si su sonda pasa; si no, el siguiente de la lista,
 * con motivo; sin ninguno funcional lanza con las causas. Una sonda que lanza cuenta como fallida.
 */
export async function resolverDestino<Id extends string>(o: OpcionesResolverDestino<Id>): Promise<ContextoDestino<Id>> {
  const log = o.log ?? logConsola;
  if (!o.destinos.length) throw new Error('[destino] lista de destinos vacía');
  const orden = o.preferido ? [...o.destinos.filter((d) => d.id === o.preferido), ...o.destinos.filter((d) => d.id !== o.preferido)] : o.destinos;
  if (o.preferido && orden[0]?.id !== o.preferido) throw new Error(`[destino] preferido ${o.preferido} no está en la lista (${o.destinos.map((d) => d.id).join(', ')})`);
  const sondas: SondaDestino<Id>[] = [];
  for (const d of orden) {
    const t0 = Date.now();
    const r = await d.sondear().catch((e) => ({ ok: false, causa: `sonda lanzó: ${e instanceof Error ? e.message : String(e)}` }));
    const s: SondaDestino<Id> = { destino: d.id, ok: r.ok, causa: r.causa, ms: Date.now() - t0 };
    sondas.push(s);
    log(`[destino] ${s.destino}: ${s.ok ? 'OK' : `FALLA — ${s.causa}`} (${s.ms} ms)`);
    if (s.ok) {
      const previos = sondas.slice(0, -1);
      const motivo = previos.length ? `${previos.map((p) => `${p.destino} falla (${p.causa})`).join('; ')} → protocolo: probar contra ${d.id}` : `preferido ${d.id} responde`;
      if (previos.length) log(`[destino] destino = ${d.id} — ${motivo}`);
      return { destino: d.id, motivo, sondas };
    }
  }
  throw new Error(`[destino] ningún destino funcional:\n${sondas.map((s) => `  - ${s.destino}: ${s.causa}`).join('\n')}`);
}

/**
 * Decisión UNA vez por proceso (destino, proveedor, Stagehand preparado…): la primera llamada a
 * `obtener` crea; las demás reutilizan la misma promesa. `olvidar` solo para tests.
 *
 *   const destino = unaVezPorProceso(() => resolverDestino({ destinos }));
 *   const ctx = await destino.obtener();
 */
export function unaVezPorProceso<T>(crear: () => Promise<T>): { obtener(): Promise<T>; olvidar(): void } {
  let memo: Promise<T> | null = null;
  return {
    obtener() {
      if (!memo) memo = crear();
      return memo;
    },
    olvidar() {
      memo = null;
    },
  };
}

// ── 5. Integración con el sistema común de pruebas ──────────────────────────

/**
 * Todo lo que un `antes` de `definirPruebas` necesita: proveedor (barrido + cache), generador con
 * fallback y destino por protocolo. Si algo no es viable lanza con las causas: la batería queda en
 * rojo con el informe, nunca en verde sin probar. Envolver con `unaVezPorProceso` para decidir una
 * sola vez por proceso (cada archivo de pruebas corre en el suyo con `correrPruebas({ aislar })`).
 */
export async function prepararStagehand<Id extends string>(o: OpcionesPrepararStagehand<Id>): Promise<ContextoStagehand<Id>> {
  const log = o.log ?? logConsola;
  const eleccion = await elegirProveedor({ ...o.eleccion, proveedores: o.proveedores, rutaCache: o.rutaCache, log });
  const control = crearGenerador(eleccion.orden, { ...o.generador, log });
  const contexto = await resolverDestino({ destinos: o.destinos, preferido: o.preferido, log });
  return { eleccion, control, generate: control.generate, contexto };
}

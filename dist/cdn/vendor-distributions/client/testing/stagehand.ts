// @vendor 2026-10-13T13:38:40.106Z Jeff-Aporta/is-webcomponents@local dist/cdn/vendor-distributions/client/testing/stagehand.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * stagehand.ts — controlador de Stagehand para los e2e de navegador de los fronts del kit (ISW y los
 * que vengan), integrado con el sistema común de pruebas (`pruebas.ts` + cooldown).
 *
 * Qué resuelve, sin depender de `@browserbasehq/stagehand` (lo inyecta el consumidor):
 *   - GENERADOR para `Stagehand.create({ model: { generate } })` (`crearGenerador`): pide el esquema
 *     en el prompt, normaliza el JSON (cercos, prosa alrededor) y reintenta; round-robin con
 *     FALLBACK durante la corrida: si un proveedor falla por saldo/cuota/key o 5xx repetido pasa al
 *     siguiente sin tumbar el test; sin ninguno, error con todas las causas.
 *   - DESTINO de pruebas por protocolo (`resolverDestino`): lista `[{ id, sondear }]` en orden de
 *     preferencia; se decide UNA vez por proceso (`unaVezPorProceso`): el preferido si su sonda
 *     pasa, si no el siguiente, con motivo; sin ninguno, error con causas. URLs, JWT y la forma de
 *     fijar el destino en la UI quedan en el consumidor.
 *   - `prepararStagehand`: proveedor (barrido + cache) + generador + destino en un solo paso.
 *
 * La pila de proveedores LLM (lectura de llaves, sonda, barrido, cache, `normalizarJson`) es neutra y
 * vive en `shared/testing/proveedores-llm.ts`; aquí se reexporta para quien ya importaba de `stagehand.ts`.
 * Un proyecto server (jueces sin navegador) vendoriza solo `proveedores-llm.ts`, nunca este archivo.
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
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/testing/stagehand.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../../shared/schemas.ts` (secciones `stagehand`, `proveedores-llm`, `test-cooldown`), `../../shared/testing/proveedores-llm.ts`, `../../shared/testing/test-cooldown.ts` (vendor.ts reescribe las rutas al aplanar).
 * Skill: skills/iswc-foundation/references/11-stagehand.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */
import { contenidoDe, elegirProveedor, evaluarSondaLlm, normalizarJson } from '../../shared/testing/proveedores-llm.ts';
import { marcarCooldown } from '../../shared/testing/test-cooldown.ts';
import type {
  BloqueStagehand,
  ContextoDestino,
  ContextoStagehand,
  ControlGenerador,
  EstadoGenerador,
  MensajeOpenAi,
  OpcionesGenerador,
  OpcionesPrepararStagehand,
  OpcionesResolverDestino,
  ParamsGenerate,
  ParteOpenAi,
  ProveedorLlm,
  RespuestaGenerate,
  SondaDestino,
} from '../../shared/schemas.ts';

export type {
  BloqueStagehand, CacheProveedor, ContextoDestino, ContextoStagehand, ControlGenerador, DestinoPruebas, EleccionProveedor, EstadoGenerador,
  GeneradorStagehand, MensajeOpenAi, MensajeStagehand, OpcionesElegirProveedor, OpcionesGenerador, OpcionesPrepararStagehand, OpcionesResolverDestino,
  OpcionesSonda, OrigenEleccion, ParamsGenerate, ParteOpenAi, ProveedorLlm, RespuestaGenerate, SondaDestino, SondaLlm,
} from '../../shared/schemas.ts';
export {
  barrerProveedores,
  CACHE_TTL_MS,
  elegirProveedor,
  elegirProveedorOpcional,
  evaluarSondaLlm,
  leerProveedoresDeArchivo,
  normalizarJson,
  sondearProveedor,
  validarProveedores,
} from '../../shared/testing/proveedores-llm.ts';

const GENERAR_TIMEOUT_MS = 120_000;
const REPOSO_MS = 5 * 60_000;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const campo = (o: unknown, k: string): unknown => (esObjeto(o) ? o[k] : undefined);
const logConsola = (l: string): void => console.log(l);

// ── 3. Generador (Stagehand `model.generate`) ───────────────────────────────

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

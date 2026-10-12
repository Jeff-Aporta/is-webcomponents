// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * jueces.ts — jueces OPCIONALES para refinar el criterio de las pruebas: JEV (TypeSafe) y un juez LLM
 * (la misma pila de proveedores de Stagehand: MiniMax, DeepSeek…).
 *
 * Regla de diseño (Jeff, 2026-10-12): la base de toda prueba es determinista (fuerza bruta,
 * algoritmos simples). Un juez es una capa EXTRA para lo abstracto (pertinencia de una respuesta,
 * fidelidad de un resumen, calidad de un título, claridad de un error). Si un juez falla (sin llave,
 * sin saldo, key vencida, caído) la prueba NO falla: la capa se salta con aviso y motivo, y se evalúa
 * con lo demás. Una prueba exclusiva de juez se SALTA (no se pone en rojo). Cada llave que falla por
 * saldo/key/cuota entra en cooldown de 24 h (`llaves-cooldown.ts`); `cooldownHasta: -1` la reactiva.
 *
 * Uso:
 *   const v = await preguntarJev({ rutaLlaves }, respuesta, {
 *     pertinente: { type: 'noul', instructions: 'La respuesta contesta la pregunta «…»' },
 *   });
 *   capaOpcional(t, 'jev pertinencia', v, (r) => expect('pertinente', (r.pertinente?.noul ?? 0) >= 0.6));
 *
 * Vendor: `dist/cdn/vendor-distributions/testing/jueces.ts` → carpeta del consumidor junto a `stagehand.ts`. Imports relativos que deben viajar con él: `./jueces.schemas.ts`, `./llaves-cooldown.ts`, `./llaves-cooldown.schemas.ts`, `./stagehand.ts`, `./stagehand.schemas.ts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { ZCuerpoJev, ZLlaveJev } from './jueces.schemas.ts';
import type { ContextoCapa, OpcionesJuez, PreguntaJev, RespuestaJev, VeredictoJuez } from './jueces.schemas.ts';
import { estadoLlave, marcarCooldown } from './llaves-cooldown.ts';
import { evaluarSondaLlm, normalizarJson } from './stagehand.ts';
import { ZArchivoProveedores, ZProveedorLlm } from './stagehand.schemas.ts';

export type * from './jueces.schemas.ts';

const TIMEOUT_MS = 60_000;
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function leerArchivo(ruta: string): Record<string, unknown> | null {
  try {
    if (!existsSync(ruta)) return null;
    const doc: unknown = JSON.parse(readFileSync(ruta, 'utf8'));
    return esObjeto(doc) ? doc : null;
  } catch {
    return null;
  }
}

/** Fallo definitivo de una llave (saldo, key, cuota) según el HTTP y el cuerpo. */
function definitivo(status: number, cuerpo: unknown): string | null {
  const r = evaluarSondaLlm(status, cuerpo);
  if (status === 200) return null;
  return r.definitivo ? r.causa : null;
}

/**
 * Pregunta a JEV sobre `estado` (el texto a juzgar). Nunca lanza: sin llave, en cooldown o con fallo
 * devuelve `{ evaluado: false, motivo }`; un fallo por saldo/key/cuota pone la llave en cooldown.
 */
export async function preguntarJev<K extends string>(o: OpcionesJuez, estado: string, preguntas: Record<K, PreguntaJev>): Promise<VeredictoJuez<Partial<Record<K, RespuestaJev>>>> {
  const doc = leerArchivo(o.rutaLlaves);
  const crudo = doc?.jev;
  const llave = ZLlaveJev.safeParse(crudo);
  if (!llave.success) return { evaluado: false, motivo: 'JEV sin llave configurada (entrada `jev` del archivo de llaves)' };
  const est = estadoLlave(crudo, o.now?.() ?? Date.now());
  if (!est.disponible) return { evaluado: false, motivo: est.motivo };
  const f = o.fetchFn ?? fetch;
  try {
    const res = await f(`${llave.data.baseUrl}/systemone`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${llave.data.apiKey}` },
      body: JSON.stringify({ state: estado, model: llave.data.model, questions: preguntas }),
      signal: AbortSignal.timeout(o.timeoutMs ?? TIMEOUT_MS),
    });
    const cuerpo: unknown = await res.json().catch(() => ({}));
    const def = definitivo(res.status, cuerpo);
    if (def) return { evaluado: false, motivo: marcarCooldown(o.rutaLlaves, llave.data.nombre, def, { now: o.now?.() }) };
    if (res.status !== 200) return { evaluado: false, motivo: `JEV HTTP ${res.status}` };
    const r = ZCuerpoJev.safeParse(cuerpo);
    if (!r.success) return { evaluado: false, motivo: 'JEV respondió sin `answers` válidas' };
    return { evaluado: true, respuestas: r.data.answers as Partial<Record<K, RespuestaJev>>, juez: r.data.model ?? llave.data.model };
  } catch (e) {
    return { evaluado: false, motivo: `JEV sin respuesta (${(e instanceof Error ? e.message : String(e)).slice(0, 80)})` };
  }
}

/**
 * Juez LLM: pide a la pila de proveedores (en orden, saltando los que están en cooldown) un JSON con
 * la forma que describe `instrucciones`. El primero que responde JSON válido gana. Nunca lanza.
 */
export async function juzgarConLlm(o: OpcionesJuez, instrucciones: string, texto: string): Promise<VeredictoJuez<unknown>> {
  const doc = leerArchivo(o.rutaLlaves);
  const lista = ZArchivoProveedores.safeParse(doc ?? {});
  const crudos = lista.success ? lista.data.proveedores : [];
  if (!crudos.length) return { evaluado: false, motivo: 'juez LLM sin proveedores configurados' };
  const f = o.fetchFn ?? fetch;
  const causas: string[] = [];
  for (const c of crudos) {
    const p = ZProveedorLlm.safeParse(c);
    if (!p.success) continue;
    const est = estadoLlave(c, o.now?.() ?? Date.now());
    if (!est.disponible) { causas.push(est.motivo); continue; }
    try {
      const res = await f(`${p.data.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${p.data.apiKey}` },
        body: JSON.stringify({
          model: p.data.model,
          max_tokens: 800,
          messages: [
            { role: 'system', content: `Eres un evaluador estricto de pruebas de software. ${instrucciones} Responde SOLO con JSON, sin texto alrededor.` },
            { role: 'user', content: texto },
          ],
          ...(p.data.extra ?? {}),
        }),
        signal: AbortSignal.timeout(o.timeoutMs ?? TIMEOUT_MS),
      });
      const cuerpo: unknown = await res.json().catch(() => ({}));
      const def = definitivo(res.status, cuerpo);
      if (def) { causas.push(marcarCooldown(o.rutaLlaves, p.data.nombre, def, { now: o.now?.() })); continue; }
      const choices = esObjeto(cuerpo) && Array.isArray(cuerpo.choices) ? cuerpo.choices : [];
      const msg = esObjeto(choices[0]) && esObjeto(choices[0].message) ? choices[0].message.content : '';
      const contenido = typeof msg === 'string' ? msg.replace(/<think>[\s\S]*?<\/think>/g, '') : '';
      try {
        return { evaluado: true, respuestas: normalizarJson(contenido), juez: p.data.nombre };
      } catch {
        causas.push(`${p.data.nombre}: respuesta sin JSON`);
      }
    } catch (e) {
      causas.push(`${p.data.nombre}: sin respuesta (${(e instanceof Error ? e.message : String(e)).slice(0, 60)})`);
    }
  }
  return { evaluado: false, motivo: `juez LLM no disponible: ${causas.join(' | ')}` };
}

/**
 * Capa opcional: si el juez evaluó, corre `aplicar` con sus respuestas; si no, deja un aviso con el
 * motivo y sigue (la prueba queda con sus aserciones deterministas). Devuelve si la capa corrió.
 */
export function capaOpcional<T>(t: ContextoCapa, nombre: string, v: VeredictoJuez<T>, aplicar: (r: T) => void): boolean {
  if ('respuestas' in v) { aplicar(v.respuestas); return true; }
  const msg = `[capa ${nombre}] saltada: ${'motivo' in v ? v.motivo : 'sin motivo'}`;
  if (t.aviso) t.aviso(msg);
  else console.warn(msg);
  return false;
}

/**
 * Para una prueba EXCLUSIVA de juez: sin veredicto, la prueba se salta con el motivo (nunca rojo).
 * Con veredicto devuelve las respuestas.
 */
export function exigirJuez<T>(t: ContextoCapa, nombre: string, v: VeredictoJuez<T>): T {
  if ('respuestas' in v) return v.respuestas;
  const motivo = `[${nombre}] sin juez disponible: ${'motivo' in v ? v.motivo : 'sin motivo'}`;
  if (t.saltar) t.saltar(motivo);
  if (t.skip) t.skip(motivo);
  throw new SaltoJuez(motivo);
}

/** Señal de salto para corredores sin `saltar`/`skip` (el que llama la atrapa y marca la prueba como saltada). */
export class SaltoJuez extends Error {}

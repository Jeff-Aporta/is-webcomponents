/**
 * minimax.ts — modelo para `act()`/`extract()` de Stagehand (bring-your-own-LLM), SOLO fuera del gate.
 *
 * La clave la pone el dev en `dev-token.json` (raíz de la app, ignorado por git; formato en
 * `dev-token.example.json`). Sin ese archivo, las pruebas que piden LLM se saltan con motivo.
 * MiniMax acepta `response_format` pero lo ignora: el JSON se exige en el prompt y se normaliza.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export const DevTokenSchema = z.object({
  minimax: z.object({
    apiKey: z.string().min(10),
    model: z.string().default('MiniMax-M3'),
    baseUrl: z.string().url().default('https://api.minimax.io/v1'),
  }),
}).passthrough();
export type CredencialesMiniMax = z.infer<typeof DevTokenSchema>['minimax'];

/** Credenciales de `dev-token.json`, o `null` si no hay (la prueba se salta con motivo). */
export function credencialesMiniMax(raiz = Deno.cwd()): CredencialesMiniMax | null {
  const ruta = join(raiz, 'dev-token.json');
  if (!existsSync(ruta)) return null;
  const r = DevTokenSchema.safeParse(JSON.parse(readFileSync(ruta, 'utf8')));
  if (!r.success) throw new Error(`dev-token.json no cumple el formato de dev-token.example.json: ${r.error.message}`);
  return r.data.minimax;
}

const esperarMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extrae el primer objeto/array JSON de la respuesta (quita cercos ``` y prosa alrededor). */
function normalizarJson(texto: string): unknown {
  let t = texto.trim();
  const cercos = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (cercos) t = cercos[1]!.trim();
  if (!/^[[{]/.test(t)) {
    const ini = [t.indexOf('{'), t.indexOf('[')].filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (ini === undefined) throw new Error(`MiniMax no devolvió JSON: ${texto.slice(0, 200)}`);
    const abre = t[ini]!;
    const cierra = abre === '{' ? '}' : ']';
    let prof = 0;
    let fin = -1;
    for (let i = ini; i < t.length; i++) {
      if (t[i] === abre) prof++;
      else if (t[i] === cierra && --prof === 0) { fin = i + 1; break; }
    }
    if (fin < 0) throw new Error(`JSON incompleto de MiniMax: ${texto.slice(0, 200)}`);
    t = t.slice(ini, fin);
  }
  return JSON.parse(t);
}

type Bloque = { type?: string; text?: string; mimeType?: string; data?: string; content?: unknown[]; input?: unknown };
function aPartes(bloques: unknown): Array<Record<string, unknown>> {
  return (Array.isArray(bloques) ? bloques : [bloques]).flatMap((b: Bloque | string) => {
    if (typeof b === 'string') return [{ type: 'text', text: b }];
    if (!b || typeof b !== 'object') return [];
    if (b.type === 'text') return [{ type: 'text', text: b.text }];
    if (b.type === 'image') return [{ type: 'image_url', image_url: { url: `data:${b.mimeType};base64,${b.data}` } }];
    return [{ type: 'text', text: `[${b.type}] ${JSON.stringify(b.input ?? b.content ?? b)}` }];
  });
}

/** Generador para `Stagehand.create({ browser, model: { generate } })`. */
export function crearGeneradorMiniMax(c: CredencialesMiniMax) {
  const endpoint = `${c.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  // deno-lint-ignore no-explicit-any
  return async function generar(params: any) {
    const esquema = params?.responseFormat?.schema ? JSON.stringify(params.responseFormat.schema) : '';
    const avisoJson = '\n\nDevuelve UN SOLO objeto JSON válido que cumpla EXACTAMENTE el esquema, sin markdown ni texto extra.'
      + (esquema ? ` Esquema:\n${esquema}` : '');
    const mensajes: Array<Record<string, unknown>> = [];
    if (params.systemPrompt) mensajes.push({ role: 'system', content: params.systemPrompt + avisoJson });
    for (const m of params.messages ?? []) {
      const partes = aPartes(m.content);
      mensajes.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: partes.length === 1 && partes[0]!.type === 'text' ? partes[0]!.text : partes });
    }
    if (!mensajes.length) mensajes.push({ role: 'user', content: 'Responde según el esquema pedido.' });
    const cuerpo = { model: c.model, thinking: { type: 'disabled' }, temperature: params.temperature ?? 0.1, max_completion_tokens: 4096, messages: mensajes, response_format: { type: 'json_object' } };
    let ultimo: Error | null = null;
    for (let intento = 1; intento <= 3; intento++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(120_000),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        ultimo = new Error(`MiniMax ${res.status}: ${d?.base_resp?.status_msg ?? d?.error?.message ?? ''}`);
        if (res.status === 429 || res.status >= 500) { await esperarMs(2000 * intento); continue; }
        throw ultimo;
      }
      const content = String(d?.choices?.[0]?.message?.content ?? '');
      try {
        return {
          role: 'assistant',
          content: { type: 'text', text: content },
          outputFormat: 'json_schema',
          structuredContent: normalizarJson(content),
          usage: { inputTokens: d?.usage?.prompt_tokens ?? 0, outputTokens: d?.usage?.completion_tokens ?? 0, totalTokens: d?.usage?.total_tokens ?? 0 },
        };
      } catch (e) {
        ultimo = e as Error;
        await esperarMs(1500 * intento);
      }
    }
    throw ultimo ?? new Error('MiniMax falló tras reintentos');
  };
}

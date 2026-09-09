// minimax.ts: modelo traido por el cliente (bring-your-own-LLM) para Stagehand v4.
// MiniMax no esta entre los proveedores first-class de Stagehand; se le pasa un
// callback `generate` (POST {base}/chat/completions, thinking desactivado).
// MiniMax acepta response_format pero lo ignora: la rigurosidad JSON se pide en
// el system prompt y el texto se normaliza antes de parsear. Tipado estricto.

const MINIMAX_TIMEOUT_MS = 120_000;

function esperarMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Resultado normalizado del generador (contrato de Stagehand v4). */
export type ResultadoGenerador = { role: 'assistant'; content: { type: 'text'; text: string }; outputFormat: 'json_schema'; structuredContent: unknown; usage: { inputTokens: number; outputTokens: number; totalTokens: number } };

export type OpcionesGenerador = { apiKey: string; model: string; baseUrl?: string };

export type ParamsGenerador = { systemPrompt?: string; messages?: Array<{ role: string; content: unknown }>; temperature?: number; responseFormat?: { schema?: unknown } };

type ParteContenido = { type?: string; text?: string; mimeType?: string; data?: string; content?: Array<{ type?: string; text?: string }>; input?: unknown };

function normalizarJson(texto: string): unknown {
  let t = String(texto ?? '').trim();
  const cercos = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (cercos) t = cercos[1].trim();
  if (!/^[[{]/.test(t)) {
    const ini = t.indexOf('{') >= 0 && (t.indexOf('[') < 0 || t.indexOf('{') < t.indexOf('['))
      ? t.indexOf('{')
      : t.indexOf('[');
    if (ini < 0) throw new Error('MiniMax no devolvio JSON: ' + texto.slice(0, 200));
    const pila: string[] = [];
    const abierta = t[ini];
    const cerrada = abierta === '{' ? '}' : ']';
    let fin = -1;
    for (let i = ini; i < t.length; i++) {
      const c = t[i];
      if (c === abierta) pila.push(c);
      else if (c === cerrada) {
        pila.pop();
        if (pila.length === 0) {
          fin = i + 1;
          break;
        }
      }
    }
    if (fin < 0) throw new Error('JSON incompleto de MiniMax: ' + texto.slice(0, 200));
    t = t.slice(ini, fin);
  }
  try {
    return JSON.parse(t);
  } catch (e) {
    throw new Error('JSON invalido de MiniMax: ' + (e instanceof Error ? e.message : String(e)) + ' | ' + t.slice(0, 200));
  }
}

/** Convierte un bloque de contenido Stagehand a partes tipo OpenAI (texto/imagen). */
function aPartes(bloques: unknown): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const lista = (Array.isArray(bloques) ? bloques : [bloques]) as ParteContenido[];
  const partes: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  for (const b of lista) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'text') {
      partes.push({ type: 'text', text: b.text ?? '' });
    } else if (b.type === 'image') {
      partes.push({
        type: 'image_url',
        image_url: { url: `data:${b.mimeType ?? 'image/png'};base64,${b.data ?? ''}` },
      });
    } else if (b.type === 'tool_result') {
      const txt = (b.content ?? [])
        .map((x) => (x && x.type === 'text' ? x.text : JSON.stringify(x)))
        .filter((x): x is string => typeof x === 'string')
        .join(' ');
      partes.push({ type: 'text', text: txt });
    } else {
      partes.push({ type: 'text', text: `[${String(b.type ?? '?')}] ${JSON.stringify(b.input ?? b)}` });
    }
  }
  return partes;
}

function textoEsquema(esquema: unknown): string {
  try {
    return JSON.stringify(esquema, null, 0);
  } catch {
    return '';
  }
}

export function crearGeneradorMiniMax(opts: OpcionesGenerador) {
  const clave = opts.apiKey;
  const modelo = opts.model;
  let base = (opts.baseUrl ?? 'https://api.minimax.io/v1').replace(/\/+$/, '');
  // El RAG guarda la URL COMPLETA (…/v1/chat/completions): normalizar a base.
  base = base.replace(/\/chat\/completions$/i, '');
  const endpoint = `${base}/chat/completions`;

  return async function generarMiniMax(params: ParamsGenerador): Promise<ResultadoGenerador> {
    if (!clave) throw new Error('falta MINIMAX_API_KEY para el modelo de Stagehand');
    const esquema = textoEsquema(params?.responseFormat?.schema);
    const avisoJson =
      '\n\nDevuelve UN SOLO objeto JSON valido que cumpla EXACTAMENTE el esquema pedido: ' +
      'sin markdown, sin explicaciones, sin texto fuera del JSON, sin campos extra, ' +
      'con todas las claves requeridas presentes. Esquema:\n' +
      (esquema ? `\`\`\`json\n${esquema}\n\`\`\`` : '(sigue las instrucciones del sistema)');
    const mensajes: Array<{ role: string; content: string | unknown }> = [];
    if (params.systemPrompt) {
      mensajes.push({ role: 'system', content: params.systemPrompt + avisoJson });
    }
    for (const m of params.messages ?? []) {
      const contenido = m.content;
      const partes = Array.isArray(contenido) ? aPartes(contenido) : aPartes([contenido]);
      const textoUnico =
        partes.length === 1 && partes[0].type === 'text'
          ? partes[0].text ?? ''
          : partes;
      mensajes.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: textoUnico });
    }
    if (mensajes.length === 0) {
      mensajes.push({ role: 'user', content: 'Responde segun el esquema pedido.' });
    }

    const cuerpo: Record<string, unknown> = {
      model: modelo,
      thinking: { type: 'disabled' },
      temperature: params.temperature ?? 0.1,
      max_completion_tokens: 4096,
      messages: mensajes,
      response_format: { type: 'json_object' },
    };

    let ultimoError: Error | null = null;
    for (let intento = 1; intento <= 3; intento++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clave}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(MINIMAX_TIMEOUT_MS),
        });
        const raw = await res.text();
        let d: { base_resp?: { status_msg?: string }; error?: { message?: string }; choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
        try {
          d = JSON.parse(raw) as typeof d;
        } catch {
          d = {};
        }
        if (!res.ok) {
          const msg =
            d?.base_resp?.status_msg || d?.error?.message || `HTTP ${res.status}`;
          ultimoError = new Error(`MiniMax ${res.status}: ${msg}`);
          if (res.status === 429 || res.status >= 500) {
            await esperarMs(2000 * intento);
            continue;
          }
          throw ultimoError;
        }
        const content = d?.choices?.[0]?.message?.content ?? '';
        if (!content) {
          ultimoError = new Error('MiniMax respondio sin contenido');
          throw ultimoError;
        }
        const parsed = normalizarJson(content);
        const uso = d?.usage ?? {};
        return {
          role: 'assistant',
          content: { type: 'text', text: content },
          outputFormat: 'json_schema',
          structuredContent: parsed,
          usage: {
            inputTokens: uso.prompt_tokens ?? 0,
            outputTokens: uso.completion_tokens ?? 0,
            totalTokens: uso.total_tokens ?? 0,
          },
        };
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (/JSON|incompleto|inv[aá]lido|sin contenido/.test(err.message)) {
          if (intento < 3) {
            ultimoError = err;
            await esperarMs(1500 * intento);
            continue;
          }
          throw err;
        }
        throw err;
      }
    }
    throw ultimoError ?? new Error('MiniMax fallo tras reintentos');
  };
}

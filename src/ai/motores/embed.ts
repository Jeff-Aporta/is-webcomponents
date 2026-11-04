/** embed.ts — motor de la herramienta `embed`; `vectorizar` es lo que usa `vector-local.ts` para buscar, con el mismo modelo ya cargado. */
import { cosineSimilarity, TextEmbedder } from 'runonweb/embed';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';
import { MODELO_LOCAL } from '@jeff-aporta/iswc-base/ai/herramientas.js';

/** Cada línea contra la primera. */
export const crear: Crear = async (_o, alProgreso) => {
  const m = new TextEmbedder({ model: MODELO_LOCAL, device: 'wasm', onProgress: alProgreso });
  await m.load();
  return {
    async ejecutar(e) {
      const lineas = (e as string).split('\n').map((l) => l.trim()).filter(Boolean);
      const { embeddings } = await m.embed(lineas);
      return { barras: lineas.slice(1).map((l, i) => ({ etiqueta: l, valor: cosineSimilarity(embeddings[0]!, embeddings[i + 1]!) })).sort((a, b) => b.valor - a.valor) };
    },
    vectorizar: async (textos) => (await m.embed(textos)).embeddings,
    liberar: () => m.dispose(),
  };
};

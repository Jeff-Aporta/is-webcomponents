/** classify.ts — motor de la herramienta `classify`: una pregunta de opción sobre el texto. */
import { Classifier } from 'runonweb/classify';
import type { Crear } from '../schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new Classifier({ onProgress: alProgreso });
  await m.load();
  return {
    async ejecutar(e, o) {
      const criteria = Object.fromEntries((o['categorias'] ?? '').split(',').map((c) => [c.trim(), null]).filter(([c]) => c));
      const { answers } = await m.classify({ state: e as string, questions: { categoria: { type: 'choice', instructions: o['pregunta'] ?? '', criteria } } });
      const r = answers['categoria'] as unknown as { probabilities: Record<string, number> };
      return { barras: Object.entries(r.probabilities).map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor) };
    },
    liberar: () => m.dispose(),
  };
};

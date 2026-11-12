// @contexto INDICE.md · src/ai/README.md
/** translate.ts — motor de la herramienta `translate`: un modelo por par de idiomas. */
import { Translator } from 'runonweb/translate';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

export const crear: Crear = async (o, alProgreso) => {
  const m = new Translator({ from: o['de'], to: o['a'], onProgress: alProgreso });
  await m.load();
  return { ejecutar: async (e) => ({ texto: (await m.translate(e as string)).text }), liberar: () => m.dispose() };
};

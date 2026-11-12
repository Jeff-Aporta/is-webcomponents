// @contexto INDICE.md · src/ai/README.md
/** clean.ts — motor de la herramienta `clean`. */
import { TranscriptCleaner } from 'runonweb/clean';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new TranscriptCleaner({ onProgress: alProgreso });
  await m.load();
  return {
    ejecutar: async (e, o, parcial) => ({ texto: (await m.clean(e as string, { styling: (o['estilo'] ?? 'semi-formal') as 'formal', structure: (o['forma'] ?? 'prose') as 'prose', onPartial: parcial })).text }),
    liberar: () => m.dispose(),
  };
};

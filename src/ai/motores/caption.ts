/** caption.ts — motor de la herramienta `caption`. Los topes de runonweb cortan el español a media frase (48 fichas en `short`). */
import { ImageCaptioner } from 'runonweb/caption';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

const FICHAS: Record<string, number> = { short: 96, detailed: 192, more: 400 };

export const crear: Crear = async (_o, alProgreso) => {
  const m = new ImageCaptioner({ onProgress: alProgreso });
  await m.load();
  return {
    ejecutar: async (e, o, parcial) => ({ texto: (await m.caption(e as Blob, { language: o['idioma'] ?? 'es', detail: (o['detalle'] ?? 'short') as 'short', maxNewTokens: FICHAS[o['detalle'] ?? 'short'], onPartial: parcial })).text }),
    liberar: () => m.dispose(),
  };
};

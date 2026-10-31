/** tts.ts — motor de la herramienta `tts`: `multi` es el único tamaño que habla español. */
import { TextToSpeech } from 'runonweb/tts';
import type { Crear } from '../schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new TextToSpeech({ size: 'multi', voice: 'st_f1', language: 'es', onProgress: alProgreso });
  await m.load();
  return { ejecutar: async (e, o) => ({ audio: await m.speakToBlob(e as string, { voice: o['voz'] ?? 'st_f1', language: o['idioma'] ?? 'es' }) }), liberar: () => m.dispose() };
};

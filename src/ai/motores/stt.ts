/** stt.ts — motor de la herramienta `stt`. El modelo por defecto de runonweb solo oye inglés: este es multilingüe. */
import { SpeechToText } from 'runonweb/stt';
import type { Crear } from '../schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new SpeechToText({ model: 'onnx-community/whisper-tiny', onProgress: alProgreso });
  await m.load();
  return {
    ejecutar: async (e, o, parcial) => ({ texto: (await m.transcribe(e as Blob, { language: o['idioma'] ?? 'es', onPartial: parcial })).text }),
    liberar: () => m.dispose(),
  };
};

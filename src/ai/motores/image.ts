/** image.ts — motor de la herramienta `image`. */
import { ImageGenerator } from 'runonweb/image';
import type { Crear } from '../schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new ImageGenerator({ onProgress: alProgreso });
  await m.load();
  return { ejecutar: async (e) => ({ imagen: (await m.generate(e as string)).image }), liberar: () => m.dispose() };
};

/** depth.ts — motor de la herramienta `depth`. */
import { DepthEstimator } from 'runonweb/depth';
import type { Crear } from '../schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new DepthEstimator({ onProgress: alProgreso });
  await m.load();
  return { ejecutar: async (e) => ({ imagen: (await m.estimate(e as Blob)).depth }), liberar: () => m.dispose() };
};

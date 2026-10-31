/**
 * remove-bg.ts — motor de la herramienta `remove-bg`. Va en WASM: BEN2 solo existe en fp16 y onnxruntime-web 1.30–1.31-dev
 * rompe su sombreador `LayerNorm` en WebGPU (microsoft/onnxruntime#32627).
 */
import { RemoveBackground } from 'runonweb/remove-bg';
import type { Crear } from '../schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new RemoveBackground({ device: 'wasm', onProgress: alProgreso });
  await m.load();
  return { ejecutar: async (e) => ({ imagen: await m.remove(e as Blob) }), liberar: () => m.dispose() };
};

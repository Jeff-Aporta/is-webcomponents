// @contexto INDICE.md · src/ai/README.md
/** ocr.ts — motor de la herramienta `ocr` (cajas en fracción de la imagen). */
import { OCR } from 'runonweb/ocr';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

export const crear: Crear = async (o, alProgreso) => {
  const m = new OCR({ size: o['tamano'] as 'tiny' | 'small' | 'medium', onProgress: alProgreso });
  await m.load();
  return {
    async ejecutar(e) {
      const { width, height } = await createImageBitmap(e as Blob);
      const r = await m.read(e as Blob);
      return { texto: r.text, cajas: r.lines.map((l) => ({ etiqueta: l.text, puntaje: l.score, xmin: l.box.xmin / width, ymin: l.box.ymin / height, xmax: l.box.xmax / width, ymax: l.box.ymax / height })) };
    },
    liberar: () => void m.dispose(),
  };
};

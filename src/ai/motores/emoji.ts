/** emoji.ts — motor de la herramienta `emoji`. El modelo se entrenó en inglés: el español pasa antes por el traductor. */
import { Emojifier } from 'runonweb/emoji';
import { Translator } from 'runonweb/translate';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

export const crear: Crear = async (_o, alProgreso) => {
  const m = new Emojifier({ onProgress: alProgreso });
  const t = new Translator({ from: 'es', to: 'en', onProgress: alProgreso });
  await Promise.all([m.load(), t.load()]);
  return {
    async ejecutar(e) {
      const { text } = await t.translate(e as string);
      return { texto: (await m.emojify(text)).text };
    },
    liberar() {
      m.dispose();
      t.dispose();
    },
  };
};

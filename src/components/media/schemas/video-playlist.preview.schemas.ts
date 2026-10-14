/**
 * video-playlist.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IswcVideoPlaylistSchema = z.object({
  placement: z.union([z.literal('left'), z.literal('right'), z.literal('bottom')]),
});
export type IswcVideoPlaylist = z.infer<typeof IswcVideoPlaylistSchema>;


// @contexto INDICE.md · src/components/media/README.md
/**
 * video-playlist.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const IswcVideoLikeSchema = z.object({
  media: z.unknown() /* TODO: ref HTMLVideoElement */,
  play: z.function({ input: [], output: z.promise(z.void()) }),
  pause: z.function({ input: [], output: z.void() }),
});

const IswcVideoSchema = IswcVideoLikeSchema;
export type IswcVideo = z.infer<typeof IswcVideoSchema>;

const VideoListSchema = z.array(z.unknown() /* TODO: cannot convert */);
export type VideoList = z.infer<typeof VideoListSchema>;

const MediaObsBagSchema = z.object({
  mq: z.unknown() /* TODO: ref MediaQueryList */,
  handler: z.function({ input: [], output: z.void() }),
});
export type MediaObsBag = z.infer<typeof MediaObsBagSchema>;

const ActivateOptionsSchema = z.object({
  play: z.boolean().optional(),
  previousIndex: z.number().optional(),
});
export type ActivateOptions = z.infer<typeof ActivateOptionsSchema>;

const ApplyActiveOptionsSchema = z.object({
  emit: z.boolean().optional(),
  previousIndex: z.number().optional(),
});
export type ApplyActiveOptions = z.infer<typeof ApplyActiveOptionsSchema>;


/**
 * video-playlist.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IswcVideoLikeSchema = z.object({
  media: z.unknown() /* TODO: ref HTMLVideoElement */,
  play: z.function({ input: [], output: z.promise(z.void()) }),
  pause: z.function({ input: [], output: z.void() }),
});
export type IswcVideoLike = z.infer<typeof IswcVideoLikeSchema>;


export const IswcVideoSchema = IswcVideoLikeSchema;
export type IswcVideo = z.infer<typeof IswcVideoSchema>;


export const VideoListSchema = z.array(z.unknown() /* TODO: cannot convert */);
export type VideoList = z.infer<typeof VideoListSchema>;


export const MediaObsBagSchema = z.object({
  mq: z.unknown() /* TODO: ref MediaQueryList */,
  handler: z.function({ input: [], output: z.void() }),
});
export type MediaObsBag = z.infer<typeof MediaObsBagSchema>;


export const ActivateOptionsSchema = z.object({
  play: z.boolean().optional(),
  previousIndex: z.number().optional(),
});
export type ActivateOptions = z.infer<typeof ActivateOptionsSchema>;


export const ApplyActiveOptionsSchema = z.object({
  emit: z.boolean().optional(),
  previousIndex: z.number().optional(),
});
export type ApplyActiveOptions = z.infer<typeof ApplyActiveOptionsSchema>;


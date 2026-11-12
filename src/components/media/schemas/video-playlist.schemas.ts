// @contexto INDICE.md · src/components/media/README.md
/**
 * video-playlist.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/**
 * `<iswc-video>` es un HTMLElement con la API pública que consume la
 * playlist. El tipo base se declara aquí para que el consumidor herede los
 * métodos DOM (atributos, eventos y fullscreen) sin casts.
 */
const IswcVideoLikeSchema = z.intersection(z.custom<HTMLElement>(() => true), z.object({
  media: z.custom<HTMLVideoElement>(),
  play: z.function({ input: [], output: z.promise(z.void()) }),
  pause: z.function({ input: [], output: z.void() }),
}));

const IswcVideoSchema = IswcVideoLikeSchema;
export type IswcVideo = z.infer<typeof IswcVideoSchema>;

const VideoListSchema = z.array(IswcVideoSchema);
export type VideoList = z.infer<typeof VideoListSchema>;

const MediaObsBagSchema = z.object({
  mq: z.custom<MediaQueryList>(),
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

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type VideoPlaylistEventos = { 'iswc-error': { index: number }; 'iswc-video-change': { previousIndex: number; currentIndex: number; video: HTMLVideoElement }; 'iswc-change': { index: number } };

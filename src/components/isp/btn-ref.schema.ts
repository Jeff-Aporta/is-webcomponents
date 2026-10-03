/**
 * btn-ref.schema.ts — esquemas Zod para tipos locales del btn-ref.
 */
import { z } from "zod";

/** Record plano (cualquier clave con cualquier valor). */
export const _RecordLikeSchema = z.record(z.string(), z.unknown());
export type _RecordLike = z.infer<typeof _RecordLikeSchema>;
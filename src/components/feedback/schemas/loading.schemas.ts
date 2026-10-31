/**
 * loading.schemas.ts — props de `<iswc-loading>`.
 */
import { z } from "zod";

export const LoadingPropsSchema = z.object({ texto: z.string() });
export type LoadingProps = z.infer<typeof LoadingPropsSchema>;

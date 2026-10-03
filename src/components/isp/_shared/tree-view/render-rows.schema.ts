/**
 * render-rows.schema.ts — esquemas Zod para tipos locales del render.
 */

import { z } from "zod";
import type { RowController } from "./render-rows.js";

/** Almacén de handlers en `._trvwrH` para evitar doble-binding. */
export const HandlerStoreSchema = z.record(z.string(), z.custom<EventListener>().optional());
export type HandlerStore = z.infer<typeof HandlerStoreSchema>;

/** Tipo del `isLockedByProtection` que consume `paintHandle`. */
export const ControllerWithLockSchema = z.custom<RowController>();
export type ControllerWithLock = z.infer<typeof ControllerWithLockSchema>;

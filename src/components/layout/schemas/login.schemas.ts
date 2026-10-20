/**
 * login.schemas.ts — `accounts` y `sessions` de <iswc-login>.
 */
import { z } from "zod";

export const LoginAccountSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  provider: z.string().optional(),
  lastUsed: z.string().optional(),
});
export type LoginAccount = z.infer<typeof LoginAccountSchema>;

export const LoginSessionSchema = z.object({
  id: z.string(),
  ip: z.string().optional(),
  device: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
  lastAccess: z.string().optional(),
  current: z.boolean().optional(),
});
export type LoginSession = z.infer<typeof LoginSessionSchema>;

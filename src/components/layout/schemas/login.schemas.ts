// @contexto INDICE.md · src/components/layout/README.md
/**
 * login.schemas.ts — `accounts` y `sessions` de <iswc-login>.
 */
import { z } from "zod";

const LoginAccountSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  provider: z.string().optional(),
  lastUsed: z.string().optional(),
});
export type LoginAccount = z.infer<typeof LoginAccountSchema>;

const LoginSessionSchema = z.object({
  id: z.string(),
  ip: z.string().optional(),
  device: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
  lastAccess: z.string().optional(),
  current: z.boolean().optional(),
});
export type LoginSession = z.infer<typeof LoginSessionSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type LoginEventos = { 'iswc-remember-change': { remember: boolean }; 'iswc-sessions-refresh': Record<string, never>; 'iswc-forgot': { username: string }; 'iswc-logout-all': Record<string, never>; 'iswc-add-account': Record<string, never>; 'iswc-login-submit': { username: string; password: string; remember: boolean; provider: string }; 'iswc-password-change': { current: string; next: string }; 'iswc-account-select': { account: unknown }; 'iswc-remove-account': { account: unknown }; 'iswc-session-revoke': { sessionId: string } };

/**
 * login-dropdown.schemas.ts — `choices` y detalle de `iswc-login-submit` de <iswc-login-dropdown>
 * (contrato público, ver specs/app-shell/spec.md).
 */
import { z } from "zod";

export const LoginChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
});
export type LoginChoice = z.infer<typeof LoginChoiceSchema>;

export const LoginModeSchema = z.enum(['password', 'token']);
export type LoginMode = z.infer<typeof LoginModeSchema>;

export const LoginDropdownSubmitSchema = z.object({
  mode: LoginModeSchema,
  username: z.string(),
  password: z.string(),
  remember: z.boolean(),
  provider: z.string().optional(),
  token: z.string().optional(),
  choice: z.string().optional(),
});
export type LoginDropdownSubmit = z.infer<typeof LoginDropdownSubmitSchema>;

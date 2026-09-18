/**
 * Web OTP API: el SMS con el origen rellena el código. AbortError = timeout/cancel.
 */
export function isOtpAutocomplete(value: string | null | undefined): boolean {
  return /one-time-code|\botp\b/i.test(String(value || ''));
}

/**
 * Suscribe el `WebOTP Credential` (si el navegador lo soporta) para que el
 * código del SMS rellene automáticamente el input cuando llegue.
 *
 * @param signal Señal para abortar la escucha (timeout / cleanup).
 * @param onCode Callback con el código recibido.
 */
export function listenWebOtp(signal: AbortSignal, onCode: (code: string) => void): void {
  const win = window as Window & { OTPCredential?: unknown };
  if (!('OTPCredential' in win) || typeof navigator.credentials?.get !== 'function') return;
  navigator.credentials.get({ otp: { transport: ['sms'] }, signal } as CredentialRequestOptions)
    .then((cred) => {
      const code = cred && (cred as { code?: unknown }).code;
      if (code) onCode(String(code));
    })
    .catch(() => {});
}

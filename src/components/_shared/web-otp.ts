/**
 * Web OTP API: el SMS con el origen rellena el código. AbortError = timeout/cancel.
 */
export function isOtpAutocomplete(value) {
  return /one-time-code|\botp\b/i.test(String(value || ''));
}

/**
 * @param {AbortSignal} [signal]
 * @param {(code: string) => void} onCode
 */
export function listenWebOtp(signal: AbortSignal, onCode: (code: string) => void) {
  if (!('OTPCredential' in window) || typeof navigator.credentials?.get !== 'function') return;
  navigator.credentials.get({ otp: { transport: ['sms'] }, signal })
    .then((cred) => {
      const code = cred && cred.code;
      if (code) onCode(String(code));
    })
    .catch(() => {});
}

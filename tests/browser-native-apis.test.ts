// tests/browser-native-apis.test.ts
//
// Las APIs nativas del navegador viven en tags concretos (o en el form que ya
// las cubre). Este test evita que se “documenten” y desaparezcan del JS.
//
// Uso: node tests/browser-native-apis.test.ts

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => readFileSync(join(root, 'src', 'components', ...p), 'utf8');

const checks = [
  ['media/speech.ts', ['SpeechRecognition', 'webkitSpeechRecognition', 'speechSynthesis', 'SpeechSynthesisUtterance']],
  ['forms/color-picker.ts', ['EyeDropper', 'sRGBHex']],
  ['_shared/web-share.ts', ['navigator.share', 'AbortError']],
  ['actions/share-button.ts', ['sharePayload', 'share-title']],
  ['media/barcode-scanner.ts', ['BarcodeDetector', 'getUserMedia']],
  ['media/media-recorder.ts', ['getDisplayMedia', 'MediaRecorder', 'getUserMedia']],
  ['_shared/web-otp.ts', ['OTPCredential', "transport: ['sms']"]],
  ['forms/input.ts', ['listenWebOtp', 'is-otp']],
  ['forms/pin-input.ts', ['listenWebOtp', 'one-time-code']],
  ['helpers/wake-lock.ts', ["wakeLock.request('screen')", 'visibilitychange']],
  ['helpers/offscreen-canvas.ts', ['transferControlToOffscreen', 'new Worker']],
];

const failures = [];
for (const [file, needles] of checks) {
  const text = src(...file.split('/'));
  for (const n of needles) {
    if (!text.includes(n)) failures.push(`${file}: falta "${n}"`);
  }
}

const imageEditor = src('media', 'image-editor.ts');
if (imageEditor.includes('transferControlToOffscreen')) {
  failures.push('media/image-editor.ts: no transferir el canvas (puntero + 2d en el hilo principal)');
}

assert.equal(failures.length, 0, failures.join('\n'));
console.log(`browser-native-apis.test.ts: PASS — ${checks.length} módulos`);

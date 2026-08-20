// tests/browser-native-apis.test.mjs
//
// Las APIs nativas del navegador viven en tags concretos (o en el form que ya
// las cubre). Este test evita que se “documenten” y desaparezcan del JS.
//
// Uso: node tests/browser-native-apis.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => readFileSync(join(root, 'src', 'components', ...p), 'utf8');

const checks = [
  ['media/speech.js', ['SpeechRecognition', 'webkitSpeechRecognition', 'speechSynthesis', 'SpeechSynthesisUtterance']],
  ['forms/color-picker.js', ['EyeDropper', 'sRGBHex']],
  ['_shared/web-share.js', ['navigator.share', 'AbortError']],
  ['actions/share-button.js', ['sharePayload', 'share-title']],
  ['media/barcode-scanner.js', ['BarcodeDetector', 'getUserMedia']],
  ['media/media-recorder.js', ['getDisplayMedia', 'MediaRecorder', 'getUserMedia']],
  ['_shared/web-otp.js', ['OTPCredential', "transport: ['sms']"]],
  ['forms/input.js', ['listenWebOtp', 'is-otp']],
  ['forms/pin-input.js', ['listenWebOtp', 'one-time-code']],
  ['helpers/wake-lock.js', ["wakeLock.request('screen')", 'visibilitychange']],
  ['helpers/offscreen-canvas.js', ['transferControlToOffscreen', 'new Worker']],
];

const failures = [];
for (const [file, needles] of checks) {
  const text = src(...file.split('/'));
  for (const n of needles) {
    if (!text.includes(n)) failures.push(`${file}: falta "${n}"`);
  }
}

const imageEditor = src('media', 'image-editor.js');
if (imageEditor.includes('transferControlToOffscreen')) {
  failures.push('media/image-editor.js: no transferir el canvas (puntero + 2d en el hilo principal)');
}

assert.equal(failures.length, 0, failures.join('\n'));
console.log(`browser-native-apis.test.mjs: PASS — ${checks.length} módulos`);

// tests/_jsdom-shim.ts
//
// Shim mínimo para tests que necesitan `window` o `document`.
// Si el runner ya provee DOM, este archivo exporta el global.
// Si no, crea un stub mínimo que satisface las firmas básicas.

declare const globalThis: any;

if (typeof globalThis.window === 'undefined') {
  // Stub muy mínimo: solo lo que usan los tests importados aquí.
  globalThis.window = globalThis.window ?? globalThis;
  globalThis.document = globalThis.document ?? {
    body: null,
    createElementNS: () => ({ setAttribute: () => {}, appendChild: () => {} }),
  };
}

export const window = globalThis.window;
export const document = globalThis.document;
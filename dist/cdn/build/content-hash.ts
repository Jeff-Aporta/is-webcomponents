/**
 * Hash corto de contenido para cache-bust (`?v=`).
 * 6 caracteres, alfabeto [0-9a-z]. Cambia si cambia un byte.
 * Mismo resultado en el build (Node) y si otro proyecto lo importa por vendor.
 */
export const ASSET_HASH_LEN = 6;

const ALPH = '0123456789abcdefghijklmnopqrstuvwxyz';
const MASK = (1n << 64n) - 1n;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const SPAN = 36n ** BigInt(ASSET_HASH_LEN);

export function contentHash(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]);
    h = (h * FNV_PRIME) & MASK;
  }
  let n = h % SPAN;
  let s = '';
  for (let i = 0; i < ASSET_HASH_LEN; i++) {
    s = ALPH[Number(n % 36n)] + s;
    n /= 36n;
  }
  return s;
}

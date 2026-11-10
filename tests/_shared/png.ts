// @contexto INDICE.md · tests/_shared/README.md
// png.ts — decodifica un PNG de 8 bits (RGB o RGBA, sin entrelazar: lo que entrega la captura de Chromium) y compara
// dos por píxel. Las pruebas de PNG comparan píxeles y no bytes: Edge rasteriza el MISMO SVG con ruido de
// antialias entre corridas (medido 6-nov-2026: 22 píxeles con Δ ≤ 2 en el borde punteado de una tabla, el PNG
// 1 byte más o menos); un pulso o un radar son miles de píxeles con Δ de decenas.
// category: "how"
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';

type Imagen = { w: number; h: number; rgba: Uint8Array };

/** Píxeles RGBA de un PNG de 8 bits por canal, tipo de color 2 (RGB) o 6 (RGBA), sin entrelazado. */
function decodificarPng(png: Uint8Array): Imagen {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const w = dv.getUint32(16);
  const h = dv.getUint32(20);
  const profundidad = png[24];
  const tipo = png[25];
  if (profundidad !== 8 || (tipo !== 2 && tipo !== 6) || png[28] !== 0) throw new Error(`PNG no soportado (profundidad ${profundidad}, tipo ${tipo}, entrelazado ${png[28]})`);
  const partes: Uint8Array[] = [];
  for (let p = 8; p < png.length;) {
    const largo = dv.getUint32(p);
    const nombre = String.fromCharCode(...png.subarray(p + 4, p + 8));
    if (nombre === 'IDAT') partes.push(png.subarray(p + 8, p + 8 + largo));
    p += 12 + largo;
  }
  const datos = inflateSync(Buffer.concat(partes));
  const bpp = tipo === 6 ? 4 : 3;
  const fila = w * bpp;
  const crudo = new Uint8Array(h * fila);
  for (let y = 0; y < h; y++) {
    const filtro = datos[y * (fila + 1)]!;
    const src = y * (fila + 1) + 1;
    const dst = y * fila;
    for (let x = 0; x < fila; x++) {
      const a = x >= bpp ? crudo[dst + x - bpp]! : 0;
      const b = y > 0 ? crudo[dst - fila + x]! : 0;
      const c = x >= bpp && y > 0 ? crudo[dst - fila + x - bpp]! : 0;
      const v = datos[src + x]!;
      let pred = 0;
      if (filtro === 1) pred = a;
      else if (filtro === 2) pred = b;
      else if (filtro === 3) pred = (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      crudo[dst + x] = (v + pred) & 0xff;
    }
  }
  if (bpp === 4) return { w, h, rgba: crudo };
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0, j = 0; i < crudo.length; i += 3, j += 4) {
    rgba[j] = crudo[i]!;
    rgba[j + 1] = crudo[i + 1]!;
    rgba[j + 2] = crudo[i + 2]!;
    rgba[j + 3] = 255;
  }
  return { w, h, rgba };
}

/** Píxeles que difieren en más de `tolerancia` (por canal) entre dos PNG del mismo tamaño, y la mayor diferencia. */
export function diferenciaPng(a: Uint8Array, b: Uint8Array, tolerancia: number): { distintos: number; maxima: number; total: number } {
  const A = decodificarPng(a);
  const B = decodificarPng(b);
  if (A.w !== B.w || A.h !== B.h) throw new Error(`PNG de tamaños distintos: ${A.w}x${A.h} y ${B.w}x${B.h}`);
  let distintos = 0;
  let maxima = 0;
  for (let i = 0; i < A.rgba.length; i += 4) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A.rgba[i + k]! - B.rgba[i + k]!));
    maxima = Math.max(maxima, d);
    if (d > tolerancia) distintos++;
  }
  return { distintos, maxima, total: A.w * A.h };
}

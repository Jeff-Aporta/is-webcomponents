/**
 * ag-grid/filas/zip — Escritor ZIP minimo para XLSX. Sin dependencias.
 *
 * `zipGuardado` es sincrono (metodo store), necesario para getDataAsExcel, que en
 * AG Grid devuelve un Blob al instante. `zipComprimido` usa CompressionStream
 * cuando existe y cae al guardado si no.
 */
import type { EntradaZip } from './filas.schemas.js';

const TABLA_CRC = /* @__PURE__ */ (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = -1;
  for (let i = 0; i < datos.length; i++) c = (TABLA_CRC[(c ^ (datos[i] as number)) & 0xff] as number) ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function cabeceraLocal(nombre: Uint8Array, crc: number, comprimido: number, original: number, metodo: number): Uint8Array {
  const b = new Uint8Array(30 + nombre.length);
  const v = new DataView(b.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true);
  v.setUint16(6, 0x0800, true);
  v.setUint16(8, metodo, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, 0x21, true);
  v.setUint32(14, crc, true);
  v.setUint32(18, comprimido, true);
  v.setUint32(22, original, true);
  v.setUint16(26, nombre.length, true);
  b.set(nombre, 30);
  return b;
}

function entradaCentral(nombre: Uint8Array, crc: number, comprimido: number, original: number, metodo: number, desplazamiento: number): Uint8Array {
  const b = new Uint8Array(46 + nombre.length);
  const v = new DataView(b.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 20, true);
  v.setUint16(6, 20, true);
  v.setUint16(8, 0x0800, true);
  v.setUint16(10, metodo, true);
  v.setUint16(14, 0x21, true);
  v.setUint32(16, crc, true);
  v.setUint32(20, comprimido, true);
  v.setUint32(24, original, true);
  v.setUint16(28, nombre.length, true);
  v.setUint32(42, desplazamiento, true);
  b.set(nombre, 46);
  return b;
}

function ensamblar(entradas: readonly EntradaZip[], cuerpos: readonly Uint8Array[], metodo: number): Uint8Array {
  const cod = new TextEncoder();
  const partes: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let pos = 0;
  entradas.forEach((e, i) => {
    const nombre = cod.encode(e.nombre);
    const crc = crc32(e.datos);
    const cuerpo = cuerpos[i] as Uint8Array;
    const local = cabeceraLocal(nombre, crc, cuerpo.length, e.datos.length, metodo);
    centrales.push(entradaCentral(nombre, crc, cuerpo.length, e.datos.length, metodo, pos));
    partes.push(local, cuerpo);
    pos += local.length + cuerpo.length;
  });
  const inicioCentral = pos;
  for (const c of centrales) {
    partes.push(c);
    pos += c.length;
  }
  const fin = new Uint8Array(22);
  const v = new DataView(fin.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, entradas.length, true);
  v.setUint16(10, entradas.length, true);
  v.setUint32(12, pos - inicioCentral, true);
  v.setUint32(16, inicioCentral, true);
  partes.push(fin);
  const out = new Uint8Array(pos + 22);
  let cursor = 0;
  for (const p of partes) {
    out.set(p, cursor);
    cursor += p.length;
  }
  return out;
}

export function zipGuardado(entradas: readonly EntradaZip[]): Uint8Array {
  return ensamblar(entradas, entradas.map((e) => e.datos), 0);
}

async function desinflar(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

export async function zipComprimido(entradas: readonly EntradaZip[]): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return zipGuardado(entradas);
  const cuerpos = await Promise.all(entradas.map((e) => desinflar(e.datos)));
  return ensamblar(entradas, cuerpos, 8);
}

/**
 * ag-grid/edicion/portapapeles — Serializacion pura compatible con Excel
 * y la regla de repeticion al pegar sobre un rango.
 */
import { cuantasCeldas } from './rangos.js';
import type { Rango } from './schemas/edicion.schemas.js';

function citar(texto: string, delimitador: string): string {
  const especial = texto.includes(delimitador) || texto.includes('\n') || texto.includes('\r') || texto.includes('"');
  if (!especial) return texto;
  return `"${texto.replaceAll('"', '""')}"`;
}

export function aTexto(matriz: string[][], delimitador: string): string {
  return matriz.map((fila) => fila.map((c) => citar(c, delimitador)).join(delimitador)).join('\n');
}

/** Lee la matriz de un texto, respetando comillas. La linea vacia final se descarta salvo que se pida conservarla. */
export function desdeTexto(texto: string, delimitador: string, conservarUltimaVacia = false): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i] ?? '';
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        enComillas = false;
      } else {
        actual += c;
      }
      continue;
    }
    if (c === '"' && actual === '') {
      enComillas = true;
    } else if (texto.startsWith(delimitador, i)) {
      fila.push(actual);
      actual = '';
      i += delimitador.length - 1;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(actual);
      filas.push(fila);
      fila = [];
      actual = '';
    } else {
      actual += c;
    }
  }
  fila.push(actual);
  filas.push(fila);
  const ultima = filas[filas.length - 1];
  const vacia = ultima?.length === 1 && ultima[0] === '';
  if (vacia && !conservarUltimaVacia && filas.length > 1) filas.pop();
  return filas;
}

/**
 * Si el rango destino es multiplo exacto de lo copiado, se repite hasta
 * llenarlo. Si no, se devuelve tal cual y se pega desde su esquina.
 */
export function ajustarAlRango(matriz: string[][], destino: Rango): string[][] {
  const alto = matriz.length;
  const ancho = matriz[0]?.length ?? 0;
  if (!alto || !ancho) return matriz;
  const filasDestino = destino.filaHasta - destino.filaDesde + 1;
  const colsDestino = destino.colHasta - destino.colDesde + 1;
  const mayor = cuantasCeldas(destino) > alto * ancho;
  const exacto = filasDestino % alto === 0 && colsDestino % ancho === 0;
  if (!mayor || !exacto) return matriz;
  const salida: string[][] = [];
  for (let f = 0; f < filasDestino; f++) {
    const fuente = matriz[f % alto] ?? [];
    const fila: string[] = [];
    for (let c = 0; c < colsDestino; c++) fila.push(fuente[c % ancho] ?? '');
    salida.push(fila);
  }
  return salida;
}

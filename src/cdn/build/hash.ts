/**
 * Hashes cortos y deterministas, reusables por cualquier app (vendorizable).
 *
 *   hashBase(texto)  — FNV-1a 64 → 6 caracteres [0-9a-z] sobre CUALQUIER texto, tal cual.
 *   hashJs(texto)    — huella ejecutable de JS/TS: sin comentarios, blanco colapsado.
 *   hashCss(texto)   — huella de CSS: sin comentarios, blanco colapsado.
 *   hashHtml(texto)  — huella de HTML: sin `<!-- -->`, blanco colapsado.
 *   hashPorRuta(ruta, texto) — elige el especializado por extensión (o hashBase).
 *
 * Los especializados solo quitan lo que no se ejecuta: cambiar un comentario o reindentar no
 * cambia el hash; cambiar código sí.
 *
 * Longitud: con ~700 archivos sellados, 36^6 deja la probabilidad de que dos compartan hash en
 * ~0,02 % por build (5 caracteres: ~1 %). `hashesRepetidos` lo vigila: el barrido
 * `?v=viejo` → `?v=nuevo` (sync-hashes) depende de que cada hash nombre un solo archivo.
 */
export const HASH_LEN = 6;

const ALPH = '0123456789abcdefghijklmnopqrstuvwxyz';
const MASK = (1n << 64n) - 1n;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const SPAN = 36n ** BigInt(HASH_LEN);

export function hashBase(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]);
    h = (h * FNV_PRIME) & MASK;
  }
  let n = h % SPAN;
  let s = '';
  for (let i = 0; i < HASH_LEN; i++) {
    s = ALPH[Number(n % 36n)] + s;
    n /= 36n;
  }
  return s;
}

const colapsar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

/** Quita comentarios fuera de cadenas. `lineas`: también `// …` (JS), solo a inicio de línea o
 *  tras blanco, para que en código minificado un `//` de una regex no se trague el archivo. */
function sinComentarios(texto: string, lineas: boolean): string {
  let out = '';
  let i = 0;
  const n = texto.length;
  while (i < n) {
    const c = texto[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && texto[j] !== c) j += texto[j] === '\\' ? 2 : 1;
      out += texto.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '/' && texto[i + 1] === '*') {
      const fin = texto.indexOf('*/', i + 2);
      i = fin < 0 ? n : fin + 2;
      out += ' ';
      continue;
    }
    if (lineas && c === '/' && texto[i + 1] === '/' && (i === 0 || /\s/.test(texto[i - 1]))) {
      const fin = texto.indexOf('\n', i + 2);
      i = fin < 0 ? n : fin;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function hashJs(texto: string): string {
  return hashBase(colapsar(sinComentarios(texto, true)));
}

export function hashCss(texto: string): string {
  return hashBase(colapsar(sinComentarios(texto, false)));
}

export function hashHtml(texto: string): string {
  return hashBase(colapsar(texto.replace(/<!--[\s\S]*?-->/g, ' ')));
}

/** Hash de un archivo por su ruta: la ruta entra al hash (dos archivos iguales no comparten
 *  `?v=`) y la extensión elige el especializado. */
export function hashPorRuta(ruta: string, texto: string): string {
  const huella = /\.(?:m?js|ts)$/i.test(ruta) ? hashJs : /\.css$/i.test(ruta) ? hashCss : /\.html?$/i.test(ruta) ? hashHtml : hashBase;
  return hashBase(`${ruta}\n${huella(texto)}`);
}

/** Archivos distintos con el mismo hash. Los alias publicados del mismo archivo (mismo nombre,
 *  p. ej. `loader.min.js` y `core/loader.min.js`) no cuentan. */
export function hashesRepetidos(files: Record<string, string>): string[] {
  const porHash = new Map<string, string[]>();
  for (const [ruta, hash] of Object.entries(files)) porHash.set(hash, [...(porHash.get(hash) ?? []), ruta]);
  return [...porHash]
    .filter(([, rutas]) => new Set(rutas.map((r) => r.split('/').pop())).size > 1)
    .map(([hash, rutas]) => `${hash}: ${rutas.join(', ')}`);
}

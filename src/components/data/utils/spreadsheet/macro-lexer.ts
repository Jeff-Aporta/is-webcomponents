// @contexto INDICE.md · src/components/data/README.md
// lexer.ts — tokens del lenguaje de macros. Palabras clave en español con alias en inglés.

/** Error del lenguaje, con su línea. */
import type { MacroTokenType, MacroToken } from './macro-lexer.schemas.ts';

export class MacroError extends Error {
  constructor(message: string, readonly line: number) {
    super(`Línea ${line}: ${message}`);
  }
}

/** Palabra clave → forma canónica. */
const KEYWORDS: Record<string, string> = {
  sea: 'let', let: 'let', si: 'if', if: 'if', sino: 'else', else: 'else', mientras: 'while', while: 'while',
  para: 'for', for: 'for', en: 'in', in: 'in', paso: 'step', step: 'step', funcion: 'function', 'función': 'function', function: 'function',
  retorna: 'return', return: 'return', corta: 'break', break: 'break', sigue: 'continue', continue: 'continue',
  y: 'and', and: 'and', o: 'or', or: 'or', no: 'not', not: 'not',
  verdadero: 'true', true: 'true', falso: 'false', false: 'false', nulo: 'null', null: 'null',
};

const OPS3 = ['...'];
const OPS2 = ['==', '!=', '<=', '>=', '..', '+=', '-='];
const OPS1 = '+-*/%^&<>=()[]{},:.;';

/** Tokeniza un programa. */
export function lexMacro(src: string): MacroToken[] {
  const out: MacroToken[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const push = (type: MacroTokenType, text: string, at = i): void => { out.push({ type, text, line, col: at - lineStart + 1 }); };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') {
      push('nl', '\n');
      i++;
      line++;
      lineStart = i;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
    if (ch === '#' || (ch === '/' && src[i + 1] === '/')) {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (/\d/.test(ch)) {
      const start = i;
      while (/\d/.test(src[i] ?? '')) i++;
      if (src[i] === '.' && /\d/.test(src[i + 1] ?? '')) {
        i++;
        while (/\d/.test(src[i] ?? '')) i++;
      }
      push('num', src.slice(start, i), start);
      continue;
    }
    if (ch === '"' || ch === "'") {
      const start = i;
      let s = '';
      i++;
      while (i < src.length && src[i] !== ch) {
        if (src[i] === '\n') throw new MacroError('Texto sin cerrar', line);
        if (src[i] === '\\') {
          const e = src[i + 1];
          s += e === 'n' ? '\n' : e === 't' ? '\t' : e ?? '';
          i += 2;
          continue;
        }
        s += src[i++];
      }
      if (i >= src.length) throw new MacroError('Texto sin cerrar', line);
      i++;
      push('str', s, start);
      continue;
    }
    if (/[\p{L}_]/u.test(ch)) {
      const start = i;
      while (/[\p{L}\p{N}_]/u.test(src[i] ?? '')) i++;
      const word = src.slice(start, i);
      const kw = Object.hasOwn(KEYWORDS, word.toLowerCase()) ? KEYWORDS[word.toLowerCase()] : null;
      if (kw) push('kw', kw, start);
      else push('id', word, start);
      continue;
    }
    const three = src.slice(i, i + 3);
    if (OPS3.includes(three)) { push('op', three); i += 3; continue; }
    const two = src.slice(i, i + 2);
    if (OPS2.includes(two)) { push('op', two); i += 2; continue; }
    if (OPS1.includes(ch)) {
      push(ch === ';' ? 'nl' : 'op', ch);
      i++;
      continue;
    }
    throw new MacroError(`Carácter inesperado «${ch}»`, line);
  }
  push('eof', '');
  return out;
}

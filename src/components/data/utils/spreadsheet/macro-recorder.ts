// @contexto INDICE.md · src/components/data/README.md
// recorder.ts — grabadora: convierte acciones del usuario en líneas del lenguaje de macros.


/** Literal de macro. */
import type { RecordArg } from './macro-recorder.schemas.ts';

function literal(v: RecordArg): string {
  if (v === null) return 'nulo';
  if (typeof v === 'boolean') return v ? 'verdadero' : 'falso';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  return `{${Object.entries(v).map(([k, x]) => `${/^[\p{L}_][\p{L}\p{N}_]*$/u.test(k) ? k : JSON.stringify(k)}: ${literal(x)}`).join(', ')}}`;
}

/** Grabadora de acciones. */
export class MacroRecorder {
  #lines: string[] = [];
  #on = false;

  get recording(): boolean { return this.#on; }

  start(): void {
    this.#lines = [];
    this.#on = true;
  }

  /** Termina y devuelve el programa. */
  stop(): string {
    this.#on = false;
    return this.#lines.join('\n');
  }

  /** Anota una llamada. Dos selecciones seguidas se funden en la última. */
  record(fn: string, ...args: RecordArg[]): void {
    if (!this.#on) return;
    const line = `${fn}(${args.map(literal).join(', ')})`;
    const last = this.#lines[this.#lines.length - 1];
    if (fn === 'seleccionar' && last?.startsWith('seleccionar(')) this.#lines[this.#lines.length - 1] = line;
    else this.#lines.push(line);
  }
}

/**
 * ag-grid/filas/expansion — Quien esta abierto, sin sembrar el motor grupo a grupo.
 *
 * El motor solo guarda un Set de abiertos; `groupDefaultExpanded: 2` o
 * `isGroupOpenByDefault` exigirian conocer todos los grupos de antemano. Aqui el
 * valor por defecto se evalua perezoso y solo se recuerda lo que el usuario toco.
 * `sincronizar` traduce a esto lo que la capa de render hace por `toggleGroup`,
 * `expandAllGroups` y `collapseAllGroups` del motor.
 */
import type { NodoArbol } from './filas.schemas.js';

export class ExpansionGrupos {
  #forzados = new Map<string, boolean>();
  #todos: boolean | null = null;
  #porDefecto: (g: NodoArbol) => boolean;
  #vistos = new Map<string, boolean>();
  #previo: ReadonlySet<string> | null = null;

  constructor(porDefecto: (g: NodoArbol) => boolean) {
    this.#porDefecto = porDefecto;
  }

  abierto = (g: NodoArbol): boolean => {
    const r = this.#forzados.get(g.id) ?? this.#todos ?? this.#porDefecto(g);
    this.#vistos.set(g.id, r);
    return r;
  };

  abiertoPorId(id: string): boolean {
    return this.#forzados.get(id) ?? this.#vistos.get(id) ?? this.#todos ?? false;
  }

  fijar(id: string, abierto: boolean): void {
    this.#forzados.set(id, abierto);
  }

  expandirTodo(): void {
    this.#forzados.clear();
    this.#todos = true;
  }

  contraerTodo(): void {
    this.#forzados.clear();
    this.#todos = false;
  }

  reiniciar(): void {
    this.#forzados.clear();
    this.#todos = null;
  }

  /** ids abiertos conocidos, para getState. */
  abiertos(): string[] {
    return this.#listar(true);
  }

  cerrados(): string[] {
    return this.#listar(false);
  }

  #listar(buscado: boolean): string[] {
    const out = new Set<string>();
    for (const [id, v] of this.#vistos) if (this.#forzados.get(id) === undefined && v === buscado) out.add(id);
    for (const [id, v] of this.#forzados) if (v === buscado) out.add(id);
    return [...out];
  }

  restaurar(abiertos: readonly string[], cerrados: readonly string[] = []): void {
    this.#forzados.clear();
    for (const id of abiertos) this.#forzados.set(id, true);
    for (const id of cerrados) this.#forzados.set(id, false);
  }

  /** Solo actualiza la referencia: para cuando el cambio del motor ya esta aplicado aqui. */
  alinear(conjunto: ReadonlySet<string>): void {
    this.#previo = conjunto;
  }

  /**
   * Compara por contenido: el conjunto llega reconstruido desde `serializeState`.
   * Devuelve los ids de un toggle, o null si fue masivo o no hubo cambio.
   */
  sincronizar(conjunto: ReadonlySet<string>): string[] | null {
    const previo = this.#previo;
    this.#previo = conjunto;
    if (previo === null) return null;
    const cambios: string[] = [];
    for (const id of conjunto) if (!previo.has(id)) cambios.push(id);
    for (const id of previo) if (!conjunto.has(id)) cambios.push(id);
    if (!cambios.length) return null;
    if (cambios.length === 1) {
      const id = cambios[0] as string;
      this.fijar(id, !this.abiertoPorId(id));
      return cambios;
    }
    if (conjunto.size) this.expandirTodo();
    else this.contraerTodo();
    return null;
  }
}

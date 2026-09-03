// toons.ts: definiciones de sistema "toon" — textos/labels de tests por
// componente y config de testers, SIEMPRE en JSON (dev-only). Cargador tipado.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Texto/label de test con variantes (sin acentos vs con acentos). */
export interface ToonTexto {
  /** Forma canónica (normalizada NFC, con acentos). */
  texto: string;
  /** Variantes tolerantes (p. ej. sin acentos) para asserts por árbol. */
  variantes?: string[];
}

/** Definición de controles esperados de un componente en su preview. */
export interface ToonControl {
  /** Tipo de control (text|color|number|select|boolean|range|json). */
  control: string;
  /** Propiedad del componente que se manipula (o atributo con `attr.`). */
  prop: string;
  /** Etiqueta humana del control. */
  label: string;
}

/** Documento toon de un componente. */
export interface ToonDoc {
  $schema: 'toon/v1';
  tag: string;
  /** Textos que los tests deben escribir/verificar. */
  textos?: Record<string, ToonTexto>;
  /** Configuración de tester (p. ej. tiempo de asentamiento por vista). */
  config?: Record<string, string | number | boolean>;
  /** Controles declarados en el preview (espejo para los e2e data-driven). */
  controles?: ToonControl[];
}

const aqui = dirname(fileURLToPath(import.meta.url));

/**
 * Carga el toon de un tag (src/utils/system/toons/<tag>.toon.json).
 * Dev-only: los tests (unit/e2e/attack) consumen aquí sus strings; nunca se
 * empaqueta a dist.
 * @param {string} tag
 */
export function cargarToon(tag: string): ToonDoc {
  const archivo = join(aqui, 'toons', `${tag}.toon.json`);
  const raw = readFileSync(archivo, 'utf8');
  const doc = JSON.parse(raw) as ToonDoc;
  if (doc.$schema !== 'toon/v1') throw new Error(`toon ${tag}: $schema debe ser toon/v1`);
  if (!doc.tag) throw new Error(`toon ${tag}: falta tag`);
  return doc;
}

/** Texto canónico de un toon con su primera variante si existe. */
export function textoDe(toon: ToonDoc, clave: string): string {
  const t = toon.textos?.[clave];
  return t?.texto ?? '';
}

/** Todas las variantes aceptadas (canónica + variantes) de un texto toon. */
export function variantesDe(toon: ToonDoc, clave: string): string[] {
  const t = toon.textos?.[clave];
  if (!t) return [];
  return [t.texto, ...(t.variantes ?? [])];
}

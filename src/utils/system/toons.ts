// toons.ts: definiciones de sistema "toon" — textos/labels de tests por
// componente y config de testers, SIEMPRE en JSON (dev-only). Cargador tipado.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToonTexto, ToonControl, ToonDoc } from "./toons.schemas.js";

/** Texto/label de test con variantes (sin acentos vs con acentos). */

/** Definición de controles esperados de un componente en su preview. */

/** Documento toon de un componente. */

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

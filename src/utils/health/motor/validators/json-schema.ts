/**
 * Validador de esquema is-preview/v1 (definición de demos).
 *
 * El motor auditor exige que TODA preview de componente sea declarativa
 * (JSON con $schema: is-preview/v1). Esta clase implementa un validador
 * mínimo viable: define el esquema completo de la spec, verifica tipos,
 * enumera campos faltantes y reporta hallazgos categorizados.
 *
 * Diseño:
 *   - Sin dependencias externas: las pruebas deben correr offline (sin npm
 *     install), así que el validador es puro TypeScript.
 *   - Cada campo desconocido o de tipo incorrecto emite UN hallazgo
 *     específico con la ruta JSON (sección/bloque/índice).
 *   - Cobertura total del esquema: si se agrega un campo a is-preview/v1,
 *     hay que agregarlo aquí también. La función `esquemaEsVersionV1()`
 *     detecta specs más nuevas y avisa.
 */

import type { Hallazgo } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Definición estructural del esquema is-preview/v1 (single source of truth).
// ─────────────────────────────────────────────────────────────────────────────

/** Tipos de bloque soportados por is-preview/v1. */
const KIND_BLOQUE = new Set([
  'lede', 'demo', 'callout', 'code', 'html', 'table',
]);

/** Contenedores de sección permitidos (defensa contra XSS / inyección). */
const SECCION_AS = new Set(['section', 'aside']);

/** Controles válidos según controls.schema.json. */
const CONTROL_TIPOS = new Set([
  'text', 'color', 'number', 'select', 'boolean', 'range', 'json',
]);

/** Props de un control declaradas en controls.schema.json. */
const CONTROL_PROPS = new Set([
  'control', 'prop', 'label', 'group', 'default',
  'options', 'min', 'max', 'step', 'placeholder', 'esquema',
]);

/** Props de un bloque declaradas en is-preview/v1. */
const BLOQUE_PROPS = new Set([
  'kind', 'html', 'code', 'lang', 'heading', 'contain', 'noCode',
  'columns', 'rows', 'className', 'captionHtml',
  'controls', 'target', 'group', 'equivNote', 'equivHtml', 'equivFlow',
  'titleHtml',
]);

/** Props de una sección. */
const SECCION_PROPS = new Set([
  'id', 'title', 'titleHtml', 'lede',
  'blocks', 'className', 'hideTitle',
  'as', 'ariaLabel', 'ariaLabelledby',
]);

/** Props del nivel raíz de la definición. */
const RAIZ_PROPS = new Set([
  '$schema', 'tag', 'category', 'title', 'titleHtml', 'description',
  'styles', 'storageKey', 'mainClass', 'wrapperClass', 'prelude',
  'hasBehavior', 'withoutToc', 'sections',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Implementación.
// ─────────────────────────────────────────────────────────────────────────────

/** @returns true si el objeto parece cumplir is-preview/v1 a alto nivel. */
export function pareceIsPreviewV1(def: unknown): def is { tag: string; sections: unknown[] } {
  if (!def || typeof def !== 'object') return false;
  const o = def as Record<string, unknown>;
  return typeof o.tag === 'string' && Array.isArray(o.sections);
}

/** @returns nombre legible del campo (útil para mensajes). */
function nombreCampo(ruta: (string | number)[]): string {
  return ruta
    .map((p, i) => (typeof p === 'number' ? `[${p}]` : i === 0 ? p : `.${p}`))
    .join('');
}

/**
 * Recorre el árbol y emite hallazgos por cada desvío del esquema.
 * @param def definición a validar
 * @returns hallazgos (vacío si cumple).
 */
export function validarEsquema(def: unknown): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  if (!def || typeof def !== 'object') {
    hallazgos.push({
      categoria: 'json-schema',
      severidad: 'fatal',
      tag: null,
      mensaje: 'Definición inválida: no es un objeto.',
    });
    return hallazgos;
  }
  const o = def as Record<string, unknown>;
  const ruta = (def as { tag?: unknown }).tag ?? '<sin-tag>';

  // 1. $schema
  if (!o.$schema) {
    hallazgos.push({
      categoria: 'json-schema',
      severidad: 'warn',
      tag: String(ruta),
      mensaje: 'Falta `$schema: "is-preview/v1"` en la raíz del JSON.',
      sugerencia: 'Agregá `"$schema": "is-preview/v1"` al inicio del archivo.',
    });
  } else if (o.$schema !== 'is-preview/v1') {
    hallazgos.push({
      categoria: 'json-schema',
      severidad: 'error',
      tag: String(ruta),
      mensaje: `$schema desconocido: "${o.$schema}". El motor solo audita is-preview/v1.`,
    });
  }

  // 2. tag (obligatorio)
  if (typeof o.tag !== 'string' || !o.tag) {
    hallazgos.push({
      categoria: 'json-schema',
      severidad: 'fatal',
      tag: String(ruta),
      mensaje: 'Falta `tag` en la raíz (string obligatorio).',
    });
  }

  // 3. sections
  if (!Array.isArray(o.sections)) {
    hallazgos.push({
      categoria: 'json-schema',
      severidad: 'fatal',
      tag: String(ruta),
      mensaje: 'Falta `sections[]` en la raíz (array obligatorio).',
    });
    return hallazgos;
  }

  // 4. Campos raíz desconocidos.
  for (const k of Object.keys(o)) {
    if (!RAIZ_PROPS.has(k)) {
      hallazgos.push({
        categoria: 'json-schema',
        severidad: 'warn',
        tag: String(ruta),
        mensaje: `Campo raíz no documentado: "${k}".`,
        detalle: { clave: k },
        sugerencia: 'Si es un campo válido de is-preview/v1, agregalo a RAIZ_PROPS en motor/validators/json-schema.ts.',
      });
    }
  }

  // 5. Validar cada sección.
  o.sections.forEach((sec, i) => {
    hallazgos.push(...validarSeccion(sec, i, String(ruta)));
  });

  return hallazgos;
}

function validarSeccion(sec: unknown, idx: number, tag: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const ruta = (n: string | number) => `sections[${idx}]${typeof n === 'number' ? `[${n}]` : n ? `.${n}` : ''}`;
  if (!sec || typeof sec !== 'object') {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `Sección inválida en sections[${idx}]: no es objeto.`,
    });
    return hallazgos;
  }
  const s = sec as Record<string, unknown>;

  if (typeof s.id !== 'string' || !s.id) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta('id')}: falta o no es string (obligatorio para el TOC).`,
    });
  }
  if (typeof s.title !== 'string') {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta('title')}: falta o no es string.`,
    });
  }
  if (s.as !== undefined && (typeof s.as !== 'string' || !SECCION_AS.has(s.as))) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'warn', tag,
      mensaje: `${ruta('as')}: "${s.as}" no es contenedor válido (${[...SECCION_AS].join('|')}).`,
    });
  }
  if (!Array.isArray(s.blocks)) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'fatal', tag,
      mensaje: `${ruta('blocks')}: falta o no es array (obligatorio).`,
    });
    return hallazgos;
  }

  for (const k of Object.keys(s)) {
    if (!SECCION_PROPS.has(k)) {
      hallazgos.push({
        categoria: 'json-schema', severidad: 'warn', tag,
        mensaje: `${ruta(k)}: campo de sección no documentado.`,
        detalle: { clave: k },
      });
    }
  }

  s.blocks.forEach((bloque, bi) => {
    hallazgos.push(...validarBloque(bloque, idx, bi, tag));
  });

  return hallazgos;
}

function validarBloque(bloque: unknown, secIdx: number, bIdx: number, tag: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const base = `sections[${secIdx}].blocks[${bIdx}]`;
  if (!bloque || typeof bloque !== 'object') {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${base}: bloque inválido (no es objeto).`,
    });
    return hallazgos;
  }
  const b = bloque as Record<string, unknown>;

  if (typeof b.kind !== 'string' || !KIND_BLOQUE.has(b.kind)) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${base}.kind: "${b.kind}" no es un kind válido (${[...KIND_BLOQUE].join('|')}).`,
    });
  }

  for (const k of Object.keys(b)) {
    if (!BLOQUE_PROPS.has(k)) {
      hallazgos.push({
        categoria: 'json-schema', severidad: 'warn', tag,
        mensaje: `${base}.${k}: campo de bloque no documentado.`,
        detalle: { clave: k },
      });
    }
  }

  // Validaciones específicas por kind.
  switch (b.kind) {
    case 'demo':
      if (typeof b.html !== 'string' || !b.html.trim()) {
        hallazgos.push({
          categoria: 'json-schema', severidad: 'error', tag,
          mensaje: `${base}.html: bloque demo sin html.`,
        });
      }
      break;
    case 'code':
      if (typeof b.code !== 'string' || !b.code) {
        hallazgos.push({
          categoria: 'json-schema', severidad: 'error', tag,
          mensaje: `${base}.code: bloque code sin texto.`,
        });
      }
      break;
    case 'lede':
    case 'callout':
    case 'html':
      if (typeof b.html !== 'string') {
        hallazgos.push({
          categoria: 'json-schema', severidad: 'error', tag,
          mensaje: `${base}.html: bloque ${b.kind} sin html string.`,
        });
      }
      break;
    case 'table':
      if (!Array.isArray(b.columns)) {
        hallazgos.push({
          categoria: 'json-schema', severidad: 'error', tag,
          mensaje: `${base}.columns: bloque table sin columnas (array).`,
        });
      }
      if (!Array.isArray(b.rows)) {
        hallazgos.push({
          categoria: 'json-schema', severidad: 'error', tag,
          mensaje: `${base}.rows: bloque table sin filas (array de arrays).`,
        });
      }
      break;
  }

  // Controles: validar cada uno si está presente.
  if (Array.isArray(b.controls)) {
    (b.controls as unknown[]).forEach((ctrl, ci) => {
      hallazgos.push(...validarControl(ctrl, `${base}.controls[${ci}]`, tag));
    });
  } else if (b.controls !== undefined) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${base}.controls: debe ser array.`,
    });
  }

  return hallazgos;
}

function validarControl(ctrl: unknown, ruta: string, tag: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  if (!ctrl || typeof ctrl !== 'object') {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta}: control inválido.`,
    });
    return hallazgos;
  }
  const c = ctrl as Record<string, unknown>;
  if (typeof c.control !== 'string' || !CONTROL_TIPOS.has(c.control)) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta}.control: "${c.control}" no es tipo válido (${[...CONTROL_TIPOS].join('|')}).`,
    });
  }
  if (typeof c.prop !== 'string' || !c.prop) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta}.prop: falta o vacío.`,
    });
  }
  if (typeof c.label !== 'string' || !c.label) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta}.label: falta o vacío.`,
    });
  }
  // options: solo para select
  if (c.control === 'select' && !Array.isArray(c.options)) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'error', tag,
      mensaje: `${ruta}.options: control=select requiere array de opciones.`,
    });
  }
  for (const k of Object.keys(c)) {
    if (!CONTROL_PROPS.has(k)) {
      hallazgos.push({
        categoria: 'json-schema', severidad: 'warn', tag,
        mensaje: `${ruta}.${k}: propiedad de control no documentada.`,
        detalle: { clave: k },
      });
    }
  }
  return hallazgos;
}

/**
 * Helper: lista los nombres de campos desconocidos en una raíz.
 * Útil para que otras pruebas detecten extensiones no soportadas.
 */
export function camposDesconocidos(def: Record<string, unknown>): string[] {
  return Object.keys(def).filter((k) => !RAIZ_PROPS.has(k));
}

/** Helper usado en mensajes: nombre legible del campo (compat). */
export { nombreCampo };
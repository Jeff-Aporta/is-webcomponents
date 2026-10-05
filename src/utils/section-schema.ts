/**
 * src/utils/section-schema.ts — Zod validator para el JSON de fichas (J2).
 *
 * Toda ficha de componente (`.md` o JSON equivalente que alimenta al
 * generador de páginas `/docs/<tag>.html`) debe tener 9 secciones estándar:
 *
 *   anatomia, atributos, props, states, eventos, slots, parts, apiJs, ejemplos
 *
 * Anatomía y Ejemplos son bloques `content` (markdown libre). Las otras 7
 * son tablas estructuradas (`table: { ... }[]`). Si una sección no aplica al
 * componente, debe declararse en `exclude` para que el validador no warnée.
 *
 * Este archivo es **design**: el schema está definido, pero la llamada
 * runtime `FichaSchema.safeParse(...)` y el `warn` se cablean en una fase
 * posterior (Phase J3). Mientras tanto, sólo se garantiza que la spec
 * compila y tipa correctamente con `z.infer<typeof X>`.
 *
 * Convenciones heredadas del repo:
 *   - naming `XSchema` + `type X = z.infer<typeof XSchema>` (Q12 / §9.4 audit).
 *   - `z.passthrough()` para forward-compat: si el .md tiene columnas extra
 *     (ej. `deprecated`, `since`), el validador las preserva sin error.
 *   - zod v4.4.3 (ver `deno.json` imports).
 */
import { z } from "zod";
import type { SectionId, ContentBlock, SectionTableRow, SectionTable, AtributosRow, PropRow, StateRow, EventoRow, SlotRow, PartRow, ApiJsRow, Example, Examples, SectionsMap, ExcludeList, FichaWarning, FichaInspection, Ficha } from "./section-schema.schemas.js";

/* --------------------------------------------------------------------------
 * IDs y constantes
 * ------------------------------------------------------------------------*/

/** Las 9 secciones estándar, en el orden estricto del estándar del usuario. */
export const SECTION_IDS = [
  "anatomia",
  "atributos",
  "props",
  "states",
  "eventos",
  "slots",
  "parts",
  "apiJs",
  "ejemplos",
] as const;

/** Tipo string-literal de los IDs de sección. */

/* --------------------------------------------------------------------------
 * Schemas base (filas de tabla)
 * ------------------------------------------------------------------------*/

/**
 * Anatomía y Ejemplos: bloque de markdown libre. El validador no interpreta
 * el contenido, sólo garantiza que sea string no vacío.
 */
export const ContentBlockSchema = z.object({
  content: z.string().min(1, "el bloque de markdown no puede estar vacío"),
});

/**
 * Fila genérica de tabla (atributos / props / states / eventos / slots /
 * parts / apiJs). Se usa `passthrough()` para que columnas extra definidas
 * en el .md (ej. `deprecated`, `since`, `notes`) sobrevivan al parseo.
 */
export const SectionTableRowSchema = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    default: z.string().optional(),
    desc: z.string().optional(),
    state: z.string().optional(),
    selector: z.string().optional(),
    cuando: z.string().optional(),
    evento: z.string().optional(),
    detalle: z.string().optional(),
    slot: z.string().optional(),
    descripcion: z.string().optional(),
    part: z.string().optional(),
    metodo: z.string().optional(),
  })
  .passthrough();

/** Tabla con shape `{ table: SectionTableRow[] }`. */
export const SectionTableSchema = z.object({
  table: z.array(SectionTableRowSchema).min(0),
});

/* --------------------------------------------------------------------------
 * Schemas por sección (refinan el bloque genérico con required concretos)
 * ------------------------------------------------------------------------*/

/** Anatomía: `content` markdown. */
export const AnatomiaSectionSchema = ContentBlockSchema;

/** Atributos: filas `{ name, type?, desc? }`. */
export const AtributosSectionSchema = z.object({
  table: z.array(
    z
      .object({
        name: z.string().min(1, "atributo sin nombre"),
        type: z.string().optional(),
        desc: z.string().optional(),
      })
      .passthrough()
  ),
});

/** Props: filas `{ name, type, default?, desc? }`. */
export const PropsSectionSchema = z.object({
  table: z.array(
    z
      .object({
        name: z.string().min(1, "prop sin nombre"),
        type: z.string().min(1, "prop sin tipo"),
        default: z.string().optional(),
        desc: z.string().optional(),
      })
      .passthrough()
  ),
});

/** Custom states: filas `{ state, selector?, cuando }`. */
export const StatesSectionSchema = z.object({
  table: z.array(
    z
      .object({
        state: z.string().min(1, "state sin nombre"),
        selector: z.string().optional(),
        cuando: z.string().min(1, "state sin descripción de cuándo se aplica"),
      })
      .passthrough()
  ),
});

/** Eventos: filas `{ evento, detalle?, cuando }`. */
export const EventosSectionSchema = z.object({
  table: z.array(
    z
      .object({
        evento: z.string().min(1, "evento sin nombre"),
        detalle: z.string().optional(),
        cuando: z.string().min(1, "evento sin descripción de cuándo se emite"),
      })
      .passthrough()
  ),
});

/** Slots: filas `{ slot, descripcion? }`. */
export const SlotsSectionSchema = z.object({
  table: z.array(
    z
      .object({
        slot: z.string().min(1, "slot sin nombre"),
        descripcion: z.string().optional(),
      })
      .passthrough()
  ),
});

/** CSS parts: filas `{ part, descripcion? }`. */
export const PartsSectionSchema = z.object({
  table: z.array(
    z
      .object({
        part: z.string().min(1, "part sin nombre"),
        descripcion: z.string().optional(),
      })
      .passthrough()
  ),
});

/** API JS: filas `{ metodo, descripcion?, ejemplo? }`. */
export const ApiJsSectionSchema = z.object({
  table: z.array(
    z
      .object({
        metodo: z.string().min(1, "método sin nombre"),
        descripcion: z.string().optional(),
        desc: z.string().optional(),
        /** Snippet HTML/JS copiable (celda Ejemplo → iswc-code en disclosure). */
        ejemplo: z.union([
          z.string(),
          z.object({
            kind: z.literal("code-ejemplo"),
            code: z.string(),
            lang: z.string().optional(),
            summary: z.string().optional(),
          }),
        ]).optional(),
        ejemploLang: z.string().optional(),
        ejemploSummary: z.string().optional(),
      })
      .passthrough()
  ),
});

/** Ejemplos: `content` markdown. */
export const EjemplosSectionSchema = ContentBlockSchema;

/* --------------------------------------------------------------------------
 * Examples (Phase W21)
 *
 * Tipado del campo `examples` en el root del JSON de demos (iswc-preview/v1)
 * que alimenta a `<iswc-examples-carousel>`. Cada `Example` describe un
 * preset: nombre identificador, categoría opcional (para filtro por tabs),
 * mapa de props/atributos a aplicar al target, slots HTML opcionales y
 * descripción accesible.
 *
 * `props` admite string | number | boolean porque así lo entiende el
 * resolvedor de propiedades del carousel (`#writeProp`), que distingue
 * booleanos (setAttribute / removeAttribute) de strings/numbers (setAttribute
 * toString). El union con `z.literal(true)` evita `boolean | string | number`
 * sea demasiado permisivo con tipos arbitrarios.
 *
 * Ejemplo:
 *   {
 *     "examples": [
 *       { "name": "Primario",   "category": "Estados", "props": { "color": "brand" } },
 *       { "name": "Secundario", "category": "Estados", "props": { "color": "neutral" } },
 *       { "name": "Peligro",    "category": "Alertas", "props": { "color": "danger" } }
 *     ]
 *   }
 * ------------------------------------------------------------------------*/

export const ExampleSchema = z.object({
  /** Nombre visible del preset (identificador único dentro del array). */
  name: z.string().min(1, "example sin nombre"),
  /** Categoría opcional. Se usa para el filtro por tabs del carrusel. */
  category: z.string().optional(),
  /**
   * Mapa de props/atributos a aplicar al host target del carrusel.
   * Solo admite tipos primitivos serializables: string | number | boolean.
   */
  props: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  /**
   * Mapa slotName → HTML del slot a proyectar en el host target.
   * El HTML se inyecta tal cual (defensa contra XSS es responsabilidad
   * del autor del JSON, no del schema).
   */
  slots: z.record(z.string(), z.string()).optional(),
  /** Descripción accesible del preset (atributo `title` de la card). */
  description: z.string().optional(),
});

/** Array de examples para alimentar a `<iswc-examples-carousel>`. */
export const ExamplesSchema = z.array(ExampleSchema);

/* --------------------------------------------------------------------------
 * Sections map: el bloque `sections` del JSON
 * ------------------------------------------------------------------------*/

/**
 * Mapa de las 9 secciones. Cada clave es opcional individualmente: una
 * sección ausente se considera "no presente" y se valida contra `exclude`
 * en el `.refine()` final.
 */
export const SectionsMapSchema = z.object({
  anatomia: AnatomiaSectionSchema.optional(),
  atributos: AtributosSectionSchema.optional(),
  props: PropsSectionSchema.optional(),
  states: StatesSectionSchema.optional(),
  eventos: EventosSectionSchema.optional(),
  slots: SlotsSectionSchema.optional(),
  parts: PartsSectionSchema.optional(),
  apiJs: ApiJsSectionSchema.optional(),
  ejemplos: EjemplosSectionSchema.optional(),
});

/* --------------------------------------------------------------------------
 * Exclude list
 * ------------------------------------------------------------------------*/

/** Lista de secciones que NO aplican al componente. */
export const ExcludeListSchema = z
  .array(z.enum(SECTION_IDS))
  .default([])
  .refine(
    (arr) => new Set(arr).size === arr.length,
    "exclude tiene entradas duplicadas",
  );

/* --------------------------------------------------------------------------
 * Resultado del refine (para que el caller pueda warnear sin re-parsear)
 * ------------------------------------------------------------------------*/

/** Warning que el validador adjunta a una ficha incompleta. */

/** Estructura auxiliar devuelta por `inspectFicha(...)` (no por `.parse()`). */

/* --------------------------------------------------------------------------
 * FichaSchema (raíz) + helpers
 * ------------------------------------------------------------------------*/

/**
 * Schema raíz de una ficha. **NO** falla si falta una sección obligatoria
 * (eso es un warn, no un error): la validación es laxa. El `.refine()`
 * sólo detecta errores de forma (intersección `sections` ∩ `exclude` no
 * vacía, IDs desconocidos en `exclude`, etc.). Los warnings de "sección
 * obligatoria ausente" los emite `inspectFicha(...)` aparte, para que el
 * caller decida si loguea, falla o ignora.
 */
export const FichaSchema = z
  .object({
    sections: SectionsMapSchema,
    exclude: ExcludeListSchema,
  })
  .refine(
    (ficha) => {
      const excl = new Set(ficha.exclude);
      // Una sección no puede estar a la vez presente y excluida.
      for (const id of SECTION_IDS) {
        if (excl.has(id) && ficha.sections[id] !== undefined) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "una sección aparece en `sections` y en `exclude` (decide una: presente o excluida)",
      path: ["sections"],
    },
  );

/**
 * Inspecciona una ficha parseada y devuelve warnings. Esta función es la
 * que el generador de páginas llamaría en runtime (Phase J3) para
 * registrar `console.warn` cuando una sección obligatoria falte.
 *
 * **No** lanza: una ficha siempre "parsea" si cumple `FichaSchema`. Los
 * warnings son no-bloqueantes.
 */
export function inspectFicha(ficha: Ficha): FichaInspection {
  const excl = new Set(ficha.exclude);
  const out: FichaInspection = {
    missing: [],
    spuriousExclude: [],
    unknownExclude: [],
  };

  // 1. Sección obligatoria ausente (no está en `sections` ni en `exclude`).
  for (const id of SECTION_IDS) {
    if (ficha.sections[id] === undefined && !excl.has(id)) {
      out.missing.push({
        level: "warn",
        section: id,
        message: `sección obligatoria "${id}" ausente (añádela a \`sections\` o a \`exclude\` si no aplica)`,
      });
    }
  }

  // 2. Sección en `exclude` pero presente en `sections` (el .refine ya
  //    rechaza esto, pero lo dejamos visible para el caller).
  for (const id of ficha.exclude) {
    if (ficha.sections[id] !== undefined) {
      out.spuriousExclude.push({
        level: "warn",
        section: id,
        message: `"${id}" está en \`exclude\` pero también en \`sections\``,
      });
    }
  }

  return out;
}

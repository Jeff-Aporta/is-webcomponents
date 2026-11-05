/**
 * semantic-search.schemas.ts — props de `<iswc-semantic-search>`.
 */
import { z } from "zod";

/** Comando de la paleta: la forma de `iswc-command-palette`. Campos extra del consumidor se conservan. */
const SemanticComandoSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  group: z.string().optional(),
  icon: z.string().optional(),
  hint: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});
export type SemanticComando = z.infer<typeof SemanticComandoSchema>;

/** Reordena (o filtra) por significado los comandos para la consulta. */
type SemanticRanker = (consulta: string, comandos: SemanticComando[]) => SemanticComando[] | Promise<SemanticComando[]>;
/** Trae resultados que no son comandos (registros encontrados por embeddings en el servidor del consumidor). */
type SemanticBuscar = (consulta: string) => Promise<SemanticComando[]>;

export const SemanticSearchPropsSchema = z.object({
  comandos: z.array(SemanticComandoSchema),
  ranker: z.custom<SemanticRanker>((v) => v === null || typeof v === "function").nullable(),
  buscar: z.custom<SemanticBuscar>((v) => v === null || typeof v === "function").nullable(),
  /** Texto del botón. */
  boton: z.string(),
  /** `aria-label` del botón. */
  etiqueta: z.string(),
  /** Atajo que se muestra en el botón. Vacío lo oculta. */
  atajo: z.string(),
  /** Combinación que abre la paleta (`iswc-command-palette`). Vacío la desactiva. */
  hotkey: z.string(),
  placeholder: z.string(),
  vacio: z.string(),
  maxResultados: z.number().int().positive(),
});
export type SemanticSearchProps = z.infer<typeof SemanticSearchPropsSchema>;

/** Lo que este componente usa de `iswc-command-palette`. */
export type SemanticPaletaEl = HTMLElement & { open(): void; close(): void; ranker?: (q: string, comandos: SemanticComando[]) => Promise<SemanticComando[]> };

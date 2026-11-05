/**
 * ai.schemas.ts — contratos de la IA en el navegador: catálogo de herramientas, salida de un motor, búsqueda aplanada y
 * orden. Los módulos de `src/ai/` solo importan tipos de aquí; lo que valida en ejecución es de quien recibe datos de fuera.
 */
import { z } from 'zod';
import type { ProgressInfo } from 'runonweb/core';

/** Lo que cada componente recibe de una herramienta. */
const CajaSchema = z.object({ etiqueta: z.string(), puntaje: z.number(), xmin: z.number(), ymin: z.number(), xmax: z.number(), ymax: z.number() });
export type Caja = z.infer<typeof CajaSchema>;
const BarraSchema = z.object({ etiqueta: z.string(), valor: z.number() });
type Barra = z.infer<typeof BarraSchema>;
export type Salida = { texto?: string; imagen?: Blob; audio?: Blob; cajas?: Caja[]; barras?: Barra[] };
export type Entrada = Blob | string;
export type Opciones = Record<string, string>;

/** `carga`: cambia el modelo, así que crea otro motor. `pesos`: su descarga según el valor. Sin `valores` es un campo de texto. */
const OpcionSchema = z.object({
  id: z.string(),
  rotulo: z.string(),
  defecto: z.string(),
  valores: z.record(z.string(), z.string()).optional(),
  carga: z.boolean().optional(),
  pesos: z.record(z.string(), z.number()).optional(),
});
export type Opcion = z.infer<typeof OpcionSchema>;

/** `modelo`: nombre compartido con quien usa el mismo modelo fuera de aquí, para no volver a pedir la descarga. */
export const HerramientaSchema = z.object({
  id: z.string(),
  modelo: z.string().optional(),
  nombre: z.string(),
  descripcion: z.string(),
  icono: z.string(),
  mb: z.number().positive(),
  entrada: z.enum(['imagen', 'audio', 'texto']),
  ejemplo: z.string().optional(),
  opciones: z.array(OpcionSchema).optional(),
  gpu: z.boolean().optional(),
  aviso: z.string().optional(),
});
export type Herramienta = z.infer<typeof HerramientaSchema>;

/** Un modelo cargado. `vectorizar` solo existe en los que dan embeddings. */
export type Motor = { ejecutar(entrada: Entrada, opciones: Opciones, parcial: (texto: string) => void): Promise<Salida>; vectorizar?(textos: string[]): Promise<Float32Array[]>; liberar(): void };
/** Lo que exporta cada bundle de `motores/`. */
export type Crear = (opciones: Opciones, alProgreso: (p: ProgressInfo) => void) => Promise<Motor>;

/** Progreso de una descarga, 0..100 y sin retroceder. */
type Progreso = { progress?: number };
type Cargar<T> = (alProgreso: (p: Progreso) => void) => Promise<T>;
/** `clave`: id del modelo (con `/` si es de Hugging Face, para mirar la caché real). `mb`: lo que decide toast o modal. */
export type Pedido<T> = { clave: string; nombre: string; mb: number; cargar: Cargar<T> };
export type DialogoDescarga = HTMLElement & { open: boolean };
export type ToastEstatico = { promise?<T>(p: Promise<T>, c: { loading: string; success: string; error: string }): Promise<T> };

const CuantizacionSchema = z.union([z.object({ tipo: z.enum(['int8', 'int16', 'bits']) }), z.object({ tipo: z.literal('decimales'), decimales: z.number().int().min(0) })]);
type Cuantizacion = z.infer<typeof CuantizacionSchema>;
/** Transformación lista para usar. `matriz` null: toma las primeras `dims` entradas tal cual. */
export type Aplanado = { metodo: string; dims: number; media: Float32Array | null; matriz: Float32Array[] | null; cuantizacion: Cuantizacion; escala: number };
/** Enteros en base64 con su escala: así viajan media, matriz y vectores. */
const EmpaqueSchema = z.object({ bits: z.union([z.literal(8), z.literal(16)]), escalas: z.array(z.number()), datos: z.string() });
export type Empaque = z.infer<typeof EmpaqueSchema>;
/** Forma JSON de `Aplanado`. */
export type AplanadoJson = Omit<Aplanado, 'media' | 'matriz'> & { media: Empaque | null; matriz: Empaque | null };
/** Corpus horneado: `clave` son los nombres (pesan más), `texto` el resto de palabras. */
export type ItemBuscable<M = Record<string, unknown>> = M & { id: string; clave: string; texto: string };
export type CorpusAplanadoJson<M = Record<string, unknown>> = { modelo: string; aplanado: AplanadoJson; items: ItemBuscable<M>[]; vectores: Empaque | number[][] };
export type CorpusAplanado<M = Record<string, unknown>> = { modelo: string; aplanado: Aplanado; items: ItemBuscable<M>[]; vectores: Float32Array[] };

/** Cómo se ajusta la transformación al hornear (solo build). */
export type Receta = { metodo: 'pca' | 'lda' | 'aleatoria' | 'truncado' | 'ninguno'; dims: number; blanqueo?: number; regularizacion?: number; semilla?: number; cuantizacion: Cuantizacion };
/** `base` define media y varianza; `extra` son consultas sintéticas; `clases` las frases de cada ítem. */
export type Muestras = { base: ArrayLike<number>[]; extra?: ArrayLike<number>[]; clases?: ArrayLike<number>[][] };
export type Eigen = { valores: Float64Array; vectores: Float64Array[] };

/** Cómo se ordena. `exacta`: qué cuenta como coincidencia que va primero; `umbral`: desvíos sobre la media para marcar `relevante`. */
const AjusteOrdenSchema = z.object({
  exacta: z.enum(['ninguna', 'subcadena', 'palabra', 'palabra-clave']),
  minimoExacta: z.number().int().min(0),
  pesoLexico: z.number().min(0),
  pesoTexto: z.number().min(0).max(1),
  tipificar: z.boolean(),
  umbral: z.number(),
});
export type AjusteOrden = z.infer<typeof AjusteOrdenSchema>;
/** Palabras de cada ítem, calculadas una vez por corpus. */
export type IndiceItem = { clave: string[]; texto: string[]; plano: string };
/** Un resultado de la búsqueda. `relevante`: pasa el umbral o coincide por palabra. */
export type ResultadoOrden<M> = { item: ItemBuscable<M>; exacta: boolean; lexico: number; sentido: number; puntaje: number; relevante: boolean };

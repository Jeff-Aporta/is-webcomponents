// tipos.ts: tipos compartidos de la suite E2E (todo fuertemente tipado).
import type { Page, Locator, Stagehand, LocalBrowser, StagehandBrowser } from '@browserbasehq/stagehand';

export type { Page, Locator, Stagehand, LocalBrowser, StagehandBrowser };

/** Evento de consola ya normalizado (tipo + texto legible). */
export interface RegistroConsola {
  tipo: string;
  texto: string;
}

/** Contexto que arrancar() devuelve a los tests. */
export interface CtxE2E {
  browser: StagehandBrowser;
  stagehand: Stagehand;
  page: Page;
  consola: RegistroConsola[];
  cerrar: () => Promise<void>;
  etiqueta: string;
}

/** Host <is-code> visto desde el DOM (cast minimo para los evaluate). */
export type EditorIsCode = HTMLElement & {
  value: string;
  readonly: boolean;
  mode: string;
  shadowRoot: ShadowRoot;
};

/** Contadores de eventos is-* usados en el test de escritura. */
export interface ContadoresEventos {
  input: number;
  change: number;
  cursor: number;
}

/** Contadores de fases is-mark-activate. */
export type FasesMarks = string[];

/** Bags en window para cruzar evaluate() (documento navegador, no Node). */
export interface BagsE2E {
  __edE2E?: EditorIsCode;
  __evs?: ContadoresEventos;
  __edMarks?: EditorIsCode;
  __phases?: FasesMarks;
  __span?: HTMLElement;
}

/** Rastro de CodeMirror (debe quedar vacio: motor nativo). */
export interface RastroCodeMirror {
  nodos: number;
  global: string;
  recursos: string[];
  tags: string[];
  total: number;
}

declare global {
  interface Window extends BagsE2E {}
}

/** Resultado estructurado de un evaluate con forma conocida. */
export type RecursoGrafico = { svg: number; canvas: number; texto: number; instancias: number; demos: number; definido: boolean };

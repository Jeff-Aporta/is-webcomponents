/**
 * Contratos del render headless de diagramas iswc-*.
 * Vendor: copiar junto a render-diagram.ts desde dist/cdn/tools/.
 */

/** Atributos HTML del host (theme, min-gap, …). */
export type HostAttrs = Record<string, string>;

/** Job sintético: el tool arma el HTML y carga el .min.js. */
export type SyntheticDiagramJob = {
  /** Tag del custom element. Default: iswc-component-diagram */
  tag?: string;
  /**
   * URL del módulo ESM del componente.
   * Absoluta (http/https/file) o relativa a `serveRoot` (p. ej. dist/cdn/…).
   */
  scriptUrl: string;
  /** Payload JSON que se asigna a `el.payload`. */
  payload?: unknown;
  /** Atributos del host (`theme="insoft-cd"`, `min-gap="72"`…). */
  attrs?: HostAttrs;
  /** CSS extra en el documento (opcional). */
  css?: string;
};

/** Job sobre una página ya existente (HTML del ISS, preview, etc.). */
export type PageDiagramJob = {
  /** file://… o http://… */
  pageUrl: string;
};

export type RenderDiagramJob = SyntheticDiagramJob | PageDiagramJob;

export type RenderDiagramOptions = {
  /**
   * Chromium de Playwright (inyectado).
   * Deno/Node: `createRequire(import.meta.url)('playwright').chromium`
   */
  chromium: {
    launch: (opts?: { headless?: boolean }) => Promise<RenderBrowser>;
  };
  /** Raíz estática (repo iswc o vendor). Obligatorio si el job es sintético. */
  serveRoot?: string;
  /** Timeout hasta `__ISWC_RENDER_READY__` / SVG montado (ms). Default 90_000. */
  timeoutMs?: number;
  /** Espera extra tras ready antes de extraer (ms). Default 400. */
  settleMs?: number;
  /** Viewport del contexto. */
  viewport?: { width: number; height: number };
  /** También captura PNG del SVG (bytes). */
  png?: boolean;
  /** Post-proceso del SVG (paleta ISS, etc.). */
  transformSvg?: (svg: string) => string;
};

export type RenderDiagramResult = {
  svg: string;
  width: number | null;
  height: number | null;
  png?: Uint8Array;
};

/** Subconjunto mínimo de Playwright (sin tipar la lib entera). */
export type RenderBrowser = {
  newPage: () => Promise<RenderPage>;
  newContext: (opts?: Record<string, unknown>) => Promise<RenderContext>;
  close: () => Promise<void>;
};

export type RenderContext = {
  newPage: () => Promise<RenderPage>;
  close: () => Promise<void>;
};

export type RenderPage = {
  goto: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
  waitForFunction: (fn: string | (() => unknown), arg?: unknown, opts?: Record<string, unknown>) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
  evaluate: <T>(fn: string | (() => T) | ((arg: unknown) => T), arg?: unknown) => Promise<T>;
  emulateMedia?: (opts: { colorScheme?: string }) => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  close: () => Promise<void>;
  $: (sel: string) => Promise<RenderElementHandle | null>;
};

export type RenderElementHandle = {
  screenshot: (opts: Record<string, unknown>) => Promise<Buffer | Uint8Array>;
};

export type StaticServer = {
  port: number;
  base: string;
  close: () => void;
};

/**
 * diagram-styles.ts — Estilos de diagrama con carga diferida.
 *
 * El consumidor no define temas a mano: elige un estilo por atributo.
 *
 *   <iswc-component-diagram diagram-style="insoft"></iswc-component-diagram>
 *
 * Un estilo es un paquete de temas JSON, uno por tipo de diagrama (`er`,
 * `component`, `class`, `sequence`), y se descarga una sola vez, la primera vez que un
 * diagrama lo pide. Así los estilos no viajan dentro de cada bundle: el de
 * InSoft se carga junto (sus tres temas) y un estilo nuevo es otra carga.
 *
 * API pública:
 *   registerStyleDiagram({ miEstilo: ['https://…/mi-er.json', '…/mi-clases.json'] })
 *     — para librerías de estilos: registra archivos bajo un nombre.
 *
 * Interno (no es API del consumidor):
 *   loadStylesDiagram(nombre) — lo llama DiagramElementBase antes de
 *     renderizar cuando el host trae `diagram-style`.
 *   styleThemeFor(nombre, tipo) — el tema ya cargado para un tipo.
 */
import { registerErTheme } from './theme.js';
import type { ErThemeJson } from './theme.js';
import { ErThemeJsonSchema } from './theme.schemas.js';
import type { DiagramStyleKind, DiagramStyleRegistry, DiagramStyleStore } from './diagram-styles.schemas.js';

const GLOBAL_KEY = '__iswcDiagramStyles';
const raiz = globalThis as typeof globalThis & { [GLOBAL_KEY]?: DiagramStyleStore };
const STORE: DiagramStyleStore = raiz[GLOBAL_KEY] ??= { archivos: new Map(), cargas: new Map(), temas: new Map() };
const ARCHIVOS = STORE.archivos;
const CARGAS = STORE.cargas;
const TEMAS = STORE.temas;

/** Normaliza el nombre del estilo (`InSoft` = `insoft`). */
function clave(nombre: string): string {
  return String(nombre ?? '').trim().toLowerCase();
}

/**
 * Registra estilos: `{ nombre: [archivos] }`. Las rutas relativas se
 * resuelven contra `base` (por defecto, la ubicación de este módulo). Volver
 * a registrar un nombre reemplaza sus archivos y descarta la carga previa.
 */
export function registerStyleDiagram(registro: DiagramStyleRegistry, base: string | URL = import.meta.url): void {
  for (const [nombre, archivos] of Object.entries(registro)) {
    const k = clave(nombre);
    if (!k || !Array.isArray(archivos) || !archivos.length) continue;
    ARCHIVOS.set(k, archivos.map((a) => new URL(a, base).href));
    CARGAS.delete(k);
    TEMAS.delete(k);
  }
}

/** Estilos registrados (cargados o no). */
export function listStylesDiagram(): string[] {
  return [...ARCHIVOS.keys()];
}

/** true si el estilo ya terminó de cargar. */
export function isStyleDiagramLoaded(nombre: string): boolean {
  return TEMAS.has(clave(nombre));
}

/**
 * Interno: descarga (una sola vez) los temas de un estilo y los registra.
 * Un estilo desconocido resuelve sin error: el diagrama se pinta con su
 * tema por defecto en vez de quedarse vacío.
 */
export function loadStylesDiagram(nombre: string): Promise<void> {
  const k = clave(nombre);
  const enCurso = CARGAS.get(k);
  if (enCurso) return enCurso;
  const archivos = ARCHIVOS.get(k);
  if (!archivos) return Promise.resolve();
  const carga = (async () => {
    const temas = await Promise.all(archivos.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`diagram-style "${k}": ${url} → HTTP ${res.status}`);
      // Validado: un JSON de tema mal formado falla aquí con su ruta, no al pintar.
      return ErThemeJsonSchema.passthrough().parse(await res.json());
    }));
    const porTipo = new Map<DiagramStyleKind, ErThemeJson>();
    for (const t of temas) {
      registerErTheme(t);
      if (t.kind) porTipo.set(t.kind, t);
    }
    TEMAS.set(k, porTipo);
  })();
  // Una carga fallida no queda cacheada: el siguiente render reintenta.
  carga.catch(() => CARGAS.delete(k));
  CARGAS.set(k, carga);
  return carga;
}

/** Interno: tema cargado de `estilo` para el tipo de diagrama, o null. */
export function styleThemeFor(estilo: string | null | undefined, tipo: DiagramStyleKind): ErThemeJson | null {
  if (!estilo) return null;
  const t = TEMAS.get(clave(estilo))?.get(tipo);
  if (t) registerErTheme(t); // registro local del bundle que lo pide
  return t ?? null;
}

/**
 * Nombre del estilo que pide un host: `diagram-style`, o el atributo
 * heredado `theme` (`insoft` / `insoft-cd` → estilo `insoft`).
 */
export function hostStyleName(host: Element): string | null {
  const explicito = host.getAttribute('diagram-style');
  if (explicito) return clave(explicito);
  const legado = host.getAttribute('theme');
  if (!legado) return null;
  const k = clave(legado).replace(/-(cd|class|er)$/, '');
  return ARCHIVOS.has(k) ? k : null;
}

// Estilo InSoft: los tres temas en una sola carga. Viven junto a los
// bundles de diagramas (`dist/cdn/diagrams/themes/`). Solo se registra si
// nadie lo hizo antes (otro bundle, o una librería que lo reemplazó).
if (!ARCHIVOS.has('insoft')) registerStyleDiagram({
  insoft: ['./themes/insoft.json', './themes/insoft-cd.json', './themes/insoft-class.json', './themes/insoft-seq.json'],
});

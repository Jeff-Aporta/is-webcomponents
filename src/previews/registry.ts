/**
 * Registry de previews: JSON homogéneo (is-preview/v1) + behavior opcional.
 * No hay HTML por componente — solo `_shell.html` para fullscreen.
 *
 * El servidor de docs manda `Cache-Control: no-store` (serve.mjs) para que los
 * módulos no queden congelados al editar. Sin caché en memoria, cada cambio de
 * vista volvería a fetchear el JSON (40–90 KB) y la UI anterior se quedaría
 * visible hasta que resolviera — se siente como delay al navegar.
 */
import catalog from './catalog.js';
import { JsonPreview } from './_kit/JsonPreview.js';
import { loadDefinitionJson } from './_kit/load-json.js';
import type {
  ISComponentPreviewLike,
  PreviewBehaviorModule,
  PreviewDefinition,
} from './_kit/types.d.ts';

/** Mirror of an entry in catalog.ts (auto-generated). */
interface CatalogEntry {
  json: string;
  behavior?: string;
  category: string;
}

function previewsBase(): URL {
  // Consumo: gallery-app.min.js en dist/ → ../src/previews/
  // Fuente: registry.ts en src/previews/ → ./ (mismo directorio)
  const here = import.meta.url;
  if (/\/dist\//.test(here) || /gallery-app\.min\.js/.test(here)) {
    return new URL('../src/previews/', here);
  }
  return new URL('./', here); // registry vive en src/previews/
}

const definitionCache = new Map<string, PreviewDefinition>();

const behaviorCache = new Map<string, PreviewBehaviorModule>();

export function hasControlledPreview(tag: string): boolean {
  return Object.prototype.hasOwnProperty.call(catalog, tag);
}

export function controlledPreviewTags(): string[] {
  return Object.keys(catalog);
}

export function hasCachedPreview(tag: string): boolean {
  return definitionCache.has(tag);
}

export async function loadPreview(tag: string): Promise<ISComponentPreviewLike | null> {
  const entry = (catalog as Record<string, CatalogEntry | undefined>)[tag];
  if (!entry) return null;

  let definition: PreviewDefinition | undefined = definitionCache.get(tag);
  if (!definition) {
    const jsonUrl = new URL(entry.json, previewsBase());
    const loaded = await loadDefinitionJson(jsonUrl) as PreviewDefinition;
    definition = loaded;
    definitionCache.set(tag, loaded);
  }
  if (!definition) return null;

  let behavior: PreviewBehaviorModule | null = null;
  if (entry.behavior || definition.hasBehavior) {
    const behPath = entry.behavior || `../components/${tag}.js`  // legacy fallback;
    const behKey = behPath;
    const cached = behaviorCache.get(behKey);
    if (cached) {
      behavior = cached;
    } else {
      try {
        const mod = await import(new URL(behPath, previewsBase()).href) as PreviewBehaviorModule;
        behavior = mod;
        behaviorCache.set(behKey, mod);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[registry] behavior missing for ${tag}:`, msg);
      }
    }
  }

  return new JsonPreview(definition as unknown as ConstructorParameters<typeof JsonPreview>[0], behavior);
}

/** Vacía la caché de definiciones (tests / HMR manual). */
export function clearPreviewCache(): void {
  definitionCache.clear();
  behaviorCache.clear();
}

export function previewCatalogEntry(tag: string): CatalogEntry | null {
  return (catalog as Record<string, CatalogEntry | undefined>)[tag] ?? null;
}

export { catalog };
export default catalog;

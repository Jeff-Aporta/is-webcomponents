/**
 * doc-demo-host.ts — arranque module reutilizable de apps doc-demo.
 *
 * 1. Lee attrs del primer `<iswc-doc-demo>` (`local` | `prefer-self`, `sheets-cache`)
 * 2. Theme/palette vía alias `iswc-doc-demo-boot`
 * 3. `L.load('iswc-doc-demo')` (catálogo del loader)
 *
 * Local (self-test del kit):
 *   <script type="module" src="./dist/cdn/preview/doc-demo-host.min.js"></script>
 *   <iswc-doc-demo brand="ISWC" local dev sheets-cache="…"></iswc-doc-demo>
 *
 * CDN (otra app):
 *   <script type="module" src="https://cdn.jsdelivr.net/gh/…/dist/cdn/preview/doc-demo-host.min.js"></script>
 *   <iswc-doc-demo brand="MiApp" sheets-cache="mi-app-sheets"></iswc-doc-demo>
 *
 * La SPA hermana debe esperar `iswc-doc-demo-ready` / `whenReady()` / `#shellNav`
 * (TLA del host no bloquea siblings module).
 */
const loaderHref = new URL('../core/loader.min.js', import.meta.url).href;
const { ISWebComponentsLoader: L } = await import(/* @vite-ignore */ loaderHref) as {
  ISWebComponentsLoader: {
    configure(opts: Record<string, unknown>): unknown;
    sheets: { install(opts: { cacheName: string }): unknown };
    load(...ids: string[]): Promise<unknown>;
    loadPageModules(ids: string[]): Promise<unknown>;
  };
};

const el = document.querySelector('iswc-doc-demo');
if (el?.hasAttribute('local')) {
  L.configure({ local: true });
} else if (el?.hasAttribute('prefer-self')) {
  L.configure({ preferSelf: true });
}

const cache = el?.getAttribute('sheets-cache');
if (cache) L.sheets.install({ cacheName: cache });

// Theme/palette + CSS crítico (alias module del loader).
await L.loadPageModules(['iswc-doc-demo-boot']);
await L.load('iswc-doc-demo');

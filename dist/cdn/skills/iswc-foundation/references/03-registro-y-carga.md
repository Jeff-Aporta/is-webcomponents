<!-- @vendor 2026-10-14T16:13:19.844Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/references/03-registro-y-carga.md -->
# 03 — Registro y carga de componentes

## Registro único: `src/js/kit-tags.ts`

```ts
export const KIT_TAGS = ['iswc-button', 'iswc-card', 'iswc-icon', …] as const;   // del kit, solo padres registrables
export const PREFIJO = 'mia';
export const APP_TAGS = ['mia-app'] as const;                                     // transversales
export const VIEW_TAGS = { hola: ['mia-hola'] } as const;                          // por vista (hijos antes que el shell)
export function rutaComponente(tag): string | null;   // 'js/components/mia/' | 'view/<v>/components/'
export function mapaRutas(): Record<string, string>;  // tag → ruta del .js (exige el prefijo)
export const tagsArranque = () => [...APP_TAGS, ...Object.values(VIEW_TAGS).flat()];
```

- Un componente se declara **una vez**, en la lista que le toca. Todo lo demás se deriva: el
  registrador (build), el bundle de compatibilidad (hojas por tag), la galería, los guardianes.
- `APP_TAGS ∩ ⋃VIEW_TAGS = ∅`. Un tag en la lista equivocada pide un 404 y la vista sale vacía sin error.
- `KIT_TAGS` lista solo padres; los hijos (`iswc-tab`, `iswc-tab-panel`, `iswc-tree-item`…) los registra su padre.

## Arranque estándar (TODA página: raíz, vista aislada, demo, galería)

```html
<script src="./dist/cdn/boot.js"></script>                         <!-- tema antes de pintar -->
<link rel="stylesheet" href="./dist/cdn/styles/app.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.mjs"></script>
<script type="module" src="./dist/cdn/<p>Loader.min.js"></script>  <!-- registerApp: tag → URL?v= -->
<script type="module">
  const L = globalThis.iswcLoader;
  const listo = () => document.documentElement.setAttribute('data-app-ready', '');
  const watchdog = setTimeout(listo, 6000);
  try {
    await L.loadPageStyles(['iswc-palettes-default']);
    const { KIT_TAGS, tagsArranque } = await import('./dist/cdn/js/kit-tags.js');
    await L.load(...KIT_TAGS, ...tagsArranque());       // vista aislada: ...VIEW_TAGS.<v>
  } finally { clearTimeout(watchdog); listo(); }
</script>
```

- `data-app-ready` es la marca común de «arranque terminado» (las pruebas e2e la esperan; `app.scss`
  oculta el body hasta entonces). El watchdog revela la página a los 6 s aunque algo falle.

### Arranque recomendado con el loader en dos capas (kit F4)

Con un pin del kit posterior a F4: import map con el alias, `modulepreload` del cierre del shell crítico (de
`dist/cdn/deps.json` del kit: `tags[tag]` de cada tag del shell, los `_chunks/` sin `?v=`), `<link>` de las hojas
base, y revelar cuando el shell está **definido** (`ensure`), dejando lo demás en `load` progresivo.

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/" } }
</script>
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.mjs">
<!-- … un modulepreload por cada ruta del cierre del shell crítico … -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/is-base.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/palettes.min.css">
<script type="module" src="./dist/cdn/<p>Loader.min.js"></script>  <!-- registerApp: tag → { href: URL?v=, type: 'module' } -->
<script type="module">
  import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  const { KIT_TAGS, tagsArranque } = await import('./dist/cdn/js/kit-tags.js');
  const shell = ['iswc-app-shell', ...tagsArranque()];             // lo que debe estar definido para revelar
  await Promise.all(shell.map((t) => L.ensure(t)));
  document.documentElement.setAttribute('data-app-ready', '');
  void L.load(...KIT_TAGS);                                         // el resto se «upgradea» al llegar
</script>
```

- `load()` resuelve al importar (no espera `whenDefined`); `ensure()` resuelve al definirse.
- El loader infiere el tipo por extensión (`.mjs` → módulo, `.js` → clásico): el registrador pasa `type: 'module'`
  para los componentes de la app (`.js` ES). `registerApp(…, { deps })` precarga el cierre de un tag de la app.
- El arranque no usa IndexedDB, Cache Storage (salvo que la app instale `sheets`) ni la API de GitHub.
- El registrador nunca carga el kit: si falta el loader, lanza un error claro.
- Hosts externos que quieren un solo `<script>`: `dist/cdn/all.min.js` (el barril fija la raíz de hojas).

## Componentes: base (`src/js/base/componente.ts`)

`crearComponente(import.meta.url, '<tag>', inicial, render, parcial?)` · `define` (idempotente) ·
`emitir(host, nombre, detail)` (bubbles + composed) · `html\`…\`` (escape por defecto, `on<evento>=`,
`raw()`) · `adoptCss`/`precargarCss` (hojas construidas, una descarga por href) ·
`adoptarPropsTardias` · `avisar` (toast del kit). Detalle de uso:
[nuevo-componente.md](../templates/specs/iswc/nuevo-componente.md).

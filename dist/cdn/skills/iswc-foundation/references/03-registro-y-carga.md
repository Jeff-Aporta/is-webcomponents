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
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<sha40>/dist/cdn/core/loader.min.js"></script>
<script type="module" src="./dist/cdn/<p>Loader.min.js"></script>  <!-- registerApp: tag → URL?v= -->
<script type="module">
  const L = globalThis.ISWebComponentsLoader;
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
- El registrador nunca carga el kit: si falta el loader, lanza un error claro.
- Hosts externos que quieren un solo `<script>`: `dist/cdn/all.min.js` (el barril fija la raíz de hojas).

## Componentes: base (`src/js/base/componente.ts`)

`crearComponente(import.meta.url, '<tag>', inicial, render, parcial?)` · `define` (idempotente) ·
`emitir(host, nombre, detail)` (bubbles + composed) · `html\`…\`` (escape por defecto, `on<evento>=`,
`raw()`) · `adoptCss`/`precargarCss` (hojas construidas, una descarga por href) ·
`adoptarPropsTardias` · `avisar` (toast del kit). Detalle de uso:
[nuevo-componente.md](../templates/specs/iswc/nuevo-componente.md).

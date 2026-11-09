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

## Arranque estándar (TODA página: raíz, vista aislada, demo, galería; kit F4+)

Implementado en las plantillas (`index.html`, `view/<v>/index.html`, `view/<v>/demo/index.html`, `view/demo/index.html`):
es la referencia que copian las apps existentes al re-pinear (F5b).

```html
<script type="importmap">                                            <!-- 0) antes de cualquier módulo -->
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/" } }
</script>
<script src="./dist/cdn/boot.js"></script>                         <!-- tema antes de pintar -->
<link rel="stylesheet" href="./dist/cdn/styles/app.css">
<!-- iswc:precarga:inicio -->                                        <!-- 1) lo escribe `deno task build` -->
<meta name="iswc-precargado" content="<sha40>">                     <!-- el loader no pide deps de lo precargado -->
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.mjs">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/_chunks/chunk-….mjs">
<!-- … un modulepreload por ruta de deps.json → tags[tag] de cada tag de SHELL_CRITICO … -->
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/is-base.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/is-base.min.css"></noscript>
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/palettes.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/palettes.min.css"></noscript>
<!-- iswc:precarga:fin -->
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.mjs"></script>
<script type="module" src="./dist/cdn/<p>Loader.min.js"></script>  <!-- registerApp: tag → { href: URL?v=, type: 'module' } -->
<script type="module">
  const L = globalThis.iswcLoader;
  const listo = () => document.documentElement.setAttribute('data-app-ready', '');
  const watchdog = setTimeout(listo, 6000);
  try {
    const { KIT_TAGS, tagsArranque } = await import('./dist/cdn/js/kit-tags.js');
    await L.load(...KIT_TAGS, ...tagsArranque());       // vista aislada: ...VIEW_TAGS.<v>
  } finally { clearTimeout(watchdog); listo(); }
</script>
```

- **Import map**: el alias `@jeff-aporta/iswc-base/` al pin; lo usan los componentes de la app
  (`import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs'`), que el build deja con el especificador
  tal cual. Es la misma entrada de `deno.json` (typecheck). `deno task pin` mueve las dos.
- **Precarga**: `src/utils/build.ts` reescribe el bloque entre `<!-- iswc:precarga:inicio -->` y
  `<!-- iswc:precarga:fin -->` de cada HTML con el loader, el cierre de `SHELL_CRITICO` (`src/js/kit-tags.ts`) sacado
  de `src/vendor/iswc-base/deps.json` (lo vendorizan `deno task vendor:iswc` y `deno task pin --nuevo=…`, unido desde
  el índice + `deps/<cat>.json` del kit), la marca `iswc-precargado` con el pin (el loader no pide `deps` para lo que
  ya está precargado) y las hojas base no bloqueantes (`preload as=style` → `stylesheet`; un `<link rel=stylesheet>`
  en `<head>` frena los módulos que siguen). Sobre pin SHA todo es inmutable: sin `?v=`. Idempotente.
- **Orden**: el `<script type="module">` del loader va ANTES del registrador (los módulos se ejecutan en orden de
  documento y el registrador necesita `globalThis.iswcLoader`).
- `data-app-ready` es la marca común de «arranque terminado» (las pruebas e2e la esperan; `app.scss`
  oculta el body hasta entonces). El watchdog revela la página a los 6 s aunque algo falle.
- Variante progresiva (apps grandes): revelar cuando el shell está **definido** (`await Promise.all(shell.map((t) =>
  L.ensure(t)))`) y dejar el resto en `void L.load(...)`.
- `load()` resuelve al importar (no espera `whenDefined`); `ensure()` resuelve al definirse.
- El loader infiere el tipo por extensión (`.mjs` → módulo, `.js` → clásico): el registrador pasa `type: 'module'`
  para los componentes de la app (`.js` ES). `registerApp(…, { deps })` precarga el cierre de un tag de la app.
- El arranque no usa IndexedDB, Cache Storage (salvo que la app instale `sheets`) ni la API de GitHub.
- El registrador nunca carga el kit: si falta el loader, lanza un error claro.
- Hosts externos que quieren un solo `<script>`: `dist/cdn/all.min.js` (cada tag lleva su CSS dentro; el kit sigue
  externo por el import map).

## Componentes: el molde del kit (`IswcElement`/`IswcReactive`) y la base `Componente`

Forma canónica (la misma que los componentes del kit):

```ts
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';                                  // .css compilado hermano: el build lo incrusta
import { Componente, html } from '../../base/componente.js';

class MiaX extends Componente<MiaXProps> {
  static tag = 'mia-x';                                      // = nombre del archivo
  static css = css;                                          // el molde crea UNA CSSStyleSheet por clase
  static observed = ['color'];                               // atributos observados
  static deps = ['iswc-button'];                             // hijos del kit: el molde los pide al loader
  protected override inicial(): MiaXProps { return { … }; }
  protected override pintar(root: ShadowRoot, props: MiaXProps): void { root.append(html`…`); }
  protected override parcial(props: MiaXProps, previos: MiaXProps): boolean { … }   // opcional
}
define(MiaX);
```

- Sin `props` y con atributos o estado: `class X extends IswcReactive` (`core/iswc-reactive.min.mjs`) con
  `@prop() accessor label = ''`, `@prop({ type: 'bool' })`, `@prop({ enum: […] })` y `@state()`, como los componentes
  del kit (forma canónica en `specs/componentes.md` S-K2 del kit). Nunca un par get/set que refleja el atributo a mano.
  El build (`construirApp`, esbuild `es2022`) baja los decoradores.
- Estático: `class X extends IswcElement` (mismo import que `define`), con `static template`.
- `Componente` (`src/js/base/componente.ts`) pone `props` (mezcla, `revisarProps`, repintado), `parcial`, el rescate
  de props tardías, `html`/`raw`/`el` y `avisar`. Eventos: `this.emit(nombre, detail)` del molde (bubbles + composed).
- Nada de `adoptCss`, `<link>` a la hoja hermana ni `static get observedAttributes` a mano. Los estáticos van sin
  `override` (el molde llega como JS publicado). Detalle: [nuevo-componente.md](../templates/specs/iswc/nuevo-componente.md).

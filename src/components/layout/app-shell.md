---
tag: iswc-app-shell
tags:
  - iswc-app-shell
category: layout
status: public
source: ./app-shell.ts
style: ./app-shell.css
preview: ./app-shell.json
---
# `<iswc-app-shell>`

## Propósito

Armazón de una aplicación: barra superior fija (marca, navegación, acciones) y una vista que hace
scroll propio debajo. El host ocupa el alto del viewport y nunca scrollea: la barra siempre queda
visible. Opcionalmente añade barra lateral (cajón en móvil), pie y contenedor de avisos. No conoce
ningún backend. Contrato WHAT: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md).

## Cuándo usarlo

- Consolas, paneles y apps (web o APK con Capacitor) con barra arriba y una vista que cambia.
- Junto a `<iswc-app-nav>` (pestañas) y `<iswc-session-menu>` (sesión) en los slots de la barra.

## Cuándo no usarlo

- Páginas de documentación con índice lateral: usa `<iswc-doc-layout>`.
- Contenido que debe scrollear con el documento (landing larga, artículo): no hace falta armazón.
- Un panel dentro de otra página: el shell asume el alto completo del viewport (cámbialo con
  `--iswc-shell-height` si de verdad lo necesitas).

## Importación

```js
import { iswcLoader as L } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<SHA>/dist/cdn/core/loader.min.js';
await L.load('iswc-app-shell', 'iswc-app-nav', 'iswc-session-menu');
```

## Ejemplo mínimo

```html
<iswc-app-shell brand="Mi App" logo="mdi:rocket" brand-href="/" toast="top-end">
  <iswc-app-nav slot="nav" rows='[{"id":"tool","value":"inicio","tabs":[{"id":"inicio","label":"Inicio","icon":"mdi:home"}]}]'></iswc-app-nav>
  <iswc-session-menu slot="actions"></iswc-session-menu>
  <section>Vista</section>
</iswc-app-shell>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `brand` | string | Texto de la marca. Se oculta < 40rem si hay `logo`. |
| `logo` | string | Icono `prefijo:nombre` (`mdi:rocket`) o URL de imagen. |
| `brand-href` | string | Destino de la marca. Sin él la marca es un botón. |
| `home-label` | string | Nombre accesible de la marca (default "Ir al inicio"). |
| `sidebar-label` | string | Título del cajón móvil y del botón de menú (default "Menú"). |
| `toast` | placement | `top-end`, `bottom-end`… Crea un `<iswc-toast>` interno. Sin él no hay avisos. |

#### Propiedades públicas

Ninguna además de los atributos.

### Slots

| Slot | Contenido |
| --- | --- |
| `brand` | Reemplaza logo + texto de la marca. |
| `nav` | Navegación de la barra (p. ej. `<iswc-app-nav>`). |
| `actions` | Controles a la derecha (`<iswc-session-menu>`, `<iswc-theme-toggle>`…). |
| (default) | La vista. Cada hijo crece para llenar el alto; con `height:100%` lo llena sin doble scroll. |
| `sidebar` | Barra lateral. < 40rem pasa a un `<iswc-drawer>` con botón de menú. |
| `footer` | Pie al final del scroll de la vista. |

### Eventos

| Evento | `detail` | Cuándo |
| --- | --- | --- |
| `iswc-brand-home` | `{ href }` | Clic/Enter en la marca. Cancelable: `preventDefault()` evita la navegación. |

### Métodos y propiedades públicas

| Método | Qué hace |
| --- | --- |
| `toast(message, options?)` | Muestra un aviso (opciones de `<iswc-toast>.create`). Requiere atributo `toast`. |
| `openSidebar()` / `closeSidebar()` | Abre/cierra el cajón lateral (solo en pantalla estrecha). |

### CSS parts

| Part | Nodo |
| --- | --- |
| `bar` | Barra superior (sticky). |
| `brand`, `logo`, `brand-text` | Marca. |
| `nav`, `actions` | Zonas de la barra. |
| `menu-button` | Botón de la barra lateral en móvil. |
| `body`, `sidebar`, `main`, `footer` | Cuerpo, barra lateral, vista con scroll y pie. |
| `drawer` | Cajón móvil. |

### Custom states

| State | Cuándo | Uso |
| --- | --- | --- |
| `mobile` | Viewport < 40rem | `iswc-app-shell:state(mobile)` |
| `has-sidebar` | Hay contenido en `sidebar` | `iswc-app-shell:state(has-sidebar)` |

### CSS custom properties

| Variable | Default |
| --- | --- |
| `--iswc-shell-height` | `100dvh` |
| `--iswc-shell-font` | `--iswc-sans` (lo heredan barra, slots y vista) |
| `--iswc-shell-bg`, `--iswc-shell-text` | `--iswc-bg`, `--iswc-text` |
| `--iswc-shell-bar-bg`, `--iswc-shell-bar-border`, `--iswc-shell-bar-shadow` | fondo, borde y sombra tenue de la barra |
| `--iswc-shell-bar-z` | `20` |
| `--iswc-shell-bar-gap`, `--iswc-shell-bar-min-height` | `0.5rem`, `2.6rem` |
| `--iswc-shell-pad-inline` | `clamp(0.6rem, 2vw, 1.15rem)` |
| `--iswc-shell-sidebar-width`, `--iswc-shell-sidebar-border` | `16rem`, `--iswc-border` |

## Comportamiento

- El documento no scrollea: lo hace `::part(main)`. La barra queda arriba.
- Zonas seguras: la barra suma `env(safe-area-inset-top)` y los laterales; la vista,
  `env(safe-area-inset-bottom)` (usa `viewport-fit=cover` en la app móvil).
- Marca: Ctrl/Cmd/clic medio sobre `brand-href` abren como cualquier enlace.
- < 40rem: con `logo` el texto de la marca se oculta; la barra lateral pasa al cajón.

## Dependencias y componentes relacionados

`<iswc-icon>`, `<iswc-button>`, `<iswc-drawer>`, `<iswc-toast>`. Compañeros: `<iswc-app-nav>`,
`<iswc-session-menu>`, `<iswc-login-dropdown>`, `<iswc-theme-toggle>`, `<iswc-prefs-clear>`.

## Accesibilidad

- La barra es `<header>` y la vista `<main>` (landmarks).
- La marca sin `brand-href` es `role="button"`, enfocable, con Enter/Espacio.
- El cajón móvil hereda de `<iswc-drawer>` foco atrapado, Escape y devolución del foco.

## Ejemplo avanzado

```html
<iswc-app-shell id="app" brand="Consola" logo="./logo.svg" toast="top-end">
  <iswc-app-nav slot="nav" id="nav"></iswc-app-nav>
  <iswc-session-menu slot="actions" id="sesion" modes="password token"></iswc-session-menu>
  <iswc-theme-toggle slot="actions"></iswc-theme-toggle>
  <nav slot="sidebar">…</nav>
  <app-vista></app-vista>
</iswc-app-shell>
<script type="module">
  app.addEventListener('iswc-brand-home', () => router.go('/'));
  app.toast('Bienvenido', { color: 'success' });
</script>
```

## Errores comunes

- Poner el shell dentro de un contenedor con scroll: la página tendrá dos barras de scroll.
- Esperar `IswcToast.host()` global: el toast del shell vive en su shadow; usa `shell.toast()`.
- La barra lateral en móvil vive en el cajón: no le des `position: fixed` propio.

## Reglas para LLM

- Reusar el shell en vez de reescribir barra + vista por app.
- La navegación es de la app: escucha `iswc-brand-home` y `iswc-nav-select`; el shell no enruta.
- No meter fetch, tokens ni marca de un producto dentro del shell: van en slots y atributos.
- Booleano por presencia; `toast` lleva como valor el placement.

## Fuentes

- `src/components/layout/app-shell.ts`, `app-shell.scss`.
- Spec: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md).

# 20 — Componentes, vistas y kit

> Alcance: cómo se define un componente `__PREFIJO__-*`, cómo se registra, cómo se define una vista
> y el catálogo de componentes y vistas. Fuera: build y pines (spec `10`).

## 1. Propósito (WHAT)

La app es una única página hecha de piezas con nombre propio (`<__PREFIJO__-…>`) sobre el kit
iswc-root. Cada pieza muestra una parte concreta, recibe datos (atributos o `props`) y avisa hacia
arriba con eventos `__PREFIJO__-…`; se ve igual en claro y oscuro; tiene una ficha (`.md`) y un
ejemplo vivo en la galería.

## 2. Requisitos WHAT

- [W-COMP-01] Toda pieza visible es un elemento `__PREFIJO__-<algo>`; encapsula su DOM y sus estilos y nunca se ve sin estilos, ni un frame.
- [W-COMP-02] `props` mezcla lo nuevo con lo anterior; asignado antes de registrar el tag, no se pierde.
- [W-COMP-03] Una clave de `props` o un atributo que la pieza no conoce se avisa por consola con el tag y la clave; la pieza no falla.
- [W-COMP-04] Los eventos de una pieza suben por el documento atravesando el shadow DOM.
- [W-COMP-05] Todo color sale del tema activo (tokens del kit); con «reducir movimiento» nada anima.
- [W-COMP-06] Cada pieza aparece en la galería (`view/demo/`) con un ejemplo vivo y «cuándo usarla / cuándo no».
- [W-ICO-01] Todo ícono que la app pinta, y todo ícono de lo que consume (kit y otras apps), está en la propia app (`assets/`): se carga en local y se ve aunque la API de Iconify no responda.
- [W-ICO-02] El mapa de íconos dice qué hay en local y dónde está publicada la app (`host`).
- [W-ICO-03] `<iswc-icon>` carga en local lo que el mapa lista; todo lo demás (o si el archivo local falla) sale de la API de Iconify. No hay otras rutas.
- [W-VIEW-01] Cada dominio es una vista con un único shell; la app solo conoce el shell. Se abre sola (`/view/<v>/index.html`) y tiene demo (`/view/<v>/demo/`).

### Catálogo

**`<__PREFIJO__-app>` — shell** `[W-CAT-01]`: barra con la marca y el conmutador de tema; debajo, el shell de la vista activa. `props = { vista }` (`"hola"` por defecto; una vista sin shell cae en `hola`).

**`<__PREFIJO__-hola-mundo>` — título** `[W-CAT-04]`: un título «Hola mundo». Sin props, atributos ni eventos. Es el molde mínimo de un componente.

**`<__PREFIJO__-hola>` — bienvenida (shell de `hola`)** `[W-CAT-02]`: portada con cejilla «__TITULO__ · iswc», el título `<__PREFIJO__-hola-mundo>`, un lema, el botón «Ver cómo está hecha», cuatro chips (Vanilla, Deno, Zod, SCSS) y cuatro tarjetas: Componentes, Vistas, Tipos, Pruebas (icono, título y texto cada una).

**Modal de la bienvenida** `[W-CAT-03]`: «Ver cómo está hecha» abre un modal «Cómo está hecha» con la regla de los cuatro archivos y los comandos para empezar (`deno install`, `deno task build`, `deno task serve`, `deno task test:all`, uno por línea con su propósito alineado). «Entendido», Esc o un clic fuera lo cierran. Abrir y cerrar se avisan con `__PREFIJO__-hola-modal { abierto }`. `props = { modal = false }` lo abre o cierra desde fuera sin repintar el resto.

## 3. Guía HOW WEAK

- [HW-COMP-01] El componente solo pinta y emite; la lógica vive en `utils/` (vista) o `src/js/` (compartida).
- [HW-COMP-02] Repintar entero es aceptable; si rompe foco o scroll, repintado parcial.

## 4. Contratos HOW STRONG

- [HS-COMP-01] Cuatro archivos hermanos por componente: `<tag>.ts`, `<tag>.scss`, `<tag>.md` (H2 exactos: Anatomía, Atributos observados, Props, Eventos, Slots, Ejemplos; excluir con `<!-- exclude: X -->`, Anatomía nunca), `<tag>.json` (`iswc-preview/v1`).
- [HS-COMP-02] Registro: el tag se declara una vez en `src/js/kit-tags.ts` (`APP_TAGS` transversales en `src/js/components/__PREFIJO__/`; `VIEW_TAGS.<vista>` en `view/<vista>/components/`), su línea en `view/demo/manifest.json` y, si tiene `props`, su schema Zod en `componentes.schemas.ts` registrado en `props-registro.ts`.
- [HS-COMP-03] Base: `crearComponente`/`define`/`emitir`/`html`/`adoptCss`/`precargarCss`/`adoptarPropsTardias` de `src/js/base/componente.ts`.
- [HS-ICO-01] Íconos: ids Iconify literales `set:nombre` en el código (`icon="mdi:home"`, `icono: 'mdi:home'`); un id armado en ejecución va en `extra` de `assets/dl.js`. `deno task icons` (dentro de `build`) escribe `assets/iconify.json` (`IconifyMap` v1: `host` = `deno.json` → `iswc.host`, `ruta`, `base`, `icons`) y `assets/iconify/<set>/<nombre>.svg`, con los íconos de la app y TODOS los de los mapas que consume (`mapas`; por defecto el del kit). El registrador del build empuja el mapa a `globalThis.__ISWC_ICONS__`. `assets/dl.js` solo lleva rutas e importa la herramienta del kit al SHA del pin.
- [HS-VIEW-01] Vista: `index.html`, `README.md`, `demo/index.html`, `components/` (+ `all.ts`), `utils/`.

## 5. Casos borde y errores

- [W-ICO-05] Sin red al construir, `deno task icons` no rompe el build: conserva los íconos que ya están y avisa. Un id que no existe en Iconify se reporta y no entra al mapa.

- [W-COMP-07] Un componente sin hoja o fuera del registro no se carga: los guardianes lo detectan antes de publicar.

## 6. Pruebas (WHAT / HOW WEAK)

- [W-COMP-08] Cada componente registrado tiene sus 4 archivos, su `.md` declara las 6 secciones y su `.json` valida contra `iswc-preview/v1`.
- [W-COMP-09] El dominio de la bienvenida cumple [W-CAT-02] y [W-CAT-03] sin navegador (`tests/vistas/bienvenida`).
- [W-ICO-04] Los íconos de la app están en local [W-ICO-01], el mapa lleva el `host` [W-ICO-02] y el registrador lo registra (`tests/iconos`); en e2e, la bienvenida pide sus íconos a `assets/iconify/` y nada a la API (`tests/e2e/00.bienvenida`).
- [W-COMP-10] E2E: la bienvenida arranca, muestra el título y las tarjetas, y el modal se abre y se cierra como lo haría un usuario (`tests/e2e/00.bienvenida`).

## 7. Notas

Sin notas.

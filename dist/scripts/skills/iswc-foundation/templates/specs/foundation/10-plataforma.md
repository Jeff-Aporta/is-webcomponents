<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/specs/foundation/10-plataforma.md -->
# 10 — Plataforma, build y pines

> Alcance: qué es __TITULO__, cómo arranca la página, las tareas de Deno, el build a `dist/cdn/` y los
> pines del kit. Fuera: el comportamiento de cada vista (specs `30+`) y las pruebas (spec `70`).

## 1. Propósito (WHAT)

__TITULO__ es una aplicación estática (HTML + módulos ES servidos tal cual, sin framework) construida
con el kit iswc-base (`iswc-*`) y componentes propios `__PREFIJO__-*`.

## 2. Requisitos WHAT

- [W-PLAT-01] La página raíz se titula «__TITULO__», idioma `es`, y sin JavaScript muestra «JavaScript requerido».
- [W-PLAT-02] El tema inicial (claro/oscuro) y la paleta se aplican antes del primer pintado: nunca hay un destello del tema equivocado.
- [W-PLAT-03] La página permanece oculta hasta que el arranque termina; si tarda más de 6 s se revela igual, con aviso en consola.
- [W-PLAT-04] La app funciona servida desde la raíz del host o desde cualquier sub-ruta.
- [W-PLAT-05] Un solo comando produce todos los artefactos servibles; otro lo hace en modo vigilancia.
- [W-PLAT-06] Cada módulo propio se sirve con una URL que cambia si y solo si cambia su contenido, y la misma en toda la app.
- [W-PLAT-07] El kit se usa siempre en la misma versión congelada en toda la app (página, vistas aisladas, demos).

## 3. Guía HOW WEAK

- [HW-PLAT-01] Separar el loader del kit (externo, CDN) del registrador de la app (propio, generado por el build): el registrador solo mapea tag → URL y falla explícito si el loader no está.
- [HW-PLAT-02] La lista de tags (kit, transversales, por vista) es una única fuente que consumen el build, el arranque y la galería.

## 4. Contratos HOW STRONG

- [HS-PLAT-01] Runtime Deno; dependencias de build en `deno.json` `imports`: `esbuild@0.28.1`, `sass@^1.105.0`, `zod@4.4.3`, `jsdom@29.1.1`, `@browserbasehq/stagehand@4.1.0`; schemas del kit (`@iswc/component-schemas`, `@iswc/loader-schemas`) por SHA de 40 hex.
- [HS-PLAT-02] Tareas: `build:scss`, `build`, `dev`, `serve`, `check`, `pin`, `vendor:iswc`, `test`, `test:health`, `test:e2e`, `test:all`, `test:all:halt`, `sync:entregable`.
- [HS-PLAT-03] Build: `src/utils/build.ts` llama a `construirApp` del kit desde la URL del pin (`dist/cdn/build/construir-app.ts`). `src/js/<x>.ts` → `dist/cdn/js/<x>.min.mjs`, `view/<v>/<x>.ts` → `dist/cdn/view/<v>/<x>.min.mjs`; las raíces (tags, páginas) en un build con splitting y chunks en `dist/cdn/_chunks/`, el resto suelto y autónomo; `js/boot.ts` → `dist/cdn/boot.js` (IIFE). `import css from 'iswc:css'` incrusta el `.css` compilado del `.scss` hermano (`.tmp-scss/`); los imports del kit (`@jeff-aporta/iswc-base/…`) se reescriben a la URL del pin.
- [HS-PLAT-04] Cache busting `?v=<6 caracteres del hash de contenido>` solo en origen mutable y nunca dentro de un `.mjs`; `dist/cdn/asset-hashes.json`, `dist/cdn/deps.json` (cierre por tag); `dist/cdn/__PREFIJO__Loader.min.mjs` llama `L.registerApp({tag: { href, type: 'module' }}, { installSheets: false })` y, con la primera interacción, `L.configure({ deps })` desde `__PREFIJO__Loader.deps.json`; `dist/cdn/build-stamp.json`.
- [HS-PLAT-05] Pin único: `https://cdn.jsdelivr.net/gh/__REPO__@<sha40>/dist/cdn/core/loader.min.mjs` (`src/js/iswc.ts`), el mismo SHA en el alias `@jeff-aporta/iswc-base/` de `deno.json` y del import map de cada HTML. Prohibido `@main`, `@latest`, SHA corto, GitHub Pages o ramas en raw. `deno task pin` audita; `--nuevo=<sha40|ultimo>` actualiza tras verificar en jsDelivr (y vendoriza `src/vendor/iswc-base/deps.json` del SHA nuevo); luego `deno task vendor:iswc` al mismo SHA.
- [HS-PLAT-06] Arranque de cada HTML: `boot.js` → `styles/app.css` → bloque `iswc:precarga` (lo escribe el build: import map con el alias y `zod` del pin, `modulepreload` del cierre de `SHELL_CRITICO` según `deps.json` y del cierre propio de la app, `is-base.min.css` y `palettes.min.css` sin bloquear, loader del kit `.min.mjs` y `__PREFIJO__Loader.min.mjs`) → `L.load(...KIT_TAGS, ...tagsArranque())` → `data-app-ready`.

## 5. Casos borde y errores

- [W-PLAT-08] Loader del kit ausente (CDN caído): el registrador lanza un error claro y el watchdog revela la página.
- [W-PLAT-09] Pin del kit no publicado en jsDelivr: el cambio de pin se rechaza sin tocar archivos.

## 6. Pruebas (WHAT / HOW WEAK)

- [W-PLAT-10] Tras el build existen `boot.js`, `__PREFIJO__Loader.min.mjs`, `deps.json`, `asset-hashes.json`, `build-stamp.json` y `_chunks/`.
- [W-PLAT-11] Un solo SHA de 40 hex del kit en todo HTML/TS y cero referencias mutables (`deno task pin` en exit 0).
- [W-PLAT-12] E2E: la página arranca sin errores de consola y queda marcada como lista.

## 7. Notas

Sin notas.

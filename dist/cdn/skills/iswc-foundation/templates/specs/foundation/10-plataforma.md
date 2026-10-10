# 10 — Plataforma, build y pines

> Alcance: qué es __TITULO__, cómo arranca la página, las tareas de Deno, el build a `dist/cdn/` y los
> pines del kit. Fuera: el comportamiento de cada vista (specs `30+`) y las pruebas (spec `70`).

## 1. Propósito (WHAT)

__TITULO__ es una aplicación estática (HTML + módulos ES servidos tal cual, sin framework) construida
con el kit iswc-root (`iswc-*`) y componentes propios `__PREFIJO__-*`.

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
- [HS-PLAT-03] Build: `src/js/<x>.ts` → `dist/cdn/js/<x>.js`, `view/<v>/<x>.ts` → `dist/cdn/view/<v>/<x>.js` (sin bundle); bundles solo para `js/base/zod.ts` y los barriles `all.ts`; `js/boot.ts` → `dist/cdn/boot.js` (IIFE). Hojas `.scss` → `.css` hermana del módulo.
- [HS-PLAT-04] Cache busting `?v=<6 caracteres del hash de contenido>` con `stampDirectory` del kit; `dist/cdn/asset-hashes.json`; `dist/cdn/__PREFIJO__Loader.min.js` llama `L.registerApp({tag: url?v=…}, { installSheets: false })`; `dist/cdn/build-stamp.json`.
- [HS-PLAT-05] Pin único: `https://cdn.jsdelivr.net/gh/__REPO__@<sha40>/dist/cdn/core/loader.min.js` (`src/js/iswc.ts`). Prohibido `@main`, `@latest`, SHA corto, GitHub Pages o ramas en raw. `deno task pin` audita; `--nuevo=<sha40|ultimo>` actualiza tras verificar en jsDelivr; luego `deno task vendor:iswc` al mismo SHA.
- [HS-PLAT-06] Arranque de `index.html`: `boot.js` → `styles/app.css` → loader del kit → `__PREFIJO__Loader.min.js` → `L.loadPageStyles(['iswc-palettes-default'])` + `L.load(...KIT_TAGS, ...tagsArranque())` → `data-app-ready`.

## 5. Casos borde y errores

- [W-PLAT-08] Loader del kit ausente (CDN caído): el registrador lanza un error claro y el watchdog revela la página.
- [W-PLAT-09] Pin del kit no publicado en jsDelivr: el cambio de pin se rechaza sin tocar archivos.

## 6. Pruebas (WHAT / HOW WEAK)

- [W-PLAT-10] Tras el build existen `boot.js`, `__PREFIJO__Loader.min.js`, `asset-hashes.json`, `build-stamp.json` y `all.min.js`.
- [W-PLAT-11] Un solo SHA de 40 hex del kit en todo HTML/TS y cero referencias mutables (`deno task pin` en exit 0).
- [W-PLAT-12] E2E: la página arranca sin errores de consola y queda marcada como lista.

## 7. Notas

Sin notas.

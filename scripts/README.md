# scripts — las herramientas del repo

Lo que construye, mide, sirve y vigila el kit. Ninguna de estas herramientas se publica.

## Construir

- `build.mjs` — el build: alias, bundles, hojas, sellos y el `dist/`.
- `build-scss.mjs` — el SCSS a CSS (Dart Sass).
- `bundle-scripts.mjs` — los bundles de la galeria (paginas, fichas, scripts).
- `build-classic.mjs`, `build-lote.mjs`, `build-online.mjs` — las otras salidas.
- `gen-palettes.mjs` — genera `src/styles/palettes.scss`.
- `indice-md.mjs` — genera `INDICE.md`.
- `readmes-componentes.mjs` — genera el README de cada categoria de componentes.

## Medir y servir

- `medir-carga.mjs` — la cascada de carga de una pagina en Edge headless (`deno task medir`).
- `serve.mjs`, `serve-demos.mjs` — servidores locales.
- `typecheck.mjs` — el typecheck con su linea base.

## Sondas

- `sondas/css-equivalente.mjs` — comprueba que el SCSS compila al mismo CSS (`deno task css:equivalente`).
- `sondas/eventos.ts` — el barrido de eventos pendientes.
- `sondas/ux-audit.ts` — la auditoria de UX.
- `sondas/sync-skill-catalog.mjs` — sincroniza el catalogo de skills.

## Reglas

- Cada script tiene su tarea en `deno.json` (o se cita en un md): si no, el guardián de codigo
  muerto lo marca.
- Un script no imprime secretos ni escribe rutas absolutas.
- Nada de `git add -A` ni de reescribir historia desde un script.

# Constraints — IS Web Components

Errores ya pagados. Detalle: `AGENTS.md` (carta, errores #24–#46, entorno local).

## Proceso

- No implementar comportamiento nuevo sin spec en `specs/` (o sección en el dominio).
- No cerrar un cambio sin `node tests/run-all.ts` verde (al menos tests sin servidor).
- No aflojar un guardián para “que pase”: se arregla código o spec.
- No commitear `tests/` entero en gitignore — solo `*.tmp`, `coverage/`, `.cache/`.

## E2E (suite Stagehand)

- No importar fuentes `.ts` del kit desde la suite e2e con specifier `.js`:
  usar `.ts` explícito (`'../../system/toons.ts'`). Causa: la suite corre con
  `--experimental-strip-types`, que NO remapea `.js`→`.ts`, y el archivo muere
  con `ERR_MODULE_NOT_FOUND` al cargar (mató `01-is-code`, AGENTS #46).
- No re-escribir `.ts`/`.html` con literales acentuados desde PowerShell
  (`Set-Content`, redirección `>` u `Out-File` sin `-Encoding utf8`): re-encoda
  y corrompe UTF-8 (`ó`→`Ã³`); editar desde Node `writeFileSync(p, s, 'utf8')`
  o la herramienta de edición. Causa: literales del nav en `00-arranque` y el
  harness HTML de PatyIA quedaron con mojibake (AGENTS #45).

## Repo y paths

- No recrear carpetas de fuente en la raíz (`components/`, `styles/`, …).
- No mezclar profundidades en previews: styles/components `../../`, scripts/dist `../../../` desde categoría.
- No usar `&&` encadenado en PowerShell; usar `;` o script `.mjs`.

## Galería y URL

- No query params sueltos (`?docs=`, `?theme=`). Estado en **solo** `?s=<b64url JSON>`.
- No `await load('all')` en boot de galería; deps on-demand.
- No asignar `.preview` como own-property antes del upgrade del CE.

## CDN e iconos

- No emitir ni documentar `all.min.js` / bundles de categoría.
- No usar `<iconify-icon>` en light DOM del consumidor.
- No cargar SVG de icono como `<img>` (rompe `currentColor`).
- No commitear las 231 colecciones Iconify (~723 MB). Default: `mdi` + `tabler`.

## Componentes

- No inventar valores de enum no declarados en el `.js` / MD del tag.
- No hardcodear `color-scheme` en `:root` ni default de paleta `insoft` (producto = `contapyme`).
- No presentar `marks-*`, engines internos ni `_shared/*` como custom elements públicos.

## Documentación

- No duplicar la carta de leyes en cada `*.md` de tag — enlazar `AGENTS.md` / categoría.
- No borrar secciones obligatorias de `AGENTS.md` (vigila `tests/llm-contract.test.ts`).

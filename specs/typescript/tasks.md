# Tareas — TypeScript

Estado de la migración a `.ts` y lo que queda. Se actualiza al cerrar cada
tanda, para que quien retome no tenga que volver a medirlo.

## Hecho

- [x] `src/` completo en TypeScript: 393 ficheros, **0 `.js` y 0 `.mjs`**.
- [x] `tests/` (80) y `scripts/` (24) pasados a `.ts`. `npm test` corre sin
      compilar, con `--import ./scripts/ts-resolve-hook.ts`.
- [x] Especificadores de import unificados en `.js` (S-TS2). Eran 816 en `.js`
      contra 76 que se habían pasado a `.ts` durante la migración.
- [x] Convenciones escritas en [`spec.md`](spec.md) e indexadas en el RAG.
- [x] Siete herramientas de migración en `scripts/` (S-TS8), con
      `ts-descartes.json` para que inferencia y reversión converjan.
- [x] Contratos tipados de verdad: `_shared/grid-types.ts` y
      `data/datagrid-core/types.ts` (este último tenía el modelo completo en
      JSDoc y ninguna declaración real).

## Pendiente

**Errores de `tsc`: 10 033.** Sintaxis limpia (0 errores de parseo), así que
todos son de tipo y ninguno impide ejecutar: Node y esbuild borran los tipos sin
consultarlos.

Lo automatizable ya se automatizó — los siete scripts convergen y una pasada más
no baja el número. Lo que queda son decisiones de una en una, y se abaratan
mucho atacando primero los ficheros que gobiernan a los demás, como ya pasó con
`datagrid-core/types.ts`: declarar ahí los tipos quitó 182 errores de golpe en
diez ficheros.

Por concentración:

| Fichero | Errores |
|---|---|
| `components/data/data-grid.ts` | 534 |
| `components/data/ag-grid.ts` | 328 |
| `components/diagrams/component-pack.ts` | 266 |
| `previews/behaviors/icon-explorer.ts` | 218 |
| `previews/behaviors/is-data-grid.ts` | 210 |
| `components/diagrams/component-spec.ts` | 177 |

En `datagrid-core/` quedan 70, repartidos entre `pipeline-grouping` (25),
`pipeline-filtering` (16) y `selection` (11); los contratos (`types.ts`,
`grid-model.ts`, `column-groups.ts`, `server-datasource.ts`) ya están cerrados.

Por causa:

| Código | Cuántos | Qué pide |
|---|---|---|
| TS7006 | 3 599 | parámetro sin tipo; casi siempre hay que tipar antes su origen |
| TS2339 | 3 249 | propiedad inexistente: `never[]` de un `= []`, o `{}` de un `opts = {}` |
| TS2531 / TS18047 | 1 320 | nulos reales, no del shadow propio |

## Otros proyectos

Las convenciones de [`spec.md`](spec.md) valen para todo el monorepo, no solo
para este proyecto.

- [x] **`isc-swagger` entero**, el 1-sep-2026: `src/` (2), `tests/` (17),
      `docs/` (4) y su `build.mjs`. No le queda un `.js` escrito a mano; los
      cuatro de `docs/` los genera ahora el build junto al fuente, para no tocar
      ninguna URL del sitio. Ampliar `tsconfig.cdn.json` a todo `src/` destapó
      cuatro errores reales que el `any` tapaba. Build verde y 202 tests en
      verde; le quedan 232 errores de `tsc`, todos en sus tests y casi todos
      fixtures contra el tipo declarado.
      Detalle en `../../../isc-swagger/TAREAS-TS.md`.

## Otros pendientes

- [ ] `scripts/build.mjs` y `scripts/serve.mjs` siguen en `.mjs`: los edita otro
      agente. Convertirlos es un `mv` más tres referencias.
- [ ] `build.mjs` lleva un cambio de una línea (`src/cdn/loader.js` →
      `loader.ts`) hecho desde fuera; si una edición suya lo pisa, es esa línea.
- [ ] 6 tests en rojo, **todos anteriores a la migración** (`cdn-icons` e
      `icon-render` necesitan el servidor de desarrollo en el 8391). La suite
      quedó mejor que como estaba: 223 verdes frente a los 218 de partida.

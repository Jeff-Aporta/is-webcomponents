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

**Errores de `tsc`: 9 475.** Sintaxis limpia (0 errores de parseo), así que
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
| `components/data/ag-grid.ts` | 208 |
| `components/diagrams/component-pack.ts` | 157 |
| `previews/behaviors/icon-explorer.ts` | 218 |
| `previews/behaviors/is-data-grid.ts` | 210 |
| `components/diagrams/component-spec.ts` | 103 |

**`datagrid-core/` está en cero** (eran 205). Tipar sus contratos destapó tres
mentiras que el `any` sostenía:

- `toggleRowSelection` declaraba `keyof typeof SelectionMode` —`'NONE'`,
  `'SINGLE'`— mientras el cuerpo comparaba contra los *valores* (`'none'`).
  Quien se fiara del tipo pasaba `'NONE'` y la selección seguía activa sin
  error.
- `ColumnDef.type` no admitía `currency` ni `dateTime`, que el motor sí trata
  por paridad con ISP: dos ramas de `defaultFilterFor` eran inalcanzables.
- `toTime(v: string)` cuando el cuerpo hace `v instanceof Date`.

También estaban rotos los `import('../types.js')` de los tres `pipeline-*`:
apuntaban a `data/types.js`, que no existe (el módulo es hermano, no del padre).

Dos arreglos de una línea con mucho alcance:

- `ag-grid.ts` declaraba `#api = null`, lo que deja el campo en `never` y hace
  desaparecer los 40 métodos del motor. Tiparlo quitó **120 errores**.
- Los 52 componentes que sobrescriben `onAttributeChanged` repetían la firma sin
  anotar, perdiendo la que `ElementBase` ya declara. Restaurarla quitó **280**.

Los diagramas de componentes no tenían **ningún** tipo declarado: `component-pack`
y `component-spec` se pasaban cajas, paquetes y aristas sin que nadie hubiera
escrito qué son. `_shared/diagram-tipos.ts` recoge esas formas —sacadas de cómo
se usan, no de una API ideal—: `component-pack` 266 → 157 y `component-spec`
177 → 103.

Escribir el contrato es la parte fácil; la útil es que el compilador te corrija.
`sourceSides` estaba declarado como lista y el lector lo produce con `asRecord`,
o sea un mapa. Lo dijo `tsc` en la primera pasada.

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

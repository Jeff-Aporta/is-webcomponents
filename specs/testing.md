# Spec — Testing y gate

Guardianes en `src/utils/health/**/*.test.ts`. El runner es `deno test` (los ficheros siguen en `node:test`, que Deno ejecuta).

## Contexto

Todo el kit es TypeScript (ver [typescript/spec.md](typescript/spec.md)), pero no hay Vitest ni build de tests: guardianes que leen el árbol y fallan con exit ≠ 0. Deno los ejecuta directo con `deno test -A --no-check`. El typecheck aparte es `deno task typecheck`.

## S-T1 Ubicación

- Gate (`deno task test`): las carpetas que lista `src/utils/testing/run-unit.ts` (`src/utils/health/{meta,diagrams,audit}`).
- `src/utils/testing/**` guarda suites de dominio y e2e que se corren aparte, siempre con cooldown (S-T7): `test:e2e` y `deno run -A --no-check src/utils/testing/run-all.ts`.
- Categorías: `meta/` (estructura), `diagrams/` (diagramas específicos), `domain/` (componentes individuales), `audit/` (motor auditor).
- Selfchecks junto al módulo: `src/components/_shared/*.selfcheck.ts` (opcionales, no sustituyen guardianes de repo).

## S-T2 Runner

```bash
# Sin servidor (default)
deno task test                  # ejecuta meta/diagrams/domain/audit

# Con servidor (e2e)
deno task test:e2e          # necesita serve-demos.mjs corriendo

# Gate completo (lo que el workflow corre)
deno task test:all          # typecheck + test + audit
deno task test:all:e2e      # test:all + test:e2e
```

`sloppy-imports` en `deno.json` resuelve imports `.js` → `.ts` sin build pipeline.

## S-T3 Escribir un guardián

- Cabecera: qué verifica y comando de uso.
- Exit 0 + `# pass N` al final (formato `node:test`).
- Sin snapshots binarios pesados.
- Citar el guardián en `constraints.md`/`lessons.md` (carta o testing) y en el spec del dominio.

## S-T4 Meta-spec SDD

La estructura de `specs/` se valida con `src/utils/health/meta/specs-sdd.test.ts`:

- Archivos obligatorios (`README`, `flujo-sdd`, `constitution`, `constraints`, plantillas, adr, lessons).
- Sin `spec-*.md` sueltos en raíz de `specs/`.
- Enlaces relativos en markdown resuelven.
- Cada dominio con `spec.md` aparece en el mapa del README.
- Cada dominio cita al menos un `*.test.ts` existente.

## S-T5 Antes de declarar listo

1. Guardián nuevo en verde.
2. `deno task test` verde (mínimo sin servidor).
3. Si tocó la carta (constraints/lessons): `src/utils/testing/meta/llm-contract.test.ts` *(migrar el test a los specs consolidados)*.
4. Si tocó `specs/`: `src/utils/health/meta/specs-sdd.test.ts`.

## S-T6 Guardianes de caja negra (WHAT, no HOW)

Un guardián verifica el **WHAT** del spec, no la implementación. Entra por la **API pública**
(función exportada, CLI, HTTP, DOM del componente, SVG emitido) y afirma sobre lo **observable**.
Prueba de fuego: **si un refactor que respeta el WHAT rompe el guardián, el guardián está mal escrito.**

### S-T6.1 Reglas de oro

1. **Una sola puerta.** El test importa solo lo público (`mod.ts`, entrypoint del CLI, URL, tag del
   componente). Nunca utilidades privadas ni rutas profundas de `src/**`.
2. **Afirma sobre la salida, no sobre el cómo.** Valor devuelto, efecto observable, XML/SVG, DOM
   renderizado, exit code, cabecera HTTP. No asserts sobre nombres de funciones internas ni sobre el
   orden de las llamadas.
3. **Nombra el requisito.** Cabecera del test: `S-X#: <frase del spec>`. Sin `S-X#` el caso no
   pertenece a ningún contrato: o se crea la regla en el spec, o se borra el test.
4. **Cero dependencia de rutas/archivos internos**, salvo que el spec declare esa ruta como contrato
   (HOW fuerte) y el test lo cite.
5. **Sin snapshots de código.** No congeles el fuente, el AST, la lista de imports ni un `git diff`.
   Congela el **artefacto observable** (SVG, JSON de salida, HTML renderizado, respuesta HTTP).
6. **Falla por el síntoma.** El mensaje dice qué se esperaba y qué salió; no "assertion failed".

### S-T6.2 Qué se prueba en cada tipo

| Qué se prueba | Cómo (puerta pública) |
|---|---|
| Lógica pura (layout, parsers, libs) | llamar la función exportada y afirmar sobre su salida |
| E2E de un servicio o parches SQL | el test habla con el servicio como un consumidor y verifica el estado por la misma vía |
| UI/UX (interacción, legibilidad) | Stagehand sobre la página real (`tests/*.stagehand.test.mjs`) |
| Render de diagramas | SVG exportado (XML válido, sin texto fuera de su caja), no el código del pintor |
| Contratos de estructura | solo los congelados por constitution/constraints como HOW fuerte, citándolos |

### S-T6.3 Señales de que un test es HOW (revisar y reescribir)

- Importa algo de `src/**` que no es un entrypoint público.
- Afirma sobre `readFileSync(...).includes('...')` de un fuente propio.
- Cuenta archivos, líneas, imports o exports para deducir comportamiento.
- Pasa solo si el código está escrito de una forma concreta, aunque el comportamiento sea correcto.
- Su nombre describe una función ("valida que paintOne use…") en vez de un requisito.

### S-T6.4 Excepción admitida: guardianes de gobernanza

Los que vigilan **arquitectura congelada** (layout de `src/`, CDN sin bundles sueltos, sin CSS en
`src/`) son HOW fuerte **por definición**: la constitution los fija. Deben:

- estar listados en `constraints.md` o en este spec;
- decir en su cabecera qué artículo de la constitution aplican;
- limitar el assert a lo congelado (nada de "y además el archivo mide X líneas").

Ideas de casos: `/deep-test-proposals`. Un caso que solo se explica leyendo el código es HOW; si es
contrato estricto, va como HOW fuerte en el spec y su guardián lo cita.


## S-T7 Toda prueba corre dentro del cooldown

**WHAT.** Ninguna prueba del kit se ejecuta por fuera del sistema de cooldown
(`src/vendor-distributions/shared/testing/test-cooldown.ts`):

- Cada tarea `test*` de `deno.json` es composición de otras tareas o lanza un runner que entra al cooldown
  (`deno-test.ts`, `pruebas.ts` o `test-cooldown.ts` directo); ninguna corre `deno test` suelto.
- Ningún script del kit lanza `deno test`/`node --test` sin pasar por el cooldown.
- Un archivo verde no se repite durante duración × 1440; uno rojo no entra en cooldown (queda `until: -1`) y corre
  en la siguiente corrida; `--sin-cooldown`/`TEST_COOLDOWN=0` corre todo y no registra.
- Rojo a la primera: se reintenta una vez de a uno (`TEST_REINTENTOS`); si pasa, la corrida es verde y el archivo
  entra en cooldown. Así un fallo de infraestructura (dos Chromium lanzados a la vez desde Deno en Windows,
  `os error 6`) no tumba el gate, y un fallo real falla las dos veces.

**HOW débil.** `deno task test` (`run-unit.ts`), `test:e2e` (`e2e/run.ts`), `run-all.ts` de `src/utils/testing/` y el
exhaustivo usan `denoTest`; `test:demos` usa `runQueue` + `cooldown.run`; `test:foundation` registra la sonda completa
con el id `skills/iswc-foundation/tools/probar-foundation.ts::*`.

Guardián: [`tests/gobernanza/cooldown-guardian.test.ts`](../tests/gobernanza/cooldown-guardian.test.ts) (C1-C4).

### Lluvia de casos (2026-10-13)

| Caso propuesto | Estado | Motivo / guardián |
|---|---|---|
| Cada tarea `test*` entra al cooldown o compone otras | Implementado | C1 (encontró `test:foundation` fuera; ahora registra) |
| Ningún script lanza `deno test` por fuera | Implementado | C2 (encontró `run-all.ts`, `exhaustive/run-all-tests.mjs`, `exhaustive/count.mjs` y `probes/diag-failures.mjs`: los dos primeros pasan por `denoTest`, los dos últimos eran código muerto y se borraron) |
| Verde → cooldown; rojo → corre otra vez; sin cooldown → todo y sin registro | Implementado | C3 (caja negra con archivos temporales) |
| Rojo intermitente → reintento verde; rojo persistente → rojo con `until: -1` | Implementado | C4 |
| Una tarea compone una tarea inexistente | Implementado | C1 |
| Las suites de `src/utils/testing/` (meta/domain/diagrams) entran al gate | Descartado | hoy se corren aparte (`run-all.ts`, con cooldown); 66 de sus casos están en rojo desde antes y no son parte del gate: migrarlas es una tarea propia |
| El cooldown de una prueba cuyo archivo cambió se invalida solo | Descartado | decisión de Jeff: el cooldown es por tiempo; si hay que probarlo ya se pone `until: -1` a mano o `--sin-cooldown` |
| `test:foundation` con id por SHA del pin | Descartado | el id fijo es predecible; un pin nuevo se prueba con `--sin-cooldown` |

## Contratos

| Pieza | Contrato |
|---|---|
| Runner | `deno test -A --no-check src/utils/health/**/*.test.ts` |
| Gate completo | `deno task test:all` (typecheck + test + audit) |
| Cooldown | `src/utils/health/meta/cooldown-guardian.test.ts` |
| Meta SDD | `src/utils/health/meta/specs-sdd.test.ts` |
| Carta | `src/utils/testing/meta/llm-contract.test.ts` |
| Auditor motor | `src/utils/health/audit/motor.test.ts` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Suite sin servidor | todos exit 0 | `deno task test` |
| Gate completo | 🛑 0   🔴 0   🟡 0 | `deno task test:all` |
| Estructura specs | mapa + links + citas tests | `src/utils/health/meta/specs-sdd.test.ts` |
| LLM contractual | secciones + guardianes en disco | `src/utils/testing/meta/llm-contract.test.ts` |

## Guardianes recientes contra regresiones

- **observed-attrs-ts-type-annotation** (2026-09-18): 3 tests en `motor.test.ts` que verifican `extraerMetaComponente` extrae correctamente atributos de `const X: TYPE = [...]` con type annotation TS. Cubrió bug latente que reportaba 9 falsos 🟡 en `masked-input`, `inline-edit`, `mention`.

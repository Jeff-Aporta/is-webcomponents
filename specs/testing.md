# Spec — Testing y gate

Guardianes en `src/utils/health/**/*.test.ts`. El runner es `deno test` (los ficheros siguen en `node:test`, que Deno ejecuta).

## Contexto

Todo el kit es TypeScript (ver [typescript/spec.md](typescript/spec.md)), pero no hay Vitest ni build de tests: guardianes que leen el árbol y fallan con exit ≠ 0. Deno los ejecuta directo con `deno test -A --no-check`. El typecheck aparte es `deno task typecheck`.

## S-T1 Ubicación

- **Únicamente** `src/utils/health/**/*.test.ts` (commiteados).
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
3. Si tocó la carta (constraints/lessons): `src/utils/health/meta/llm-contract.test.ts` *(migrar el test a los specs consolidados)*.
4. Si tocó `specs/`: `src/utils/health/meta/specs-sdd.test.ts`.

## Contratos

| Pieza | Contrato |
|---|---|
| Runner | `deno test -A --no-check src/utils/health/**/*.test.ts` |
| Gate completo | `deno task test:all` (typecheck + test + audit) |
| Meta SDD | `src/utils/health/meta/specs-sdd.test.ts` |
| Carta | `src/utils/health/meta/llm-contract.test.ts` |
| Auditor motor | `src/utils/health/audit/motor.test.ts` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Suite sin servidor | todos exit 0 | `deno task test` |
| Gate completo | 🛑 0   🔴 0   🟡 0 | `deno task test:all` |
| Estructura specs | mapa + links + citas tests | `src/utils/health/meta/specs-sdd.test.ts` |
| LLM contractual | secciones + guardianes en disco | `src/utils/health/meta/llm-contract.test.ts` |

## Guardianes recientes contra regresiones

- **observed-attrs-ts-type-annotation** (2026-09-18): 3 tests en `motor.test.ts` que verifican `extraerMetaComponente` extrae correctamente atributos de `const X: TYPE = [...]` con type annotation TS. Cubrió bug latente que reportaba 9 falsos 🟡 en `masked-input`, `inline-edit`, `mention`.

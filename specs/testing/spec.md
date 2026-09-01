# Spec — Testing y gate

Guardianes en `tests/*.test.ts` y runner local.

## Contexto

Todo el kit es TypeScript (ver [typescript/spec.md](../typescript/spec.md)), pero no hay Vitest ni build de tests: guardianes en Node que leen el árbol y fallan con exit ≠ 0. Node 22 borra los tipos al cargar, así que `.test.ts` se ejecuta directo.

## S-T1 Ubicación

- **Únicamente** `tests/*.test.ts` (commiteados).
- Selfchecks junto al módulo: `src/components/_shared/*.selfcheck.ts` (opcionales, no sustituyen guardianes de repo).
- `.gitignore` ignora `tests/*.tmp`, `coverage/`, `.cache/` — **no** el directorio entero.

## S-T2 Runner

```bash
# Sin servidor (default)
node tests/run-all.ts

# Con servidor (cdn-icons y similares)
node scripts/serve.mjs   # terminal A, puerto 8391
PORT=8391 node tests/run-all.ts   # terminal B
```

`run-all.ts` ejecuta cada `*.test.ts` en subproceso; `NEEDS_SERVER` lista los que hacen fetch a localhost.

## S-T3 Escribir un guardián

- Cabecera: qué verifica y comando de uso.
- Exit 0 + línea `PASS` al final.
- Sin snapshots binarios pesados en `tests/`.
- Citar el guardián en `AGENTS.md` (carta o testing) y en el spec del dominio.

## S-T4 Meta-spec SDD

La estructura de `specs/` se valida con `tests/specs-sdd.test.ts`:

- Archivos obligatorios (`README`, `flujo-sdd`, `constitution`, `constraints`, plantillas, adr, lessons).
- Sin `spec-*.md` sueltos en raíz de `specs/`.
- Enlaces relativos en markdown resuelven.
- Cada dominio con `spec.md` aparece en el mapa del README.
- Cada dominio cita al menos un `tests/*.test.mjs` existente.

## S-T5 Antes de declarar listo

1. Guardián nuevo en verde.
2. `node tests/run-all.ts` verde (mínimo sin servidor).
3. Si tocó `AGENTS.md`: `tests/llm-contract.test.ts`.
4. Si tocó `specs/`: `tests/specs-sdd.test.ts`.

## Contratos

| Pieza | Contrato |
|---|---|
| Runner | `tests/run-all.ts` |
| Meta SDD | `tests/specs-sdd.test.ts` |
| Carta | `tests/llm-contract.test.ts` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Suite sin servidor | todos exit 0 | `node tests/run-all.ts` |
| Estructura specs | mapa + links + citas tests | `tests/specs-sdd.test.ts` |
| LLM contractual | secciones + guardianes en disco | `tests/llm-contract.test.ts` |

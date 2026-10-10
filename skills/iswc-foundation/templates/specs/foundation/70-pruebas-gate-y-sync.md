# 70 — Pruebas, gate y sync

> Alcance: el sistema común de pruebas del kit, la batería `test:all` y el sync al entregable.
> Cómo se escriben specs y pruebas: [`../especificar-what.md`](../especificar-what.md).

## 1. Propósito (WHAT)

Ningún cambio llega al entregable sin la batería COMPLETA en verde. Las pruebas son la especificación
ejecutable: si `src/` y `view/` se reconstruyen, el catálogo de la sección 6 dice qué debe seguir siendo verdad.

## 2. Requisitos WHAT

- [W-GATE-01] Una orden «probar todo» corre build, typecheck, pines, pruebas de salud y e2e; por defecto corre todo y sale con el peor código; existe una variante que corta en el primer rojo.
- [W-GATE-02] Una prueba en verde reciente no se repite durante un tiempo proporcional a lo que tardó (x600); un rojo se repite siempre.
- [W-GATE-03] El build se repite aunque esté en cooldown si cambió cualquiera de sus entradas.
- [W-SYNC-01] La única vía para actualizar el entregable es el sync, y su única autorización es el gate en verde (sin bypass).
- [W-SYNC-02] Viajan solo artefactos de la app (código publicable, build, HTML, vistas sin demos ni e2e, README); nunca pruebas ni specs.

## 3. Guía HOW WEAK

- [HW-GATE-01] Caja negra: la UI con Stagehand determinista; API y datos con los controladores de cliente; guardianes de estructura declarados como tales.

## 4. Contratos HOW STRONG

- [HS-PRU-01] Tools vendorizadas del kit en `src/vendor/iswc-root/tools/` (`pruebas`, `test-cooldown`, `sync-entregable`, `pin-update`), al SHA del pin.
- [HS-PRU-02] Pruebas en `tests/<area>/*.test.ts`, cada archivo `export default definirPruebas([...])`; `nombre` único (incluye el `[W-*]`), `categoria: 'what'|'how'`.
- [HS-PRU-03] `test:all` = `scripts/gate/run-test-all.mjs` (build → check → pin → test:health → test:e2e) con `gate-cooldown.mjs` (huella de entradas en `.tmp/gate-huellas.json`).
- [HS-PRU-04] E2E: `scripts/gate/e2e/run.ts` (autoservidor 8851+, reusa uno vivo) + `harness.ts` (Stagehand 4.1, atraviesa shadow roots, sin LLM en el gate).
- [HS-SYNC-01] `deno task sync:entregable` (`--check` drift, `--dry-run` plan) sobre `ISSyncEntregable.ts`; gate `sync-protocolo.mjs`; checkpoint commit+push del mirror; el entregable nunca recibe commits automáticos.

## 5. Casos borde y errores

- [W-GATE-04] Un archivo de pruebas que no carga o no exporta su lista es rojo; un id repetido aborta antes de correr nada.

## 6. Pruebas (WHAT / HOW WEAK)

- [W-GATE-05] Cada `[W-*]` de las specs fundación tiene al menos una prueba que lo nombra.

## 7. Notas

La app recién creada trae los casos base: `tests/e2e/00.bienvenida` (Stagehand determinista),
`tests/e2e/01.bienvenida-llm` (mismo flujo con `act()` de MiniMax; se salta sin `dev-token.json`) y
`tests/vistas/bienvenida` (dominio). Cada requisito nuevo suma su prueba con el mismo formato.

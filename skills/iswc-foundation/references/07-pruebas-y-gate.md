# 07 — Pruebas, Stagehand y gate

Cómo se escriben specs y pruebas WHAT: [especificar-what.md](../templates/specs/especificar-what.md).

## Sistema común del kit (`tools/pruebas.ts`)

- Todas las pruebas en `tests/<area>/*.test.ts`; cada archivo `export default definirPruebas([...], hooks?)`.
- Prueba: `{ nombre (id único, incluye su [W-*]), categoria: 'what'|'how', correr(ctx), timeoutMs?, nivel?: 'error'|'aviso', saltar? }`.
- `ctx`: `expect(etiqueta, ok, detalle?)`, `eq(etiqueta, actual, esperado)`, `aviso`, `diag`, `saltar(motivo)`, `signal`.
- Corren una por una; un id repetido aborta antes de correr; un archivo que no carga es rojo.
- **Cooldown x600**: verde de 1 min → 10 h sin repetirse; rojo corre siempre. `TEST_COOLDOWN=0` o
  `--sin-cooldown` solo para diagnóstico (nunca en el sync). Memoria en `.tmp/`.

## Capas (caja negra)

| Qué | Cómo |
| --- | --- |
| Dominio puro (`utils/`, `core/`, `dominio/`) | importar el módulo **publicado** (`dist/cdn/…`) |
| API / datos sin UI | controladores de cliente de la app (fachada tipada), nunca `fetch` a mano |
| UI | Stagehand determinista: `scripts/gate/e2e/harness.ts` |
| Estructura (anatomía, pines, tokens) | guardianes de fuente declarados como tales (`categoria: 'how'`) |

## E2E con Stagehand (`scripts/gate/e2e/`)

- `run.ts`: asegura servidor (`servidor.ts`: `E2E_BASE_URL` externa, o puerto 8851+ — reusa uno vivo
  y lo deja vivo; si lo levanta, lo apaga), fija `E2E_BASE_URL` y corre `tests/e2e/*.test.ts`, cada
  archivo en su proceso. `E2E_FILES=a,b` filtra; `E2E_HEADLESS=false` muestra el navegador.
- `harness.ts`: `abrir(ruta)` (lanza Chromium con `localBrowser`, adjunta `Stagehand.create({ browser })`
  sin LLM, espera `data-app-ready`, recoge errores de consola), `enSombra(page, [selectores…], 'text'|'existe'|'click')`
  (atraviesa shadow roots, que el locator de Stagehand no atraviesa), `esperar(page, cond)`.
- Clic en un `iswc-button`: sobre su `<button>` interno (`[…, 'iswc-button', 'button']`).
- `<iswc-preview-component>` pinta en light DOM (`#preview <tag>`), no en un shadow root.
- `act()`/`extract()` (LLM) solo en pruebas exploratorias fuera del gate.

## Gate `deno task test:all` (`scripts/gate/run-test-all.mjs`)

`build` → `check` → `pin` → `test:health` → `test:e2e`. Corre todo y sale con el peor código (resumen
PASS/FAIL por paso); `test:all:halt` corta en el primer rojo. `gate-cooldown.mjs`: los pasos con
entradas (build, check, pin) se repiten si cambió la huella de sus archivos aunque estén en cooldown.
Una app con backend añade su `preflight` (exit 2 = no se pudo probar) antes de la batería.

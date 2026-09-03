# E2E de la galería (Stagehand + MiniMax) — spec consolidada

La información operativa del e2e vive AQUÍ (no hay `README.md` en
`src/utils/health/e2e`). Todo lo demás está en `src/utils/system` (toons,
controles) y `src/utils/health/e2e/` (runner + tests).

## Secretos: SIEMPRE rutas fijas (nunca `.env`)

Los e2e NO usan `.env` ni `.env.example`. Los secretos se leen de archivos fijos:

| Secreto | Ruta fija | Clave |
| --- | --- | --- |
| MiniMax (Stagehand act/extract/observe) | `C:\ContaPyme\Personal\secrets.json` | `Values.MINIMAX_API_KEY_50USD` |

Base URL / modelo / URL de MiniMax no son secretos: quedan como constantes en
`lib/env.ts` (modelo `MiniMax-M3`, endpoint `https://api.minimax.io/v1`).
Solo infraestructura usa entorno: `E2E_PORT`/`E2E_HOST` (servidor controlado con
apagado garantizado), `E2E_HEADLESS` (visible por defecto en terminal),
`E2E_BASE_URL`/`E2E_AUTOSERVE=0` para host externo, `E2E_TAGS`/`E2E_SWEEP`.

## Qué cubre

| Archivo | Cobertura |
| --- | --- |
| `00-arranque.test.ts` | Boot de la galería, deep link por componente, navegación por el nav, consola |
| `01-is-code.test.ts` | Motor nativo de `<is-code>` (sin CodeMirror), editor, marks/tooltips, tema; textos desde toons |
| `02-componentes.test.ts` | Vistas representativas por categoría (contenido real, svg/canvas penetrando shadows) |
| `03-problemas.test.ts` | Barrido detector por vistas (`E2E_SWEEP`): sin console.error, sin rastro CM, sin crashes |
| `04-controles.test.ts` | **Data-driven por tag** sobre el playground JSON: manipula cada control del panel y verifica la reacción del host + documentación `.md` |

## Cómo correr

```bash
cd Personal/apps/is-webcomponents
npm run test:e2e                 # autoservidor E2E_PORT (0=libre) + apagado garantizado
E2E_HEADLESS=false npm run test:e2e   # Chrome visible (default en terminal)
E2E_TAGS=is-button,is-code node --experimental-strip-types --test --test-concurrency=1 src/utils/health/e2e/04-controles.test.ts
```

Requisitos: Node ≥22, `@browserbasehq/stagehand` (devDep), Chromium de Playwright,
y `Personal/secrets.json` con `MINIMAX_API_KEY_50USD`.

## Reglas al editar la suite

- **Imports a fuentes TS del kit con specifier `.ts` explícito**, nunca `.js`:
  la suite corre con `--experimental-strip-types`, que NO remapea `.js`→`.ts`;
  un `from '../../system/toons.js'` mata el archivo al cargar
  (`ERR_MODULE_NOT_FOUND`) aunque `tsc` (moduleResolution bundler) lo acepte.
  Ej. válido: `'../../system/toons.ts'`, `'./lib/harness.ts'`. (AGENTS #46.)
- **Literales con acentos**: editar los `.ts`/`.html` de la suite desde Node
  (`writeFileSync(p, s, 'utf8')`) o la herramienta de edición, NUNCA con
  `Set-Content`/redirección de PowerShell (re-encoda y corrompe UTF-8:
  `ó`→`Ã³`); tras tocar texto, escanear restos (`Ã|Â|â€`). (AGENTS #45.)
- **Correr en paralelo** para depurar dos archivos contra un host externo:
  `E2E_AUTOSERVE=0 E2E_BASE_URL=http://127.0.0.1:8391/index.html node --experimental-strip-types --test --test-concurrency=1 src/utils/health/e2e/00-arranque.test.ts src/utils/health/e2e/01-is-code.test.ts`
- Verificación del gate: `npm run test:e2e` (suite completa) y
  `npm run test` (unit).

## Cómo detecta problemas

- Consola `console.error` por vista; rastro de CodeMirror (DOM + resource entries)
  = 0; patrones de crash en el árbol; evidencias PNG + árbol en
  `src/utils/health/e2e/.artifacts` (gitignored).

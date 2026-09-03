# E2E con Stagehand — galería is-webcomponents

Pruebas de extremo a extremo de la galería de web components (`Personal/apps/is-webcomponents`) usando **Stagehand** (`@browserbasehq/stagehand`), la biblioteca de IA para navegación: con lenguaje natural la IA entiende la página y ejecuta `act`, `extract` y `observe` sobre un navegador real. El modelo es **MiniMax-M3** (misma cuenta que el auditor RAG).

> Port del esquema de `PatyIA/app/src/utils/health/e2e` (el "ataque en las APIs"): misma estructura de archivos, mismo patrón `node:test` + Stagehand + MiniMax, mismas evidencias (PNG + árbol de accesibilidad). Sin login ni ISS: aquí el "estado" es el **tag del componente** (`?s={component:…}`).

## Qué se prueba

| Archivo | Cobertura |
| --- | --- |
| `00-arranque.test.ts` | La galería sin estado monta el catálogo (categorías + nav); deep link `?s=` a un componente abre su docs; navegar por el nav cambia el preview |
| `01-is-code.test.ts` | **Ataque en profundidad a `<is-code>` tras la migración nativa**: cero peticiones a CodeMirror (CDN/runMode/themes) y cero nodos `.CodeMirror`; read-only/inline/editables pintan con el motor nativo (`.ic-*`/`.tok-*`, nada vacío); escribir en el editor editable emite `is-input`/`is-change`/`is-cursor` y repinta; marks nativas con tooltip por caret; tema reactivo a `data-theme`/`is-theme-change` sin recargar CM |
| `02-componentes.test.ts` | Visita representativa por categorías (botones, formularios, iconos, feedback, diagramas, gráficos, layout): cada preview controlado monta contenido real, el custom element está definido y hay instancias/demos; los diagramas/gráficos exigen svg/canvas |
| `03-problemas.test.ts` | **Detector (el ataque)**: barre home + N componentes (`E2E_SWEEP`, 12 por defecto) y falla si hay errores de consola, patrones de peligro en el árbol o peticiones a CodeMirror, con captura por vista |

Por defecto la suite es de **solo lectura**: navega y verifica sin escribir nada. La única "escritura" es teclear en un editor de demo dentro de `01-is-code` (solo en la página del navegador de pruebas).

## Requisitos

1. Node ≥ 22 (el runner usa `--experimental-strip-types`).
2. `npm i -D @browserbasehq/stagehand` (ya en devDeps del repo).
3. Chrome/Chromium instalado (lo lanza `localBrowser` de Stagehand; el mismo que usa Playwright del repo).
4. Key de MiniMax (`MINIMAX_API_KEY`; la canónica es `MINIMAX_API_KEY_50USD` de `Personal/secrets.json` o la config del RAG `C:/ContaPyme/RAG`): solo lectura local, nunca se versiona.

## Puesta en marcha

```bash
cd Personal/apps/is-webcomponents
cp src/utils/health/e2e/.env.example src/utils/health/e2e/.env   # completar MINIMAX_API_KEY
npm run test:e2e                                                  # headless; levanta y apaga su propio servidor
```

Para ver Chrome en pantalla (depurar): `E2E_HEADLESS=false npm run test:e2e`.
Para apuntar a un host ya levantado (`node scripts/serve.mjs 8391`):

```bash
E2E_AUTOSERVE=0 E2E_BASE_URL=http://127.0.0.1:8391/index.html npm run test:e2e
```

Ejecutar un archivo solo:

```bash
node --experimental-strip-types --test --test-concurrency=1 src/utils/health/e2e/00-arranque.test.ts
```

## Variables (`src/utils/health/e2e/.env`, ver `.env.example`)

| Variable | Uso |
| --- | --- |
| `E2E_AUTOSERVE` | `0` apaga el servidor automático y usa `E2E_BASE_URL` |
| `E2E_BASE_URL` | URL de la galería (default: la del autoservidor, `/index.html`) |
| `E2E_HEADLESS` | `false` abre Chrome visible |
| `MINIMAX_API_KEY` | Key MiniMax para `act`/`extract`/`observe` de Stagehand |
| `E2E_MINIMAX_MODEL` | `MiniMax-M3` (fijo, como el auditor) |
| `E2E_SWEEP` | Tags del barrido de `03-problemas` (coma separada; 12 por defecto) |
| `E2E_STRICT` | `1` falla si faltan variables (por defecto los tests se saltan) |
| `E2E_ARTIFACTS` | Evidencias (PNG + árbol): `src/utils/health/e2e/.artifacts` (gitignored) |
| `E2E_SETTLE_MS` / `E2E_TIMEOUT_MS` | Asentamiento por vista y tope de esperas |

## Cómo detecta problemas

- Captura `console.error` del navegador durante cada vista.
- Vigila **la red**: cualquier petición a CodeMirror (CDN/runMode/themes `cm-*`) deja el suite rojo — es la afirmación de que la migración a motor nativo no volvió atrás.
- Patrones de peligro en el árbol de accesibilidad (`TypeError`, `ReferenceError`, `Failed to fetch`, 404/503…).
- `03-problemas.test.ts` recorre las vistas y deja **rojo** el suite con el detalle (vista, texto, captura) mientras haya fallos reales; cuando se corrijan, el mismo test pasa en verde.
- Cada test guarda evidencia PNG + árbol de accesibilidad en `.artifacts/`.

## Notas

- El preview de un componente **controlado** monta en light DOM dentro de `#previewHost` (árbol `is-main > section > is-demo > is-*`); los asserts esperan a `html[data-kit-shell]` y a contenido no vacío en el host.
- Abrir una vista no dispara escrituras; los demos solo reaccionan a interacciones del test.
- Textos con tildes; los asserts usan expresiones tolerantes a acentos.

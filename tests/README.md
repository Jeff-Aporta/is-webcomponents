# Pruebas del kit

Todas las pruebas del kit viven aquí y usan el sistema común que el kit publica para ISS e ISW
(`src/vendor-distributions/shared/testing/pruebas.ts`):

- cada `*.test.ts` exporta por defecto su lista (`definirPruebas`, o `coleccionPruebas(...).lista()`);
- cada prueba tiene un `nombre` único (es su id y la llave de su cooldown), una `categoria`
  (`what` = caja negra, `how` = guardián de implementación) y, si gasta, un `factorCooldown`;
- cooldown por prueba en `.tmp/test-cooldown.json` (1 min en verde = 24 h sin repetir);
- cada archivo corre en su propio proceso.

```bash
deno task test                         # con cooldown
deno task test -- --sin-cooldown       # todo
deno task test -- --categoria=what     # solo caja negra
deno task test -- --solo=hash,vendor   # por id (subcadena)
deno task test:e2e                     # navegador real (Stagehand), aparte
```

El reporte completo de la última corrida queda en `.tmp/tests-reporte.json`.

| Carpeta | Qué guarda | Categoría |
|---|---|---|
| `componentes/` | Contratos y comportamiento de los componentes (sin navegador o con jsdom). | what |
| `diagramas/` | Motores de diagramas: layout, ruteo, specs, render a SVG/PNG. | what |
| `exhaustivo/` | Barrido por componente: archivos, JSON, atributos y estados. | what |
| `navegador/` | Página real con servidor efímero (Playwright/Stagehand). | what |
| `gobernanza/` | Guardianes del repo: estructura, schemas, vendor, docs, build. | how |
| `auditoria/` | El motor de auditoría (`deno task audit`). | how |
| `e2e/` | Recorridos E2E con Stagehand (`deno task test:e2e`). | what |
| `_shared/` | Ayudas de las pruebas (adaptador `Deno.test`, jsdom, fixtures, HTML de apoyo). | — |
| `.audit/` | Runner (`run.ts`), motor de auditoría (`motor/`, `engine/`) y harness E2E (`e2e/`). | — |

Para agregar una prueba: un archivo `tests/<carpeta>/<tema>.test.ts` con

```ts
import { definirPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

export default definirPruebas([
  { nombre: '<tema>: lo que afirma', categoria: 'what', correr({ expect, eq }) { /* … */ } },
]);
```

<!-- @vendor 2026-10-13T13:32:46.844Z Jeff-Aporta/is-webcomponents@local skills/iswc-foundation/references/README.md -->
# Referencias de `iswc-foundation`

Cada archivo documenta un tema del estándar; lo que una app vendoriza del kit (`dist/cdn/vendor-distributions/…`)
apunta aquí con `// @doc <URL jsDelivr por SHA>`.

| Referencia | Tema |
| --- | --- |
| [01-estructura.md](01-estructura.md) | Estructura de carpetas y responsabilidades |
| [02-deno-y-build.md](02-deno-y-build.md) | Deno, tareas y build a `dist/cdn` |
| [03-registro-y-carga.md](03-registro-y-carga.md) | Registro y carga de componentes |
| [04-estilos.md](04-estilos.md) | Estilos SCSS |
| [05-zod-y-tipos.md](05-zod-y-tipos.md) | Zod y tipos (W54) |
| [06-pines-y-vendor.md](06-pines-y-vendor.md) | Pines por SHA y vendor por barrido de cabeceras `@vendor` (código, skills, json…) con perfil server/client (`shared/tools/vendor.ts`, `shared/tools/pin-update.mjs`, hook `scripts/vendor-stamp.mjs`) |
| [07-pruebas-y-gate.md](07-pruebas-y-gate.md) | Sistema común de pruebas (`shared/testing/pruebas.ts`, cooldown, cola) y gate |
| [08-sync-entregable.md](08-sync-entregable.md) | Sync `_experimental` → `_entregable` (`tools/sync-entregable.ts`) |
| [09-alinear-app.md](09-alinear-app.md) | Alinear una app existente al estándar |
| [10-iconos.md](10-iconos.md) | Íconos (`tools/download-iconify.ts`) |
| [11-stagehand.md](11-stagehand.md) | Stagehand compartido: proveedores LLM, generador con fallback, destino por protocolo (`client/testing/stagehand.ts`, `shared/testing/proveedores-llm.ts`) |
| [12-jueces.md](12-jueces.md) | Jueces opcionales de las pruebas: semántica local determinista (`shared/testing/semantica.ts`), JEV y LLM (`shared/testing/jueces.ts`) |
| [13-crear-app.md](13-crear-app.md) | `create-iswc-app` en detalle |
| [14-herramientas-de-test.md](14-herramientas-de-test.md) | Herramientas de test: qué usar y cuándo (guía única para agentes) |

Índice de lo vendorizable: `src/vendor-distributions/README.md` (publicado en `dist/cdn/vendor-distributions/README.md`).

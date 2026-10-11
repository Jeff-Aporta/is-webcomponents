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
| [06-pines-y-vendor.md](06-pines-y-vendor.md) | Pines por SHA y vendor (`tools/vendor.ts`, `tools/pin-update.mjs`) |
| [07-pruebas-y-gate.md](07-pruebas-y-gate.md) | Sistema común de pruebas (`testing/pruebas.ts`, cooldown, cola) y gate |
| [08-sync-entregable.md](08-sync-entregable.md) | Sync `_experimental` → `_entregable` (`tools/sync-entregable.ts`) |
| [09-alinear-app.md](09-alinear-app.md) | Alinear una app existente al estándar |
| [10-iconos.md](10-iconos.md) | Íconos (`tools/download-iconify.ts`) |
| [11-stagehand.md](11-stagehand.md) | Stagehand compartido: proveedores LLM, generador con fallback, destino por protocolo (`testing/stagehand.ts`) |
| [13-crear-app.md](13-crear-app.md) | `create-iswc-app` en detalle |

Índice de lo vendorizable: `src/vendor-distributions/README.md` (publicado en `dist/cdn/vendor-distributions/README.md`).

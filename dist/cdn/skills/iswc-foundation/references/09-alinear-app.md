# 09 — Alinear una app existente al estándar

Para apps anteriores a `create-iswc-app` (ISW-TestPatyIA, iswc-docs…). Referencia viva: genera una app
de prueba con `create-iswc-app` y compara carpeta por carpeta.

| Paso | Qué | Verificación |
| --- | --- | --- |
| 1 | Deno: `deno.json` con los imports de [02](02-deno-y-build.md); fuera `package.json`/npm | `deno task build` |
| 2 | Pin único + vendor `src/vendor/iswc-root/` al mismo SHA | `deno task pin` exit 0 |
| 3 | Layout de [01](01-estructura.md): `src/js/{base,core,dominio,components/<p>,consts/schemas}`, `view/<v>/` | guardián de estructura |
| 4 | Registro único en `kit-tags.ts` + registrador `L.registerApp` + arranque estándar ([03](03-registro-y-carga.md)) | e2e de arranque |
| 5 | Componentes con sus 4 archivos; fichas con las 6 secciones; `.json` en la galería | guardianes de anatomía |
| 6 | SCSS con tokens del kit, `_tokens`/`_mixins`, anidado ([04](04-estilos.md)) | guardián de estilos |
| 7 | Zod: schemas en `*.schemas.ts`, `safeParse` de lo externo, props registradas ([05](05-zod-y-tipos.md)) | `deno task check` |
| 8 | Specs fundación WHAT y pruebas con `definirPruebas` ([07](07-pruebas-y-gate.md)) | cada `[W-*]` con prueba |
| 9 | Gate `test:all` y, si hay entregable, sync estándar ([08](08-sync-entregable.md)) | `deno task test:all` verde |

Nombres del kit: el repo se llama **iswc-root** (antes `is-webcomponents`). `deno task pin --nuevo=<sha>`
reescribe los pines con el nombre viejo; las rutas de vendor `src/vendor/is-webcomponents/` pasan a
`src/vendor/iswc-root/`.

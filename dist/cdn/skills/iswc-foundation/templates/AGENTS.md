# AGENTS.md — __TITULO__

Punto de entrada para cualquier agente. App de web components sobre el kit **iswc-root**, creada con
`create-iswc-app` (estándar **iswc-foundation**): misma estructura, mismas tareas y mismas reglas que
todas las apps iswc.

## Antes de tocar código

1. [`specs/README.md`](specs/README.md) → [`specs/especificar-what.md`](specs/especificar-what.md).
   Componentes del kit disponibles: [`specs/iswc/kit/catalog.md`](specs/iswc/kit/catalog.md) (no reinventes ninguno).
2. La spec fundación del área (`specs/foundation/NN-*.md`).
3. La skill de la tarea en [`specs/iswc/`](specs/iswc/README.md) (componente, demo, vista, pin).

## Comandos

```bash
deno install                 # dependencias (npm: por deno.json; sin package.json)
deno task icons              # íconos usados → assets/iconify.json + assets/iconify/ (va dentro de build)
deno task build              # icons + src/ + view/ → dist/cdn/ (SCSS, ?v=<hash>, registrador)
deno task dev                # build en vigilancia
deno task serve              # http://127.0.0.1:__PUERTO__/
deno task check              # typecheck
deno task test:all           # build → check → pin → test:health → test:e2e (cooldown x600)
deno task pin                # inventario de pines (un SHA, sin refs mutables)
deno task pin --nuevo=<sha40|ultimo> && deno task vendor:iswc   # subir el kit
deno task sync:entregable    # solo si existe el par _entregable: gate en verde → copia
```

## Reglas duras

1. Vanilla + Web Components, Deno. Cero React/MUI/JSX/Babel, cero bundler en runtime.
2. UI con el kit (`iswc-*`): no reinventar botones, campos, diálogos, tablas, toasts, iconos ni formatos.
3. Colores solo por tokens `--iswc-*`; estilos en `.scss` hermano del componente.
4. Cada componente: `.ts` + `.scss` + `.md` + `.json`, registrado UNA vez en `src/js/kit-tags.ts` y en
   `view/demo/manifest.json`.
5. Tipos con Zod en `src/js/consts/schemas/*.schemas.ts`; datos externos se parsean, nunca `as`.
6. Pines fijos: un SHA de 40 hex del kit en toda la app; tools vendorizadas al mismo SHA. Nunca `@main`.
7. `src/vendor/` no se edita: se cambia en el kit y se re-vendoriza (`deno task vendor:iswc`).
8. Specs WHAT primero; pruebas de caja negra en `tests/` con el formato común del kit.
9. Íconos: `<iswc-icon icon="set:nombre">` con el id literal; viven en `assets/` (no se piden a mano a la
   API). Un id armado en ejecución va en `extra` de `assets/dl.js`. Detalle: `10-iconos.md` del estándar.
10. Hecho = `deno task test:all` en verde.

## Layout

```
__APP__/
├── index.html                  ← shell (<__PREFIJO__-app>)
├── deno.json · tsconfig.json   ← `iswc.host`: dónde se publica la app
├── assets/                     ← dl.js (rutas) · iconify.json · iconify/<set>/<n>.svg
├── src/
│   ├── js/
│   │   ├── iswc.ts             ← pin canónico del kit
│   │   ├── kit-tags.ts         ← REGISTRO ÚNICO de tags (kit, app, vistas)
│   │   ├── boot.ts             ← tema antes del primer pintado (script plano)
│   │   ├── base/               ← componente.ts, zod.ts, props-registro.ts
│   │   ├── consts/schemas/     ← *.schemas.ts (Zod; los tipos salen de aquí)
│   │   ├── core/ · dominio/    ← lógica compartida sin DOM
│   │   └── components/__PREFIJO__/    ← componentes transversales + all.ts
│   ├── styles/                 ← _tokens.scss, _mixins.scss, app.scss
│   ├── utils/build.ts          ← build
│   └── vendor/iswc-root/       ← tools del kit (no editar)
├── view/<vista>/               ← index.html, README.md, demo/, components/, utils/
├── view/demo/                  ← galería de componentes (manifest.json)
├── scripts/{build,gate,vendor}/
├── tests/<area>/*.test.ts      ← pruebas (formato común del kit)
├── specs/                      ← FOUNDATION, W2H, especificar-what, foundation/, iswc/
└── dist/cdn/                   ← artefactos del build (se versionan: es lo que se sirve)
```

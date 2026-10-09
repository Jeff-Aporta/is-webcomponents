# 13 — `create-iswc-app` en detalle

```bash
deno run -A https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/skills/iswc-foundation/tools/create-iswc-app.ts <carpeta> [opciones]
deno run -A <kit>/skills/iswc-foundation/tools/create-iswc-app.ts <carpeta> [opciones]
```

Deno ejecuta la URL directamente: el agente no descarga ni clona nada. El script lee sus plantillas
relativas a su propia URL (`templates/manifest.json` lista los archivos) y vendoriza las tools del kit
de la misma versión, así la app nace con vendor = pin.

| Opción | Default | Nota |
| --- | --- | --- |
| `<carpeta>` | — | Se crea; si existe y no está vacía, no se toca nada (exit 2) |
| `--prefijo` | primera palabra de la carpeta | Minúsculas y dígitos, sin guiones: `<p>-app`, `<p>-hola` |
| `--titulo` | nombre de la carpeta | Título visible |
| `--puerto` | `4200` | `deno task serve` |
| `--sha` | el SHA de la URL del script, o `origin/main` del checkout local (publicado) | 40 hex, ya publicado |
| `--repo` | `Jeff-Aporta/iswc-root` | Owner/nombre del kit |

## Qué deja

- Shell `<p-app>`, vista `hola` con `<p-hola-mundo>` (un `<h1>`: el molde mínimo de componente) y
  `<p-hola>` (bienvenida tipo hero con piezas del kit y un modal: props Zod, repintado parcial,
  eventos, dominio en `utils/`).
- Galería `view/demo/` (manifest validado con Zod), vista aislada y demo de vista.
- Build con `?v=<hash>`, registrador, `boot.js`, `app.css`.
- Gate (`test:all`), e2e con Stagehand listo, sync a entregable, protocolo de pines.
- Specs sembradas: `specs/{README,FOUNDATION,W2H,especificar-what}.md`, `specs/foundation/{10,20,70}`
  (con el WHAT del hola mundo), `specs/iswc/{nuevo-componente,demo-componente,nueva-vista,actualizar-pin}.md`.
- Casos base de prueba: `tests/e2e/00.bienvenida` (Stagehand determinista: título, tarjetas, modal),
  `tests/e2e/01.bienvenida-llm` (`act()` con MiniMax; se salta sin `dev-token.json`) y `tests/vistas/bienvenida`.
- `.gitignore` con `node_modules/`, `dev-token.json`, `.tmp*/`; `dev-token.example.json` con el formato de la clave.

## Después

```bash
cd <carpeta> && deno install && deno task build && deno task test:all
deno task serve   # /  ·  /view/demo/  ·  /view/hola/
```

## Mantener las plantillas (en el kit)

Las plantillas usan marcas `__APP__`, `__PREFIJO__`, `__CLASE__`, `__TITULO__`, `__SHA__`, `__REPO__`,
`__PUERTO__` (también en nombres de archivo). Tras cambiar una: `deno run -A
skills/iswc-foundation/tools/manifest.ts`, generar una app de prueba y `deno task test:all` en verde
(el guardián del kit `iswc-foundation` lo exige).

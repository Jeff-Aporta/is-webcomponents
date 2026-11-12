# AGENTS.md — Cerebro de agentes para ISWC

> **Norma única:** [ESTANDAR — ecosistema VPS](https://github.com/Jeff-Aporta/dev-vps/blob/main/ESTANDAR.md). Gana sobre este archivo si hay conflicto.
>
> **Lee este archivo ANTES de tocar nada.** Resume lo que ya descubrimos a base
> de errores. Si haces algo que esta en "Errores a NO repetir" y lo rompes de
> nuevo, te vas a ganar un commit revertido.
>
> **Despues:** [`INDICE.md`](INDICE.md) es el mapa de todos los documentos del kit
> (generado). Cada fuente lleva en su cabecera las dos rutas que hay que leer
> antes de editarla: `// @contexto INDICE.md · <md del dominio>`.

## 1. Que es este repo

Galeria de Web Components vanilla de ISWC (`iswc-*`), sin frameworks, con Shadow
DOM, empaquetada con esbuild y servida por CDN jsDelivr.

- Demo: <https://jeff-aporta.github.io/is-webcomponents/>
- Repo: `Jeff-Aporta/is-webcomponents`; el nombre del kit es `iswc-base` en prosa, rutas y carpetas.
- Las fuentes viven en `src/`; los contratos, en `specs/`; el diario, en `specs/lessons.md`.

## 2. Mapa de documentos (lee el que corresponda a lo que tocas)

| Documento | Que responde |
|---|---|
| [`specs/constitution.md`](specs/constitution.md) | Los invariantes: lo que no se negocia |
| [`specs/constraints.md`](specs/constraints.md) | Lo prohibido, con su guardian |
| [`specs/lessons.md`](specs/lessons.md) | El diario: que paso, que se rompio y con que fix |
| [`specs/repo/spec.md`](specs/repo/spec.md) | Estructura, comandos, convenciones y bases compartidas |
| [`specs/testing.md`](specs/testing.md) | Que hace verde el gate y como se escribe un guardian |
| [`specs/iconos.md`](specs/iconos.md) | Como se resuelven los iconos |
| [`specs/componentes.md`](specs/componentes.md) | La forma de un `iswc-*` |
| [`specs/cdn.md`](specs/cdn.md) | Como se publica por CDN |
| [`specs/README.md`](specs/README.md) | El indice de specs |
| [`skills/iswc-base/SKILL.md`](skills/iswc-base/SKILL.md) | La skill principal: consumo del kit |
| [`skills/build-component/SKILL.md`](skills/build-component/SKILL.md) | Construir y documentar un componente |
| [`skills/iswc-foundation/SKILL.md`](skills/iswc-foundation/SKILL.md) | El estandar de las apps |

## 3. Las reglas que no se rompen

### 3.1 Donde vive cada cosa

- Fuente en `src/`. En la raiz **no** se recrean `components/`, `styles/`, `previews/` ni `skills/`.
- `src/manifest.ts` es el inventario de tags: un tag nuevo entra ahi y en `src/previews/`.
- Un componente son 4 archivos: `.ts`, `.scss`, `.md` y `.json` (`iswc-preview/v1`).
- `dist/cdn/` se genera: no se edita a mano.
- Un dominio nuevo de docs va en `specs/<dominio>/spec.md` y entra en el mapa de `specs/README.md`.

### 3.2 Estilo

- Tokens `--iswc-*`; nunca `--pg-*` (legacy) ni hex literales.
- `data-theme="light|dark"` + `data-palette="..."`; `palettes.scss` se genera.
- SCSS: usa los mixins del kit (`@use 'kit' as *;`) antes de escribir CSS a mano; el guardian `scss-simple` lo vigila.
- Em, no px ni rem, en `src/components/**`.
- Iconos: `<iswc-icon icon="mdi:home">`; nunca `<iconify-icon>` en light DOM.
- Tipografia y tamano: `size="sm|md|lg"`; `pgSize` es deuda.

### 3.3 Comportamiento

- Un componente es reactivo: `@prop`/`@state`/`@watch` + `render()`; textos por `t()`; eventos tipados.
- Bases: `IswcFormControl` (form-control), `ModalBase` (modal), `IswcReactive` (el resto). Ver `specs/repo/spec.md` R5.
- Nada de HTML suelto fuera de un shadow.
- Sin `any` nuevo ni `@ts-ignore`: el typecheck no puede subir del baseline (`deno.json`).

### 3.4 Antes de cerrar

- `deno task build` -> `deno task bundle` -> `deno task test:all` (typecheck + test + audit) en verde.
- `deno task test -- --solo=<id>` para filtrar; el cooldown es obligatorio (no se salta con `--sin-cooldown`).
- Un cambio de comportamiento entra con su spec y su guardian (`specs/testing.md` S-T3).
- Un cambio de SCSS se mide: `deno task css:equivalente` (0 archivos distintos).
- `deno task indice` regenera `INDICE.md`; las cabeceras `@contexto` van al dia.

### 3.5 Git y shell

- Conventional commits en espanol, un tema por commit.
- **Nunca** `git add -A` ni `git add .`: adds por rutas (`git -c core.safecrlf=false add <rutas>`).
- `dist/` se commitea en un commit aparte del codigo.
- En PowerShell: `&&` no existe, `wc -l` no existe y `<`/`>` rompen los mensajes de commit (usa `git commit -F archivo.txt`).
- No edites texto con `Get-Content`/`Set-Content` (corrompe UTF-8): usa las herramientas de fichero o un script de Node/Deno.
- No hagas push sin que lo pida el owner, y nunca desde una carpeta de trabajo que no sea el repo.

## 4. Errores a NO repetir

La bitacora completa esta en [`specs/lessons.md`](specs/lessons.md). Los que mas caro salen:

| Error | Fix |
|---|---|
| Un preview que apunta a un `.ts` crudo (404 silencioso, pagina en blanco) | El build compila el TS: no apuntes a fuentes sin compilar |
| `git add -A` con 13k ficheros de iconos | Ninguna coleccion completa en el repo |
| `<base href>` rompiendo los iconos locales | `rootFromBaseURI()` (el `pathname`, no el `baseURI`) |
| Un `git commit -m` con `<` en el mensaje | `git commit -F archivo.txt` |
| Un `.scss` reescrito a mano con distinto CSS | `deno task css:equivalente` antes de darlo por bueno |

## 5. Checklist de entrega

- [ ] Spec y guardian si el cambio es de comportamiento.
- [ ] `deno task build` + `deno task bundle` + `deno task test:all` en verde (cooldown respetado).
- [ ] `deno task css:equivalente` si tocaste SCSS.
- [ ] Cabeceras `@contexto` al dia y `INDICE.md` regenerado.
- [ ] Informes y commits en espanol, sin CJK.
- [ ] Commit con el tema del cambio y `dist/` en su propio commit.

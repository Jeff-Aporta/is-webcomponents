# `isp` para LLM

## Propósito

Primitivas de layout y tipografía portadas desde ISP-SvelteComponents: medición
por contenedor, contenedores flex/grid declarativos y escala tipográfica
tintada por la paleta activa.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no
inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-block-layout>` | [block-layout.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/block-layout.md) | Bloque que mide su propio ancho y publica el breakpoint |
| `<is-flex-layout>` | [flex-layout.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/flex-layout.md) | Contenedor flex declarativo |
| `<is-grid-layout>` | [grid-layout.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/grid-layout.md) | Rejilla declarativa por `cells` |
| `<is-text>` | [text.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/text.md) | Texto con color semántico y line-clamp |
| `<is-heading>` | [heading.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/heading.md) | Títulos h1..h6 tintados por la paleta |
| `<is-accordion-group>` | [accordion-group.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/accordion-group.md) | Acordeón declarativo |
| `<is-confirm-delete>` | [confirm-delete.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/confirm-delete.md) | Confirmación destructiva "escribe para confirmar" |
| `<is-form>` | [form.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/form.md) | Formulario con header/content/footer |
| `<is-function-form>` | [function-form.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/function-form.md) | Atributos de una función del editor enriquecido |
| `<is-modal-verificacion>` | [modal-verificacion.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/modal-verificacion.md) | Verificación asíncrona de un registro |
| `<is-loading-overlay>` | [loading-overlay.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/loading-overlay.md) | Overlay de carga sobre un contenedor |

## Composición y relaciones

`block-layout.js` exporta `BreakpointHost` y los helpers de breakpoint
(`sizewFor`, `flagsFor`, `lerpFor`, `BREAKPOINTS`, `BREAKPOINT_W`). Los tres
layouts heredan de ahí, así que todos reflejan `data-sizew` / `data-szw-*`,
escriben `--clientw` / `--lerpw` y emiten `is-breakpoint`.

Los slot props de Svelte (`sizew`, `boolszw`, `lerpw`) NO existen en Web
Components: su equivalente exacto está documentado en
[block-layout.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/isp/block-layout.md).

## Reusar antes de crear

- `./block-layout.js` (`BreakpointHost`) antes de montar otro `ResizeObserver`.
- `../_shared/element-base.js`
- `../_shared/adopt-css.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y
módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Valores enumerados por atributo + `:host([attr])`; valores CSS libres por
  custom property escrita desde el JS.
- Respetar contrato de eventos, parts y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Escalar por `font-size` contextual y `em`; nunca crear un atributo `size`.
- Fallbacks de custom properties siempre a tokens del tema (`--is-text`,
  `--is-accent`, …), nunca a un color literal.
- Verificar contra ISP con `data-palette="contapyme"`.
- Ejecutar `node scripts/audit-components.mjs` y `node tests/run-all.mjs`.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No usar `&[attr]` anidado dentro de `:host { }`.
- No crear size colors ni un módulo por nivel de heading.
- No duplicar la maquinaria de breakpoints en cada layout.

## Errores conocidos y prevención

Traducir slot props de Svelte a "nada" y dejar el breakpoint inaccesible: aquí
se publica por atributo, custom property y evento a la vez.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

`block-layout.js` expone además `BreakpointHost` y helpers como API de módulo
(no como tags). No documentar como elementos.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/LLM.md)

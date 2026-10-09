---
name: document-component
description: >-
  Cómo escribir la ficha `.md` de un componente iswc-* (carpeta src/components/<cat>/).
  Usar al crear o actualizar la guía de un módulo nuevo o al revisar la
  documentación de uno existente. Cubre estructura, secciones obligatorias,
  tono, convenciones de bloques de código, tablas y cross-linking.
---

# Cómo documentar componentes iswc

Esta skill es la **carta de escritura** de las guías que viven junto a cada
componente en `src/components/<carpeta>/<modulo>.md`. No describe la API
del componente (eso es el MD del módulo): describe **cómo debe escribirse
ese MD** para que las LLMs y los humanos lo lean igual y le saque jugo el
catálogo.

## Cuándo usarla

- Estás creando la ficha de un componente nuevo (`<iswc-foo>`) en
  `src/components/<carpeta>/<modulo>.md`.
- Estás revisando una ficha existente para alinearla con el resto del
  catálogo.
- Un agente necesita saber qué secciones son obligatorias, cuáles son
  opcionales y en qué orden van.
- Vas a regenerar o reorganizar el catálogo (`catalog.md`, `reference.md`).

## Estructura de la ficha

Orden obligatorio de secciones. Las obligatorias siempre van; las
opcionales se omiten si el componente no las usa (y se dice por qué).

### 1. Anatomía (obligatoria)

Frontmatter + identidad del componente. Ver
[`references/anatomy-section.md`](references/anatomy-section.md).

- Frontmatter YAML (`tag`, `tags`, `category`, `status`, `source`, `style`,
  `preview`).
- `# <iswc-foo>` como título H1.
- Primer párrafo: **una sola frase** que diga qué es el componente y que
  confirme que es Web Component vanilla con Shadow DOM.

### 2. Atributos observados

Tabla con `Atributo | Tipo | Notas`. Solo atributos que el componente
`observedAttributes` declara. No listar atributos HTML globales a menos
que el componente los reenvíe explícitamente.

### 3. Props (propiedades públicas)

Tabla con `Propiedad | Acceso | Notas`. Diferenciar **lectura/escritura**
de **solo lectura** y **solo escritura**. Indicar si refleja atributo.

### 4. Custom states

Tabla con `Estado | Uso`. Ver
[`references/custom-states.md`](references/custom-states.md). Si el
componente no expone custom states, **omitir la tabla entera**, no
dejarla vacía.

### 5. Eventos (emitidos / escuchados)

Dos sub-secciones:

- **Eventos emitidos** — tabla con `Evento | detail | bubbles | composed |
  cancelable`.
- **Eventos escuchados** — lista corta de eventos que el componente
  escucha de `document`, `window` u otros elementos. Si no escucha nada,
  omitir.

### 6. Slots

Tabla con `Slot | Uso`. Slots vacíos o por defecto van como `default`.
Si el componente no usa slots, omitir.

### 7. CSS parts

Tabla con `Part | Uso`. Solo las parts que el shadow expone con
`exportparts` o `part=`. Ver
[`references/visual-style.md`](references/visual-style.md) para
convenciones de nombrado.

### 8. Ejemplos

Bloques `html` con casos reales. **Siempre** un ejemplo mínimo primero,
luego opcionalmente uno avanzado. Ver
[`references/code-blocks.md`](references/code-blocks.md).

## Convenciones

- **Tono directo, sin ambigüedades.** Frases cortas. Sin "podría", "tal
  vez", "sirve para" cuando la realidad es "sirve para". Reservar la voz
  pasiva para casos donde el actor es irrelevante.
- **Bloques de código con `html` o `css`标识.** Nunca ` ``` ` sin
 标识. Ver [`references/code-blocks.md`](references/code-blocks.md).
- **Tablas para listar props, eventos, slots, parts y states.** Listas
  solo cuando el ítem es único o la tabla no aporta (p.ej. una sola
  propiedad).
- **Tokens `--iswc-*` para colores y espacios.** Nunca `#hex` ni `px` en
  la guía (salvo ejemplos muy concretos).
- **Headings H2 (`##`) para secciones, H3 (`###`) para sub-tablas.**
  No saltar niveles.
- **Saltos de línea simples.** No envolver párrafos a 80 columnas; los
  agentes los re-escriben igual y el line wrapping del repo lo gestiona
  el editor.

## Cross-linking

Cada ficha **debe** enlazar a:

1. La skill del kit:
   [`../iswc-root/SKILL.md`](../iswc-root/SKILL.md).
2. Componentes relacionados (mismo grupo, primos cercanos o dependencias).
   P.ej. `<iswc-button-group>` enlaza a `<iswc-button>`.
3. Dependencias de código (`_shared/*.js`, primos del mismo paquete).

Los enlaces a guías hermanas deben usar la ruta **relativa** dentro de
`src/components/`:

```md
[`./button.css`](./button.css)
[`../_shared/adopt-css.js`](../_shared/adopt-css.js)
[`../media/icon.md`](../media/icon.md)
```

Los enlaces a la skill del kit van con la ruta desde `skills/`:

```md
[Skill del kit](../iswc-root/SKILL.md)
```

## Validación

Antes de mergear cambios en la ficha de un componente:

1. `node tests/icons.test.mjs` (cubre que la guía no rompe referencias a
   iconos en ejemplos o tablas).
2. `node tests/preview-paths.test.mjs` si la ficha cambia ejemplos que
   referencian archivos del preview.
3. Si la ficha altera el frontmatter, `node tests/manifest-paths.test.mjs`
   para asegurar que `source`/`style`/`preview` siguen apuntando a
   archivos reales.

Si cualquiera falla, **primero** justifica la rotura con un cambio en el
componente y luego ajusta la guía — nunca al revés.

## Errores comunes

- Inventar API por similitud con otro componente (p.ej. añadir un
  atributo `size` que el módulo no declara).
- Listar atributos que el componente no observa.
- Dejar la tabla de custom states vacía cuando el componente no expone
  ninguno: mejor omitirla.
- Olvidar el frontmatter o dejar `preview` apuntando a un archivo que
  no existe.
- Poner `iswc-popup` (eliminado) en cualquier ejemplo o enlace.
- Mezclar `iswc-*` con tags nativos o de otros frameworks en un mismo
  ejemplo.
- Empezar la ficha con prosa introductoria larga en vez de ir directo al
  grano.
- Usar `#hex` o `px` en ejemplos de tokens; siempre `var(--iswc-*)` o
  `em`.

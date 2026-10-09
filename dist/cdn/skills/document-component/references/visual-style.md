# Estilo visual y consistencia en las fichas iswc

Las guías de componentes son lo que un agente lee antes de usar el tag.
Si dos guías describen el mismo concepto con palabras distintas, la
inferencia falla. Esta referencia fija tono, formato y convenciones
visuales para que todas las fichas se lean igual.

## Tono

- **Directo.** Decir lo que el componente **es**, no lo que **podría
  ser**. Sin "tal vez", "sirve para", "es útil cuando".
- **Imperativo en instrucciones.** "Pasa `color=\"brand\"`", no
  "Podrías pasar el color".
- **Voz activa.** El sujeto es el consumidor o el componente, no "se".
- **Sin marketing.** No "solución moderna y elegante". El catálogo no
  vende, documenta.

| ❌ Antes | ✅ Ahora |
| --- | --- |
| "Podría ser útil para casos en los que…" | "Úsalo cuando hay un toggle binario con feedback visual." |
| "Este componente es una solución para…" | "Toggle binario con feedback visual. Hereda de `ElementBase`." |
| "Es interesante notar que…" | (omitir; si el dato importa, va en la columna "Notas" de la tabla) |

## Formato de tablas

Las tablas son la **estructura por defecto** para cualquier colección
de tres o más ítems.

- **Cabecera en `Pipe case`.** `Atributo`, `Tipo`, `Notas`,
  `Propiedad`, `Acceso`, `Evento`, `detail`, `bubbles`, `composed`,
  `cancelable`, `Slot`, `Uso`, `Part`, `Token`.
- **Alineación:** descriptor y notas a la izquierda, valores cortos
  centrados si la tabla es numérica.
- **Celdas vacías** se dejan literalmente vacías, no con `—` ni `n/a`.
- **Saltos de línea dentro de la celda** con `<br>` solo si la prosa
  es larga; si la prosa no cabe en una línea, mejor párrafo aparte.

### Tabla de atributos

```md
| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `brand` \| `neutral` \| `success` \| `warning` \| `danger` \| `info` \| `error` | Default `brand`. Ortogonal a `variant`. |
| `variant` | `filled` \| `outlined` \| `plain` \| `ghost` \| `soft` \| `text` | Default `filled`. |
| `disabled` | boolean | Refleja la prop `disabled`. |
```

### Tabla de eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-click` | sí | sí | sí | no |
| `iswc-invalid` | según cabecera | según cabecera | según cabecera | según cabecera |

Cuando la columna "según cabecera" aplica, **no** se resume: el
detalle real vive en la cabecera del `.js` y la tabla solo apunta.

### Tabla de CSS parts

| Part | Uso |
| --- | --- |
| `button` | Contenedor principal. Acepta `::part(button) { … }`. |
| `label` | Etiqueta visible dentro del botón. |
| `start` | Slot izquierdo. |
| `end` | Slot derecho. |

Nomenclatura de parts:

- **kebab-case**, mismo nombre que el atributo `part` del shadow.
- **Sin prefijo `iswc-`.** La part es del host.
- **Una part por rol visual**, no por sub-elemento arbitrario.

### Tabla de tokens

```md
| Token | Uso |
| --- | --- |
| `--iswc-accent` | Color de acento del componente. Default `--iswc-color-brand-500`. |
| `--iswc-button-border-radius` | Radio del borde. Default `var(--iswc-radius-md)`. |
```

Orden: tokens propios del componente primero (`--iswc-button-*`),
luego tokens globales del kit (`--iswc-accent`, `--iswc-bg`, …).

## Encabezados y jerarquía

- **H1 (`#`)** solo para el título del componente. Una vez por ficha.
- **H2 (`##`)** para secciones principales (Propósito, API, Slots,
  Eventos, Ejemplos, etc.).
- **H3 (`###`)** para sub-secciones (Atributos observados dentro de
  API, Custom states, etc.).
- **H4 y más:** evitar. Si hace falta un cuarto nivel, reescribir como
  lista.

## Listas

- **Guiones `-`** para listas no ordenadas. No asteriscos, no
  numerales romanos.
- **Numerales `1.`** solo cuando el orden importa (pasos de un
  tutorial).
- **Una línea por ítem**, sin puntos finales si el ítem es corto.

```md
- Hereda de `ElementBase`.
- Form-associated (`ElementInternals.setFormValue`).
- Acepta `<iswc-icon slot="start">` y `slot="end"`.
```

## Énfasis y resaltado

- **Negritas** para UI labels, nombres de botones y warnings: `**OK**`,
  `**Cancelar**`.
- **Cursivas** para títulos de libros o nombres de productos externos.
  Casi nunca se usan en las fichas.
- **Backticks** para tags, atributos, props, eventos, tokens, paths y
  bloques inline de código.

## Salto de línea y párrafos

- **Un salto de línea entre párrafos.** Sin línea en blanco extra.
- **Párrafos cortos** (3–5 líneas). Si la prosa pide más, partir con
  un subtítulo o convertir en lista.
- **Sin HTML crudo** en la guía salvo `<br>` legítimo dentro de una
  celda de tabla. El resto lo renderiza el visualizador.

## Enlaces

- **Estilo markdown** `[texto](url)`, no HTML `<a>`.
- **Rutas relativas** dentro de `src/`. Sin `https://github.com/Jeff-Aporta/...`
  en enlaces a archivos del propio repo: la URL cambia con cada
  mirror y las rutas relativas se rompen menos.
- **Texto descriptivo**, no "click aquí". El lector debe saber a
  dónde va sin abrir el enlace.

| ❌ | ✅ |
| --- | --- |
| `[aquí](./button.md)` | [`./button.md`](./button.md) |
| `[link](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/button.md)` | [`./button.md`](./button.md) (relativa) |

## Errores comunes

- Párrafos introductorios largos antes del H1. No los hay: el frontmatter
  + título ya abren.
- Tablas con `Cabecera1 | Cabecera2 | Cabecera3` sin `| --- | --- | --- |`
  debajo. Markdown las renderiza, pero la tabla no se interpreta.
- Mezclar backticks con comillas para el mismo tag: `<iswc-button>`
  en una sección y `` `<iswc-button>` `` en otra. Elegir una y
  mantenerla.
- Olvidar punto final en una celda de "Notas" y ponerlo en la
  siguiente. Coherencia por columna, no por fila.
- Emojis en títulos (`# 🎨 Componente`). El catálogo es texto plano
  y los emojis saturan el TOC.

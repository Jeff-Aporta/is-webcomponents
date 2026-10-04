---
tag: iswc-gantt
tags:
  - iswc-gantt
category: diagrams
status: public
source: ./gantt.ts
style: ./gantt.css
preview: ./gantt.json
---
# `<iswc-gantt>`

## PropÃ³sito

Diagrama de Gantt en SVG, sin Mermaid. Una fila por tarea, en el
orden que la declares; el componente calcula la escala de tiempo,
dibuja las barras y rutea las flechas de dependencia rodeando las
demÃ¡s barras.

Este mÃ³dulo registra `<iswc-gantt>`.

## CuÃ¡ndo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## CuÃ¡ndo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## ImportaciÃ³n

```js
import './gantt.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-gantt></iswc-gantt>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isViewer` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `spec` | solo lectura | Declarada por clase. |
| `layout` | solo lectura | Declarada por clase. |
| `turtle` | solo lectura | Declarada por clase. |
| `hiddenGroups` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-turtle-state` | Emitido al actualizarse el estado del mÃ³dulo turtle (resize, datos, etc.). |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-turtle-state` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-toggle-group` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-gantt');
el.addEventListener('iswc-turtle-state', (e) => {
  console.log('iswc-turtle-state', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `updateComplete()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-gantt> â€” diagrama de Gantt en SVG, sin Mermaid.
>   <iswc-gantt>
>     <script type="application/json">
>       { "gantt": { "title": "...", "groups": [...], "tasks": [...] } }
>     </script>
>   </iswc-gantt>
> Una fila por tarea (orden de declaraciÃ³n, sin empaquetar). Las flechas
> `after:` se rutean con A* sobre la rejilla de costos, igual que las
> aristas de flowchart.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./gantt-spec.js`](./gantt-spec.js)
- [`./flowchart-spec.js`](./flowchart-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/path-turtle.js`](../_shared/path-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del mÃ³dulo: `<iswc-gantt>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-gantt></iswc-gantt>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./gantt.ts)
- [CSS](./gantt.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./gantt.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=gantt&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=gantt&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.

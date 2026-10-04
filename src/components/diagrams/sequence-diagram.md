---
tag: iswc-sequence-diagram
tags:
  - iswc-sequence-diagram
category: diagrams
status: public
source: ./sequence-diagram.js
style: ./sequence-diagram.css
preview: ./sequence-diagram.json
---
# `<iswc-sequence-diagram>`

## Propósito

Diagrama de secuencia en SVG, sin Mermaid. La configuración es un JSON
con actores, mensajes y grupos; el layout (posiciones, ruteo ortogonal
de las flechas y colocación de etiquetas) se calcula solo.

Este módulo registra `<iswc-sequence-diagram>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './sequence-diagram.js';
```

## Ejemplo mínimo

```html
<iswc-sequence-diagram></iswc-sequence-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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


| Evento | Descripción |
| --- | --- |
| `iswc-turtle-state` | Emitido al actualizarse el estado del módulo turtle (resize, datos, etc.). |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-turtle-state` | sí | sí | sí | no |
| `iswc-render` | sí | sí | sí | no |
| `iswc-toggle-group` | sí | sí | sí | sí |
| `iswc-open-viewer` | sí | sí | sí | sí |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-sequence-diagram');
el.addEventListener('iswc-turtle-state', (e) => {
  console.log('iswc-turtle-state', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `updateComplete()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-sequence-diagram> — diagrama de secuencia en SVG, sin Mermaid.
> Configuración por JSON (idéntica a la del proyecto original): un
> <script type="application/json"> hijo, o la propiedad `payload`.
>   <iswc-sequence-diagram>
>     <script type="application/json">
>       { "sequence": { "actors": [...], "messages": [...] } }
>     </script>
>   </iswc-sequence-diagram>
> También acepta `{ "preset": "tk1437191" }`.
> Atributos
>   color  inline (default) | viewer — viewer activa hover, leyenda clickeable
>            y auto-animación de la tortuga.
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-turtle-state (detail: {playing, idx, total, replay}),
>          iswc-open-viewer (click en colore inline),
>          iswc-toggle-group (detail: {id})

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/diagram-grid.js`](../_shared/diagram-grid.js)
- [`../_shared/tk-icon-inline.js`](../_shared/tk-icon-inline.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-color.js`](../_shared/tk-color.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del módulo: `<iswc-sequence-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-sequence-diagram></iswc-sequence-diagram>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./sequence-diagram.js)
- [CSS](./sequence-diagram.css)
- [Índice de categoría](./LLM.md)
- [Preview](./sequence-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=sequence&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=sequence&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.

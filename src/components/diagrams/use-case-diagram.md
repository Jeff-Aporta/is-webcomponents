---
tag: iswc-use-case-diagram
tags:
  - iswc-use-case-diagram
category: diagrams
status: public
source: ./use-case-diagram.js
style: ./use-case-diagram.css
preview: ./use-case-diagram.json
---
# `<iswc-use-case-diagram>`

## Propósito

Diagrama de **casos de uso UML** en SVG, sin Mermaid: actores fuera del
límite del sistema, casos en elipses dentro, y relaciones con su estereotipo
(`«include»`, `«extend»`) o su punta hueca de generalización.

Este módulo registra `<iswc-use-case-diagram>`.

## Cuándo usarlo

Cuando la pregunta es de alcance: qué puede hacer cada rol dentro de un
sistema y qué queda fuera de su alcance.

## Cuándo no usarlo

Si necesitas el orden temporal de las interacciones → `<iswc-sequence-diagram>`.
Si es la arquitectura interna → `<iswc-component-diagram>`.

## Importación

```js
import './use-case-diagram.js';
```

## Ejemplo mínimo

```html
<iswc-use-case-diagram>
  <script type="application/json">
    {}
  </script>
</iswc-use-case-diagram>
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
| `hiddenGroups` | lectura/escritura | Grupos ocultos por el visor. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sí | sí | sí | no |
| `iswc-open-viewer` | sí | sí | sí | sí |
| `iswc-toggle-group` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-use-case-diagram');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
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

La asociación se dibuja sin punta, como manda UML; `include` y `extend` van punteadas con su estereotipo, y la generalización lleva punta hueca. Los actores se reparten por el lado declarado y los casos se apilan en el orden en que vienen: el autor manda sobre el motor.

Documentación de cabecera preservada desde fuente:

> <iswc-use-case-diagram> — diagrama de casos de uso UML en SVG, sin Mermaid.
>   <iswc-use-case-diagram>
>     <script type="application/json">
>       { "useCase": { "system": { "name": "Portal" }, "actors": [...], "cases": [...], "links": [...] } }
>     </script>
>   </iswc-use-case-diagram>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, hiddenGroups
> Eventos: iswc-render, iswc-open-viewer, iswc-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./use-case-spec.js`](./use-case-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/diagram-arrow.js`](../_shared/diagram-arrow.js)

Tags del módulo: `<iswc-use-case-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galería, que trae el payload completo con grupos y estilos:
[`./use-case-diagram.json`](./use-case-diagram.json).

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

- [JavaScript](./use-case-diagram.js)
- [CSS](./use-case-diagram.css)
- [Spec y layout](./use-case-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](./use-case-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=usecase&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=usecase&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.

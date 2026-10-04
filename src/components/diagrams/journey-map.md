---
tag: iswc-journey-map
tags:
  - iswc-journey-map
category: diagrams
status: public
source: ./journey-map.ts
style: ./journey-map.css
preview: ./journey-map.json
---
# `<iswc-journey-map>`

## PropÃ³sito

Mapa de **recorrido de usuario** en SVG, sin Mermaid: fases arriba, pasos en
orden y la curva de satisfacciÃ³n que los atraviesa.

Este mÃ³dulo registra `<iswc-journey-map>`.

## CuÃ¡ndo usarlo

Cuando ademÃ¡s del orden hay una **medida** por paso: dÃ³nde se cae la
experiencia, en quÃ© fase, y de quiÃ©n es ese paso.

## CuÃ¡ndo no usarlo

Si solo hay hitos en el tiempo â†’ `<iswc-timeline>`. Si hay decisiones y
bifurcaciones â†’ `<iswc-flowchart>`.

## ImportaciÃ³n

```js
import './journey-map.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-journey-map>
  <script type="application/json">
    {}
  </script>
</iswc-journey-map>
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
| `hiddenPhases` | lectura/escritura | Fases ocultas por el visor. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |
| `iswc-toggle-phase` | Evento personalizado del componente (toggle phase). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-toggle-phase` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-journey-map');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
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

La escala por defecto es 1..5 y se cambia con `scale`. Un paso sin `score` se dibuja como aro punteado y la curva no pasa por Ã©l: un dato que falta no es un cero.

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-journey-map> â€” mapa de recorrido (user journey) en SVG, sin Mermaid.
>   <iswc-journey-map>
>     <script type="application/json">
>       { "journey": { "phases": [...], "steps": [{ "label": "...", "score": 4 }] } }
>     </script>
>   </iswc-journey-map>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, hiddenPhases
> Eventos: iswc-render, iswc-open-viewer, iswc-toggle-phase

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./journey-spec.js`](./journey-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del mÃ³dulo: `<iswc-journey-map>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galerÃ­a, que trae el payload completo con grupos y estilos:
[`./journey-map.json`](./journey-map.json).

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

- [JavaScript](./journey-map.ts)
- [CSS](./journey-map.css)
- [Spec y layout](./journey-spec.js)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./journey-map.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=journey&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=journey&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.

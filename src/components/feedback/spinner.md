---
tag: iswc-spinner
tags:
  - iswc-spinner
category: feedback
status: public
source: ./spinner.js
style: ./spinner.css
preview: ./spinner.json
---
# `<iswc-spinner>`

## Propósito

Indicador de carga animado. Sin atributos; personalizable vía CSS vars.

Este módulo registra `<iswc-spinner>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './spinner.js';
```

## Ejemplo mínimo

```html
<iswc-spinner></iswc-spinner>
<iswc-spinner style="font-size:2rem;--indicator-color:#40c057"></iswc-spinner>
```

## API

### Atributos y propiedades

#### Atributos observados

No expone.

#### Propiedades públicas

No expone.

### Slots

No expone.

### Eventos


| Evento | Descripción |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-spinner');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `spinner` | Personalizable con `::part(spinner)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-width` | Token leído o definido por componente. |
| `--track-color` | Token leído o definido por componente. |
| `--indicator-color` | Token leído o definido por componente. |
| `--speed` | Token leído o definido por componente. |
| `--iswc-control-border` | Token leído o definido por componente. |
| `--iswc-color-brand-500` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-spinner> — Web Component (vanilla).
> Indicador de carga animado (anillo via border).
> role=status en el host; respeta prefers-reduced-motion.
> CSS Parts: ::part(spinner)
> CSS vars: --track-width, --track-color, --indicator-color, --speed

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-spinner>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-live`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-spinner style="--speed:1.05s"></iswc-spinner>
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

- [JavaScript](./spinner.js)
- [CSS](./spinner.css)
- [Índice de categoría](./LLM.md)
- [Preview](./spinner.json)

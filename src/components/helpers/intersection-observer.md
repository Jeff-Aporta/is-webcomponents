---
tag: is-intersection-observer
tags:
  - is-intersection-observer
category: helpers
status: public
source: ./intersection-observer.js
style: ./intersection-observer.css
preview: ../../previews/helpers/is-intersection-observer.json
---
# `<is-intersection-observer>`

## Propósito

Responde a una pregunta simple: ¿este elemento está (parcialmente) visible
dentro de un contenedor? Si sí, aplica una clase y/o dispara el evento
is-intersect.

Este módulo registra `<is-intersection-observer>`.

## Cuándo usarlo

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Cuándo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## Importación

```js
import './intersection-observer.js';
```

## Ejemplo mínimo

```html
<is-intersection-observer root="#scroller" intersect-class="is-in" threshold="0.4" once>
<article class="io-card">…</article>
</is-intersection-observer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `disabled` | boolean | Fuente define default/restricción. |
| `intersect-class` | string/según contrato | Fuente define default/restricción. |
| `once` | boolean | Fuente define default/restricción. |
| `root` | string/según contrato | Fuente define default/restricción. |
| `root-margin` | string/según contrato | Fuente define default/restricción. |
| `threshold` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `disabled` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-intersect` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-intersection-observer> — Web Component (vanilla).
> display:contents — observa hijos directos con IntersectionObserver.
> Atributos
>   disabled         boolean
>   intersect-class  string — clase a togglear en el hijo
>   once             boolean — deja de observar tras primera intersección
>   root             string — selector del root (default viewport)
>   root-margin      string
>   threshold        number 0–1
> Eventos
>   is-intersect  detail: { entry }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-intersection-observer>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-intersection-observer root="#scroller" intersect-class="is-in" threshold="0.4" once>
<article class="io-card">…</article>
</is-intersection-observer>
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

- [JavaScript](./intersection-observer.js)
- [CSS](./intersection-observer.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-intersection-observer.json)

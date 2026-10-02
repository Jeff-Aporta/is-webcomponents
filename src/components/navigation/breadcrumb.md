---
tag: iswc-breadcrumb
tags:
  - iswc-breadcrumb
category: navigation
status: public
source: ./breadcrumb.js
style: ./breadcrumb.css
preview: ./breadcrumb.json
---
# `<iswc-breadcrumb>`

## Propósito

Migas de pan accesibles con marcado <nav>,
ARIA roles y separador automático entre items.

Este módulo registra `<iswc-breadcrumb>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './breadcrumb.js';
```

## Ejemplo mínimo

```html
<iswc-breadcrumb label="Catálogo">
<iswc-breadcrumb-item href="/">Catálogo</iswc-breadcrumb-item>
<iswc-breadcrumb-item href="/ropa">Ropa</iswc-breadcrumb-item>
<iswc-breadcrumb-item href="/ropa/mujer">Mujer</iswc-breadcrumb-item>
<iswc-breadcrumb-item href="">Camisetas</iswc-breadcrumb-item>
</iswc-breadcrumb>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `label` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `breadcrumb` | Personalizable con `::part(breadcrumb)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leído o definido por componente. |
| `--iswc-text-muted` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-breadcrumb> — contenedor de una ruta de migas de pan.
> Recibe N `<iswc-breadcrumb-item>` en el slot default y los muestra
> separados por el slot `separator`.
> Atributos
>   label    string  — aria-label del nav (anunciado por screen readers).
> Slots
>   (default)  breadcrumb-items.
>   separator  icono o texto entre items (default: chevron-right).
> CSS Parts: ::part(breadcrumb)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-breadcrumb>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-breadcrumb-item icon="mdi:home">Inicio</iswc-breadcrumb-item>
<iswc-breadcrumb-item>
<iswc-icon slot="start" icon="mdi:home"></iswc-icon>
Inicio
</iswc-breadcrumb-item>
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

- [JavaScript](./breadcrumb.js)
- [CSS](./breadcrumb.css)
- [Índice de categoría](./LLM.md)
- [Preview](./breadcrumb.json)

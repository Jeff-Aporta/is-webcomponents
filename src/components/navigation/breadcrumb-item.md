---
tag: iswc-breadcrumb-item
tags:
  - iswc-breadcrumb-item
category: navigation
status: public
source: ./breadcrumb-item.js
style: ./breadcrumb-item.css
preview: ./breadcrumb-item.json
---
# `<iswc-breadcrumb-item>`

## Propósito

Migas de pan accesibles con marcado <nav>,
ARIA roles y separador automático entre items.

Este módulo registra `<iswc-breadcrumb-item>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './breadcrumb-item.js';
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
| `href` | string/según contrato | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `target` | string/según contrato | Fuente define default/restricción. |
| `rel` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `href` | lectura/escritura | Declarada por clase. |
| `target` | lectura/escritura | Declarada por clase. |
| `rel` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `separator` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `separator` | Personalizable con `::part(separator)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_gap` | Token leído o definido por componente. |
| `--iswc-text-muted` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-link` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-link-hover` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-breadcrumb-item> — un paso individual dentro de un <iswc-breadcrumb>.
> Si tiene `href` (incluido `href=""`), el item se renderiza como <a href>.
> Con `href=""` se marca como current page (aria-current="page", CSS [current]).
> Si no tiene href, se renderiza como <span> (SPAs: el desarrollador maneja eventos).
> Atributos
>   href    string  — opcional: el item se vuelve enlace. "" = current page.
>   target  string  — opcional.
>   rel     string  — opcional.
>   icon    string  — opcional: Iconify id para icono al inicio si no se usa slot start.
> Slots
>   (default)  texto del item.
>   start      icono propio al inicio (gana sobre icon).
>   end        icono propio al final.
>   separator  override del separador (chevron-right por default).
> CSS Parts: ::part(label) ::part(separator) ::part(start) ::part(end)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-breadcrumb-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-current`, `aria-hidden`.

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

- [JavaScript](./breadcrumb-item.js)
- [CSS](./breadcrumb-item.css)
- [Índice de categoría](./LLM.md)
- [Preview](./breadcrumb-item.json)

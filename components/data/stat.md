---
tag: is-stat
tags:
  - is-stat
category: data
status: public
source: ./stat.js
style: ./stat.css
preview: ../../previews/data/is-stat.html
---
# `<is-stat>`

## Propósito

Tarjeta KPI para dashboards: label, número principal, helper text,
trend (subida/bajada) e icono. Detecta automáticamente la dirección
del trend según el signo del valor.

Este módulo registra `<is-stat>`.

## Cuándo usarlo

Presentación, comparación, movimiento u organización de datos estructurados.

## Cuándo no usarlo

No reemplazar HTML semántico cuando contenido es estático y simple.

## Importación

```js
import './stat.js';
```

## Ejemplo mínimo

```html
<is-stat
label="Ingresos"
value="€ 1.249,00"
helper="vs mes anterior"
trend="+12.5%"
icon="mdi:cash-multiple"
></is-stat>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `helper` | string/según contrato | Fuente define default/restricción. |
| `trend` | string/según contrato | Fuente define default/restricción. |
| `trend-direction` | string/según contrato | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `icon` | Contenido proyectado. |
| `value` | Contenido proyectado. |
| `trend` | Contenido proyectado. |
| `helper` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `head` | Personalizable con `::part(head)`. |
| `label` | Personalizable con `::part(label)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `value` | Personalizable con `::part(value)`. |
| `foot` | Personalizable con `::part(foot)`. |
| `trend` | Personalizable con `::part(trend)`. |
| `helper` | Personalizable con `::part(helper)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--bg` | Token leído o definido por componente. |
| `--is-bg-2` | Token leído o definido por componente. |
| `--fg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--muted` | Token leído o definido por componente. |
| `--border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--brand` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--success` | Token leído o definido por componente. |
| `--is-success` | Token leído o definido por componente. |
| `--danger` | Token leído o definido por componente. |
| `--is-danger` | Token leído o definido por componente. |
| `--warning` | Token leído o definido por componente. |
| `--is-warning` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-stat> — Stat / KPI Card (vanilla, zero dependencies).
> Bloque para KPI en dashboards: label, número principal, helper text,
> cambio/trend opcional e icono.
>   <is-stat label="Ingresos" value="€ 1.249,00" helper="vs mes anterior" trend="+12.5"></is-stat>
> Atributos
>   label       string
>   value       string (texto del número principal; admite formato HTML)
>   helper      string
>   trend       string (e.g. "+12.5%" o "-3.2%")
>   trend-direction up | down | flat   (auto-detect si trend empieza con + o -)
>   icon        string (iconify id)
>   color     brand | neutral | success | warning | danger (default 'brand')
> Slots
>   label       override del label
>   value       override del valor
>   helper      override del helper
>   trend       override del trend
>   icon        override del icono
> CSS Parts
>   ::part(base) ::part(label) ::part(value) ::part(helper) ::part(trend) ::part(icon)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-stat>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<is-stat
label="Ingresos"
value="€ 1.249,00"
helper="vs mes anterior"
trend="+12.5%"
icon="mdi:cash-multiple"
></is-stat>
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

- [JavaScript](./stat.js)
- [CSS](./stat.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data/is-stat.html)

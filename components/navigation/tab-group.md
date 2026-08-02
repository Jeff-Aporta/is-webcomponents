---
tag: is-tab-group
tags:
  - is-tab-group
  - is-tab
  - is-tab-panel
category: navigation
status: public
source: ./tab-group.js
style: ./tab-group.css
preview: ../../previews/navigation/is-tab-group.html
---
# `<is-tab-group>` / `<is-tab>` / `<is-tab-panel>`

## Propósito

Tabs accesibles con navegación por teclado (←/→), activación automática o
manual, indicator animado, placements (top/bottom/start/end), scroll horizontal
automático y soporte para tabs cerrables.

Este módulo registra `<is-tab-group>`, `<is-tab>`, `<is-tab-panel>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './tab-group.js';
```

## Ejemplo mínimo

```html
<is-tab-group active="general">
<is-tab slot="nav" panel="general">General</is-tab>
<is-tab-panel name="general">Contenido del panel.</is-tab-panel>
…
</is-tab-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `activation` | string/según contrato | Fuente define default/restricción. |
| `without-scroll-controls` | boolean | Fuente define default/restricción. |
| `panel` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `closable` | boolean | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `nav` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `activation` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `nav` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `end` | Contenido proyectado. |
| `close-button` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-tab-show` | sí | sí | sí | no |
| `is-tab-close` | sí | sí | sí | no |
| `is-tab-hide` | según cabecera | según cabecera | según cabecera | según cabecera |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `tab-group` | Personalizable con `::part(tab-group)`. |
| `nav` | Personalizable con `::part(nav)`. |
| `scroll-button` | Personalizable con `::part(scroll-button)`. |
| `scroll-button-start` | Personalizable con `::part(scroll-button-start)`. |
| `tabs` | Personalizable con `::part(tabs)`. |
| `scroll-button-end` | Personalizable con `::part(scroll-button-end)`. |
| `body` | Personalizable con `::part(body)`. |
| `base` | Personalizable con `::part(base)`. |
| `start` | Personalizable con `::part(start)`. |
| `end` | Personalizable con `::part(end)`. |
| `close-button` | Personalizable con `::part(close-button)`. |
| `active-indicator` | Personalizable con `::part(active-indicator)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-color` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--indicator-color` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--track-width` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-text-muted` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-tab-group>, <is-tab>, <is-tab-panel> — Web Components (vanilla, zero dependencies).
> Tres componentes cohabitantes:
>   <is-tab-group active="general" placement="top" activation="auto">
>     <is-tab slot="nav" panel="general">General</is-tab>
>     <is-tab slot="nav" panel="custom" disabled>Custom</is-tab>
>     <is-tab-panel name="general">…</is-tab-panel>
>     <is-tab-panel name="custom">…</is-tab-panel>
>   </is-tab-group>
> Atributos <is-tab-group>
>   active        string   — nombre del panel activo.
>   placement     top | bottom | start | end  (default 'top')
>   activation    auto | manual (default 'auto')
>   without-scroll-controls  boolean (default false)
> Atributos <is-tab>
>   panel         string   — nombre del panel al que apunta (required).
>   disabled      boolean
>   closable      boolean  — muestra un botón de cerrar (slot close-button).
> Atributos <is-tab-panel>
>   name          string   — id único dentro del tab-group (required).
> Slots
>   <is-tab-group>
>     nav        — tabs (se proyectan automáticamente).
>     (default)  — paneles.
>   <is-tab>
>     (default)   label del tab.
>     start       icono al inicio.
>     end         icono al final.
>     close-button  botón de cerrar (cuando closable).
>   <is-tab-panel>
>     (default)  contenido del panel.
> Eventos
>   is-tab-show   detail: { name, panel, tab } — al activar un panel.
>   is-tab-hide   detail: { name, panel, tab } — al ocultar un panel.
>   is-tab-close  detail: { tab, name }  — cuando se hace click en el close-btn de un is-tab closable.
> CSS Parts
>   is-tab-group: ::part(tab-group) ::part(nav) ::part(body) ::part(tabs)
>   is-tab: ::part(base) ::part(active-indicator)
>   is-tab-panel: ::part(base)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-tab-group>`, `<is-tab>`, `<is-tab-panel>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<is-tab-group activation="manual">…</is-tab-group>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./tab-group.js)
- [CSS](./tab-group.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/navigation/is-tab-group.html)

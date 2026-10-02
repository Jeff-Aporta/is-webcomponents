---
tag: iswc-tab-group
tags:
  - iswc-tab-group
  - iswc-tab
  - iswc-tab-panel
category: navigation
status: public
source: ./tab-group.js
style: ./tab-group.css
preview: ./tab-group.json
---
# `<iswc-tab-group>` / `<iswc-tab>` / `<iswc-tab-panel>`

## Propósito

Tabs accesibles con navegación por teclado (←/→), activación automática o
manual, indicator animado, placements (top/bottom/start/end), scroll horizontal
automático y soporte para tabs cerrables.

Este módulo registra `<iswc-tab-group>`, `<iswc-tab>`, `<iswc-tab-panel>`.

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
<iswc-tab-group active="general">
<iswc-tab slot="nav" panel="general">General</iswc-tab>
<iswc-tab-panel name="general">Contenido del panel.</iswc-tab-panel>
…
</iswc-tab-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `activation` | string/según contrato | Fuente define default/restricción. |
| `url-key` | string | Opt-in: tab activo en `?s=` como `{ [url-key]: panel }` (b64url). Vacío = off. |
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
| `urlKey` | lectura/escritura | Key dentro de `?s=`; vacío desactiva. |

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
| `iswc-tab-show` | sí | sí | sí | no |
| `iswc-tab-close` | sí | sí | sí | no |
| `iswc-tab-hide` | según cabecera | según cabecera | según cabecera | según cabecera |

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
| `--iswc-border` | Token leído o definido por componente. |
| `--indicator-color` | Token leído o definido por componente. |
| `--iswc-brand` | Token leído o definido por componente. |
| `--track-width` | Token leído o definido por componente. |
| `--iswc-font-family` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-text-muted` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-tab-group>, <iswc-tab>, <iswc-tab-panel> — Web Components (vanilla, zero dependencies).
> Tres componentes cohabitantes:
>   <iswc-tab-group active="general" placement="top" activation="auto">
>     <iswc-tab slot="nav" panel="general">General</iswc-tab>
>     <iswc-tab slot="nav" panel="custom" disabled>Custom</iswc-tab>
>     <iswc-tab-panel name="general">…</iswc-tab-panel>
>     <iswc-tab-panel name="custom">…</iswc-tab-panel>
>   </iswc-tab-group>
> Atributos <iswc-tab-group>
>   active        string   — nombre del panel activo.
>   placement     top | bottom | start | end  (default 'top')
>   activation    auto | manual (default 'auto')
>   without-scroll-controls  boolean (default false)
>   url-key       string   — opt-in: tab activo en ?s= como { [url-key]: panel }
> Atributos <iswc-tab>
>   panel         string   — nombre del panel al que apunta (required).
>   disabled      boolean
>   closable      boolean  — muestra un botón de cerrar (slot close-button).
> Atributos <iswc-tab-panel>
>   name          string   — id único dentro del tab-group (required).
> Slots
>   <iswc-tab-group>
>     nav        — tabs (se proyectan automáticamente).
>     (default)  — paneles.
>   <iswc-tab>
>     (default)   label del tab.
>     start       icono al inicio.
>     end         icono al final.
>     close-button  botón de cerrar (cuando closable).
>   <iswc-tab-panel>
>     (default)  contenido del panel.
> Eventos
>   iswc-tab-show   detail: { name, panel, tab } — al activar un panel.
>   iswc-tab-hide   detail: { name, panel, tab } — al ocultar un panel.
>   iswc-tab-close  detail: { tab, name }  — cuando se hace click en el close-btn de un iswc-tab closable.
> CSS Parts
>   iswc-tab-group: ::part(tab-group) ::part(nav) ::part(body) ::part(tabs)
>   iswc-tab: ::part(base) ::part(active-indicator)
>   iswc-tab-panel: ::part(base)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-tab-group>`, `<iswc-tab>`, `<iswc-tab-panel>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-tab-group activation="manual">…</iswc-tab-group>
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

- [JavaScript](./tab-group.js)
- [CSS](./tab-group.css)
- [Índice de categoría](./LLM.md)
- [Preview](./tab-group.json)

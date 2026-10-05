---
tag: iswc-tab-group
tags:
  - iswc-tab-group
  - iswc-tab
  - iswc-tab-panel
category: navigation
status: public
source: ./tab-group.ts
style: ./tab-group.css
preview: ./tab-group.json
---
# `<iswc-tab-group>` / `<iswc-tab>` / `<iswc-tab-panel>`

## PropÃ³sito

Tabs accesibles con navegaciÃ³n por teclado (â†/â†’), activaciÃ³n automÃ¡tica o
manual, indicator animado, placements (top/bottom/start/end), scroll horizontal
automÃ¡tico y soporte para tabs cerrables.

Este mÃ³dulo registra `<iswc-tab-group>`, `<iswc-tab>`, `<iswc-tab-panel>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './tab-group.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-tab-group active="general">
<iswc-tab slot="nav" panel="general">General</iswc-tab>
<iswc-tab-panel name="general">Contenido del panel.</iswc-tab-panel>
â€¦
</iswc-tab-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Fuente define default/restricciÃ³n. |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `activation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `url-key` | string | Opt-in: tab activo en `?s=` como `{ [url-key]: panel }` (b64url). VacÃ­o = off. |
| `without-scroll-controls` | boolean | Fuente define default/restricciÃ³n. |
| `panel` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `closable` | boolean | Fuente define default/restricciÃ³n. |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `nav` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `activation` | lectura/escritura | Declarada por clase. |
| `urlKey` | lectura/escritura | Key dentro de `?s=`; vacÃ­o desactiva. |

### Slots

| Slot | Uso |
| --- | --- |
| `nav` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `end` | Contenido proyectado. |
| `close-button` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-tab-show` | Evento personalizado del componente (tab show). |
| `iswc-tab-close` | Evento personalizado del componente (tab close). |
| `iswc-tab-hide` | Evento personalizado del componente (tab hide). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-tab-show` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-tab-close` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-tab-hide` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-tab-group');
el.addEventListener('iswc-tab-show', (e) => {
  console.log('iswc-tab-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--track-color` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--indicator-color` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--track-width` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-tab-group>, <iswc-tab>, <iswc-tab-panel> â€” Web Components (vanilla, zero dependencies).
> Tres componentes cohabitantes:
>   <iswc-tab-group active="general" placement="top" activation="auto">
>     <iswc-tab slot="nav" panel="general">General</iswc-tab>
>     <iswc-tab slot="nav" panel="custom" disabled>Custom</iswc-tab>
>     <iswc-tab-panel name="general">â€¦</iswc-tab-panel>
>     <iswc-tab-panel name="custom">â€¦</iswc-tab-panel>
>   </iswc-tab-group>
> Atributos <iswc-tab-group>
>   active        string   â€” nombre del panel activo.
>   placement     top | bottom | start | end  (default 'top')
>   activation    auto | manual (default 'auto')
>   without-scroll-controls  boolean (default false)
>   url-key       string   â€” opt-in: tab activo en ?s= como { [url-key]: panel }
> Atributos <iswc-tab>
>   panel         string   â€” nombre del panel al que apunta (required).
>   disabled      boolean
>   closable      boolean  â€” muestra un botÃ³n de cerrar (slot close-button).
> Atributos <iswc-tab-panel>
>   name          string   â€” id Ãºnico dentro del tab-group (required).
> Slots
>   <iswc-tab-group>
>     nav        â€” tabs (se proyectan automÃ¡ticamente).
>     (default)  â€” paneles.
>   <iswc-tab>
>     (default)   label del tab.
>     start       icono al inicio.
>     end         icono al final.
>     close-button  botÃ³n de cerrar (cuando closable).
>   <iswc-tab-panel>
>     (default)  contenido del panel.
> Eventos
>   iswc-tab-show   detail: { name, panel, tab } â€” al activar un panel.
>   iswc-tab-hide   detail: { name, panel, tab } â€” al ocultar un panel.
>   iswc-tab-close  detail: { tab, name }  â€” cuando se hace click en el close-btn de un iswc-tab closable.
> CSS Parts
>   iswc-tab-group: ::part(tab-group) ::part(nav) ::part(body) ::part(tabs)
>   iswc-tab: ::part(base) ::part(active-indicator)
>   iswc-tab-panel: ::part(base)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-tab-group>`, `<iswc-tab>`, `<iswc-tab-panel>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-tab-group activation="manual">â€¦</iswc-tab-group>
```

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

- [JavaScript](./tab-group.ts)
- [CSS](./tab-group.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./tab-group.json)

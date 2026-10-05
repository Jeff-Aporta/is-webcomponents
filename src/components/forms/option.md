---
tag: iswc-option
tags:
  - iswc-option
category: forms
status: public
source: ./option.ts
style: ./option.css
preview: ./option.json
---
# `<iswc-option>`

## PropÃ³sito

Input + listbox filtrable con teclado y opciones iswc-option.

Este mÃ³dulo registra `<iswc-option>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './option.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-combobox label="Ciudad" clearable>
<iswc-option value="bog">BogotÃ¡</iswc-option>
<iswc-option value="med">MedellÃ­n</iswc-option>
</iswc-combobox>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `selected` | boolean | Fuente define default/restricciÃ³n. |
| `group` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `selected` | lectura/escritura | Declarada por clase. |
| `group` | lectura/escritura | Declarada por clase. |
| `description` | solo lectura | Declarada por clase. |
| `label` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `description` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-option');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `description` | Personalizable con `::part(description)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-brand-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-700` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-option> â€” OpciÃ³n para iswc-combobox / iswc-select (listboxes).
> Atributos: value, disabled, selected, group
> Slots: default (etiqueta), start (icono/avatar), description (texto secundario)
> Parts: base, start, label, description

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-option>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-selected`, `aria-disabled`.

## Ejemplo avanzado

```html
<iswc-combobox label="Ciudad" clearable>
<iswc-option value="bog">BogotÃ¡</iswc-option>
<iswc-option value="med">MedellÃ­n</iswc-option>
</iswc-combobox>
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

- [JavaScript](./option.ts)
- [CSS](./option.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./option.json)

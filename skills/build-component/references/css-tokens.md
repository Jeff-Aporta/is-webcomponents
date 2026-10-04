# CSS tokens

Cómo usar **tokens `--iswc-*`** (tema, paletas, espaciado, radio,
tipografía) en el CSS de un componente del kit, y cómo no abusar de
los hex literales.

## 1. El prefijo `--iswc-*` es ley

- **Canónico**: `--iswc-bg`, `--iswc-text`, `--iswc-border`,
  `--iswc-color-brand-500`, `--iswc-foo-border-radius`, etc.
- **Legacy (migrar si aparece)**: `--pg-*` (prefijo de un sistema
  anterior). El kit está migrando a `--iswc-*` y los tests lo
  comprueban (`tests/theme-contract.test.mjs`).
- **Privado del componente**: prefijo `--_foo` para variables que solo
  viven dentro del Shadow DOM.

## 2. Familias de tokens

### Tema (`data-theme="light|dark"` en `<html>`)

Definidos en `src/styles/is-base.css`. Cubre:

- Fondo y superficies: `--iswc-bg`, `--iswc-surface`, `--iswc-surface-2`.
- Texto: `--iswc-text`, `--iswc-text-muted`, `--iswc-text-strong`.
- Bordes: `--iswc-border`, `--iswc-border-strong`, `--iswc-divider`.
- Estados: `--iswc-focus`, `--iswc-hover`, `--iswc-active`.
- Acento (default brand): `--iswc-accent`, `--iswc-on-accent`.

### Paleta (`data-palette="insoft|contapyme|agrowin"`)

Definidos en `src/styles/palettes.css`. Cada paleta sobrescribe:

- `--iswc-color-brand-50` … `--iswc-color-brand-900`.
- `--iswc-brand-soft`, `--iswc-brand-soft-active`, `--iswc-brand-text`.
- Análogo para `success`, `warning`, `danger`, `info`, `neutral`.

### Componente

Variables propias del componente, con prefijo
`--iswc-<componente>-*`:

- Geometría: `--iswc-button-border-radius`, `--iswc-button-height`.
- Tipografía: `--iswc-button-font-family`, `--iswc-button-font-weight`.
- Transiciones: `--iswc-button-transition-duration`.
- Privadas del Shadow: `--_bg`, `--_bg-hover`, `--_text`.

## 3. Cómo se consumen en un componente

```css
/* src/components/actions/foo.css */
:host {
  /* Defaults razonables; los consumidores pueden sobreescribirlos */
  --iswc-foo-border-radius: 6px;
  --iswc-foo-transition-duration: 120ms;

  /* Roles internos que el theme y la paleta rellenan */
  --_bg:        var(--iswc-control-bg,        #f1f3f5);
  --_bg-hover:  var(--iswc-control-bg-hover,  #e9ecef);
  --_text:      var(--iswc-control-text,      #212529);
  --_border:    var(--iswc-control-border,    #dee2e6);
  --_focus:     var(--iswc-focus,             var(--iswc-color-brand, dodgerblue));

  /* Roles del tema/paleta */
  --_tone:        var(--iswc-color-brand);
  --_tone-strong: var(--iswc-color-brand-600);
  --_tone-soft:   var(--iswc-brand-soft);

  display: inline-flex;
}

.foo {
  background: var(--_bg);
  color:      var(--_text);
  border: 1px solid var(--_border);
  border-radius: var(--iswc-foo-border-radius);
  transition: background var(--iswc-foo-transition-duration);
}
.foo:hover { background: var(--_bg-hover); }
.foo:focus-visible { outline: 2px solid var(--_focus); }
```

Reglas:

- Cada `var(--token)` debe tener un **fallback final** explícito
  (`var(--iswc-control-bg, #f1f3f5)`). El fallback es la **red de
  seguridad** si el tema/paleta no se cargaron, **no** el valor por
  defecto. Si el token no es crítico, fallback `transparent`,
  `currentColor`, `inherit`.
- **No** escribas `#fff` o `rgba(0,0,0,0.1)` en selectores de uso.
  Solo en el fallback de una custom property en `:host`.
- **No** declares un token nuevo sin antes comprobar que no existe uno
  ya con la misma intención (`is-base.css`, `palettes.css`,
  `_shared/host-base.css`).

## 4. Customización por atributo (`static styleAttrs`)

`ElementBase` permite mapear un atributo del host a una CSS custom
property del `:host` sin escribir CSS adicional:

```ts
class IswcButton extends ElementBase {
  static styleAttrs = {
    radius: '--iswc-button-border-radius',
    'border-width': '--iswc-button-border-width',
    'font-weight': '--iswc-button-font-weight',
    'font-family': '--iswc-button-font-family',
    'transition-duration': '--iswc-button-transition-duration',
  };
}
```

El consumidor puede entonces:

```html
<iswc-button radius="12px" font-weight="700">Personalizado</iswc-button>
```

`ElementBase.connectedCallback` y `attributeChangedCallback` se
encargan de sincronizar el atributo con la custom property.

Para **colores** (no tamaños), usa el `onlyColorValues: true` para
defenderte de entradas inválidas:

```ts
static styleAttrs = {
  'color-hover':  { prop: '--_tone-stronger',  onlyColorValues: true },
  'color-active': { prop: '--_tone-strongest', onlyColorValues: true },
  'color-text':   { prop: '--_tone-on',        onlyColorValues: true },
};
```

## 5. Sombras

Las sombras también se tokenizan:

```css
:host {
  --iswc-foo-shadow:
    0 1px 2px var(--iswc-shadow-color, rgba(0, 0, 0, 0.1)),
    0 4px 8px var(--iswc-shadow-color, rgba(0, 0, 0, 0.08));
}
```

El kit tiene `--iswc-shadow-color` global para que el tema controle
la opacidad. Evita hardcodear la opacidad en el componente.

## 6. Trampas

- **No** uses `--pg-*` en código nuevo. Es legacy. Si lo ves en un
  componente viejo, migra.
- **No** declares una variable `--iswc-foo` en el `:host` con un valor
  que ya existe en otro componente (`--iswc-foo-radius` vs
  `--iswc-button-radius`). Si el comportamiento es compartido, súbelo
  a `--iswc-control-radius` en `is-base.css`.
- **No** uses `var(--iswc-color-brand)` esperando un valor único: hay
  una rampa (`--iswc-color-brand-50` a `--iswc-color-brand-900`).
  Decide qué nivel de la rampa quieres.
- **No** confundas `var(--token)` con `var(--token, fallback)`:
  siempre con fallback (incluso si es `transparent`).
- **No** escribas un valor como `#ae3ec9` y lo declares "tema
  custom": crea una custom property `--iswc-foo-tema-x` en la paleta
  y consúmela vía `var(...)`.
- **No** asumas que el tema está cargado: en tests aislados, `is-base.css`
  puede no estar importado y los tokens son `unset`. Por eso los
  fallbacks son obligatorios.

## 7. Verificación

Antes de hacer PR, corre:

```bash
node tests/theme-contract.test.mjs
```

Este test:

- Verifica que los 2 temas (`light`, `dark`) están definidos.
- Verifica que las 3 paletas (`insoft`, `contapyme`, `agrowin`)
  declaran las ramps `--iswc-color-brand-*`, `--iswc-color-success-*`,
  etc.
- Busca hex literales en CSS de componentes que **no** estén dentro
  de un `var(--iswc-*, …)`.

Si tu componente introduce tokens nuevos, **primero** añádelos a
`is-base.css` o a la paleta correspondiente, y **luego** consúmelos
en el `.css` del componente.

## 8. Checklist

- [ ] Todas las variables consumidas con `var(--token, fallback)`.
- [ ] Ningún hex literal fuera del fallback final de una custom
      property.
- [ ] Ningún `--pg-*` en código nuevo.
- [ ] Tokens nuevos añadidos a `is-base.css` o `palettes.css` antes de
      consumirse.
- [ ] `static styleAttrs` para atributos de personalización obvios
      (radius, font-weight, duration).
- [ ] `tests/theme-contract.test.mjs` pasa.

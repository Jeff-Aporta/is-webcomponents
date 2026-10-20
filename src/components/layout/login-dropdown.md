---
tag: iswc-login-dropdown
tags:
  - iswc-login-dropdown
category: layout
status: public
source: ./login-dropdown.ts
style: ./login-dropdown.css
preview: ./login-dropdown.json
---
# `<iswc-login-dropdown>`

## Propósito

Acceso compacto para la barra: un botón "Entrar" que despliega usuario/contraseña (y opcionalmente
pegar un token), con paso de elección entre opciones (p. ej. empresas de un usuario multi-empresa).
No autentica, no hace fetch y no guarda credenciales ni tokens: emite `iswc-login-submit` y la app
responde con `loading`, `error`, `choices` o `reset()`. Reusa `<iswc-login compact>` y
`<iswc-dropdown>`. Contrato WHAT: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md)
(S-AP12…S-AP16).

## Cuándo usarlo

- Acceso en la barra de una app (normalmente dentro de `<iswc-session-menu>`).
- Login con token pegado para entornos de soporte o pruebas (`modes="password token"`).

## Cuándo no usarlo

- Pantalla de login a página completa o con multi-cuenta/sesiones: usa `<iswc-login>`.
- Zona pública + protegida: `<iswc-login-gate>`.

## Importación

```js
await L.load('iswc-login-dropdown');
```

Dentro de `<iswc-app-shell>` la paleta de marca se carga sola. Usado sin shell, pide la paleta
(`await L.loadPageStyles(['iswc-palettes-default'])`) o los botones quedan en la base neutra.
Iconos locales (sin api.iconify.design): ver `app-shell.md` → «Iconos sin depender de api.iconify.design».

## Ejemplo mínimo

```html
<iswc-login-dropdown id="acceso" modes="password token"></iswc-login-dropdown>
<script type="module">
  acceso.addEventListener('iswc-login-submit', async (e) => {
    acceso.loading = true;
    try {
      await miApi.login(e.detail);          // la app decide cómo autenticar
      acceso.reset();
    } catch (err) {
      acceso.error = err.message;
    } finally {
      acceso.loading = false;
    }
  });
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string | Texto del disparador (default "Entrar"; se oculta < 52rem). |
| `heading` | string | Título opcional del panel. |
| `placement` | placement | Default `bottom-end` (los de `<iswc-dropdown>`). |
| `modes` | string | `password` (default), `token` o `password token` (muestra selector). |
| `remember` | boolean | Estado inicial de "Recordar". |
| `open` | boolean | Panel abierto (reflejado). |
| `password-label`, `token-label` | string | Rótulos de los modos (default "Usuario", "Token"). |
| `token-placeholder` | string | Default "Pega el token". |
| `choices-heading` | string | Texto sobre la lista (default "Elige con cuál entrar"). |
| `back-label` | string | Default "Volver". |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `error` | string | Mensaje visible en el panel; `''` lo quita. |
| `loading` | boolean | Bloquea el envío y muestra carga. |
| `choices` | `{ id, label, icon? }[]` | Si no está vacío, muestra la lista en lugar del formulario. |
| `open` | boolean | Atajo del atributo. |

### Slots

Ninguno.

### Eventos

| Evento | `detail` | Cuándo |
| --- | --- | --- |
| `iswc-login-submit` | `{ mode, username, password, remember, provider?, token?, choice? }` | Envío válido (botón o Enter; en token, Ctrl/Cmd+Enter). Uno por envío. |

`mode` es `'password'` o `'token'`. Al elegir una opción de `choices` se reemite con las
credenciales del envío anterior más `choice`.

### Métodos y propiedades públicas

| Método | Qué hace |
| --- | --- |
| `show()` / `hide()` | Abre/cierra el panel. |
| `reset()` | Sin error, sin carga, sin opciones, contraseña y token vacíos, panel cerrado. |

### CSS parts

| Part | Nodo |
| --- | --- |
| `trigger` | Botón "Entrar". |
| `panel`, `heading` | Contenido del desplegable y su título. |
| `modes`, `mode` | Selector de modo y cada opción. |
| `login` | El `<iswc-login compact>` interno. |
| `token`, `token-input`, `error` | Modo token, su campo y su error. |
| `choices`, `choice`, `back` | Lista de opciones, cada opción y "Volver". |

### Custom states

| State | Cuándo | Uso |
| --- | --- | --- |
| `loading` | `loading = true` | `iswc-login-dropdown:state(loading)` |
| `choosing` | Hay `choices` | `iswc-login-dropdown:state(choosing)` |
| `open` | Panel abierto | `iswc-login-dropdown:state(open)` |

### CSS custom properties

| Variable | Default |
| --- | --- |
| `--iswc-login-dropdown-width` | `20em` |
| `--iswc-login-dropdown-surface`, `--iswc-login-dropdown-border` | `--iswc-surface`, `--iswc-border` |
| `--iswc-login-dropdown-radius`, `--iswc-login-dropdown-shadow` | radio y sombra del panel |

## Comportamiento

- Todo en `em`: cambia `font-size` del host y escala el panel completo.
- Al abrir enfoca el usuario (o el token, o la primera opción).
- `remember` solo viaja como booleano en el evento. **El kit no guarda contraseñas**: si la app
  quiere recordar, que use el gestor de contraseñas del navegador (los campos traen `autocomplete`).

## Dependencias y componentes relacionados

`<iswc-dropdown>`, `<iswc-login>`, `<iswc-button>`, `<iswc-icon>`, `<iswc-callout>`. Lo usa
`<iswc-session-menu>`.

## Accesibilidad

- El disparador tiene `aria-label`, `aria-haspopup`, `aria-expanded` (de `<iswc-dropdown>`).
- El selector de modo es `tablist` con flechas/Home/End.
- Los errores son `role="alert"`. Escape cierra y devuelve el foco al disparador.

## Ejemplo avanzado

```js
acceso.addEventListener('iswc-login-submit', async ({ detail }) => {
  const r = await miApi.login(detail);
  if (r.empresas) acceso.choices = r.empresas.map((x) => ({ id: x.id, label: x.nombre }));
  else acceso.reset();
});
```

## Errores comunes

- Escuchar el evento de `<iswc-login>` interno: no sale; el host emite uno solo, ya completo.
- Guardar la contraseña en `localStorage`/`sessionStorage` "para recordar": no lo hagas.

## Reglas para LLM

- Nada de fetch ni tokens dentro del tag; la app resuelve con el evento.
- Mismo nombre de evento que `<iswc-login>` (`iswc-login-submit`); distingue por `detail.mode`.
- `choices` generaliza "terceros/empresas": no añadas campos de dominio.

## Fuentes

- `src/components/layout/login-dropdown.ts`, `login-dropdown.scss`.
- Spec: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md).

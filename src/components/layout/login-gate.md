---
tag: iswc-login-gate
tags:
  - iswc-login-gate
category: layout
status: public
source: ./login-gate.ts
style: ./login-gate.css
preview: ./login-gate.json
---
# `<iswc-login-gate>`

## Propósito

Cortina de acceso: muestra el contenido público (o un mockup) y pide iniciar sesión antes de
revelar la parte protegida. Envuelve y reutiliza `<iswc-login>` para la puerta de acceso, sin
reinventar la lógica de login. Pensado para que una API sirva el shell con una zona pública y
otra protegida, y el front solo conmute el atributo `logged`.

## Cuándo usarlo

- Landing o panel con una parte pública y una privada detrás de login.
- APK y web: mismo componente responsive para ambos.
- Cuando el login debe reutilizar el contrato de `<iswc-login>` (eventos, multi-cuenta, sesiones).

## Cuándo no usarlo

- Si la app no tiene zona pública: usa `<iswc-login>` directamente.
- Si el flujo de acceso no es por eventos (por ejemplo, redirección server-side).

## Importación

```html
<script type="module" src="./dist/cdn/core/loader.min.js"></script>
```

El registrador de la app (generado por el build) carga `iswc-login-gate` y sus dependencias
(`iswc-login`, `iswc-callout`) por CDN.

## Ejemplo mínimo

```html
<iswc-login-gate heading="Iniciar sesión" subtitle="Accede al panel" provider="ERP">
  <div slot="public">Contenido público o mockup…</div>
  <erp-panel slot="protected">Contenido protegido…</erp-panel>
</iswc-login-gate>
```

El host escucha `iswc-login-submit` en el documento y, al validar, pone `logged`:

```js
document.addEventListener('iswc-login-submit', async (e) => {
  const ok = await api.login(e.detail.username, e.detail.password);
  if (ok) gate.logged = true;
});
```

## API

- **Atributos:** `logged`, `heading`, `subtitle`, `provider`, `providers`, `mode`, `busy`, `error`, `notice`.
- **Slots:** `public` (antes de entrar), `protected` (con `logged`).
- **Parts:** `curtain`, `login`, `protected`.
- **Propiedades:** `logged` (boolean, reflected).

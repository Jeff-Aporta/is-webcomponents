---
name: is-cdn-install
description: >-
  Instala y consume el kit IS Web Components solo por CDN (jsDelivr / GitHub Pages),
  sin npm ni npx. Cubre bootstrap (is-base + palettes + .min.js), espejos, pin por
  SHA, boot con fallback, y lectura de docs vía is-cdn-snippet. Usar cuando el
  usuario pida instalar is-*, enlaces CDN, all.min.js, category.*.min.js,
  mirrors, o copiar el panel Consumo por CDN.
---

# IS Web Components — instalación por CDN

## Regla absoluta

- **No** `npm install` / `npx` del kit (aún no es el canal oficial).
- **Un solo origen** por página: no mezclar jsDelivr + Pages en el mismo documento (rompe imports relativos).
- En el `<head>` solo van **tema + paletas + JS**. El CSS de cada `is-*` lo carga el propio componente.

## Skill publicada (léela primero)

| Canal | URL |
| --- | --- |
| Raw (texto en navegador) | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-cdn-install/SKILL.md` |
| CDN jsDelivr | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-cdn-install/SKILL.md` |
| Pages | `https://jeff-aporta.github.io/is-webcomponents/dist/cdn/skills/is-cdn-install/SKILL.md` |

Skill general del kit (reuso de tags, arquitectura): `src/skills/is-webcomponents/SKILL.md` (misma carpeta en `dist/cdn/skills/`).

## Espejos

| id | Base | Pin SHA |
| --- | --- | --- |
| `jsdelivr` (primario) | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<ref>/dist/cdn` | Sí (`@sha` o `@main`) |
| `pages` (reserva) | `https://jeff-aporta.github.io/is-webcomponents/dist/cdn` | No (tip desplegado) |

`<ref>` preferido: **commit SHA** de `main`. `@main` solo si la app declara seguimiento continuo.

## Bootstrap mínimo

```html
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/is-base.min.css">
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/palettes.min.css">
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/all.min.js"></script>
</head>
<body>
  <is-toast placement="bottom-end"></is-toast>
</body>
</html>
```

### Qué JS elegir

| Necesidad | Archivo |
| --- | --- |
| App / preview completa | `all.min.js` |
| Solo una categoría | `<cat>/category.<cat>.min.js` |
| Un tag | `<cat>/<name>.min.js` (ej. `actions/button.min.js` → `<is-button>`) |

## Boot con fallback (si un espejo cae)

Probar bases **en orden**, siempre el mismo `base` para CSS y JS:

1. jsDelivr `@<sha>` (o `@main`)
2. GitHub Pages

Plantilla (misma idea que el tab **Mirrors** de `<is-cdn-snippet>`):

```html
<script type="module">
const MIRRORS = [
  "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn",
  "https://jeff-aporta.github.io/is-webcomponents/dist/cdn",
];
async function boot(files) {
  for (const base of MIRRORS) {
    try {
      for (const href of files.css) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${base}/${href}`;
        document.head.append(link);
      }
      await Promise.all(files.js.map((f) => import(`${base}/${f}`)));
      return base;
    } catch (e) {
      console.warn("[is-wc] mirror falló", base, e);
    }
  }
  throw new Error("[is-wc] ningún espejo respondió");
}
await boot({
  css: ["is-base.min.css", "palettes.min.css"],
  js: ["all.min.js"],
});
</script>
```

## Panel `<is-cdn-snippet>` (galería)

En la demo del kit, cada preview monta el panel **Consumo por CDN**:

- Tab **Enlaces**: CSS común + JS del tag / categoría / `all.min.js` del espejo activo.
- Tab **Mirrors**: cambiar espejo + copiar boot con fallback.
- Bloque **Para agentes / LLM**: prompt + enlaces MD (módulo, categoría, índice, **esta skill**).

Al instalar en otra app, **copia los mismos URLs** que muestra el panel (no inventes rutas).

## Docs API (después del bootstrap)

1. Índice: `src/components/LLM.md`
2. Categoría: `src/components/<carpeta>/LLM.md`
3. Módulo: `src/components/<carpeta>/<modulo>.md`

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/`

No inventar props/eventos que no estén en el MD.

## Checklist de instalación

- [ ] Solo CDN (sin npm del kit)
- [ ] Un solo espejo / un solo `base` en la página
- [ ] `is-base.min.css` + `palettes.min.css` en `<head>`
- [ ] JS: tag **o** category **o** `all.min.js`
- [ ] `data-theme` + `data-palette` en `<html>`
- [ ] Pin `@<sha>` (o `@main` justificado)
- [ ] Skill + MD del módulo leídos antes de componer UI

## Prohibido

- Mezclar orígenes CDN en la misma página
- Meter CSS de componentes del kit en el `<head>`
- Usar Iconify CDN / Chart.js / MUI cuando el kit cubre el caso
- Asumir que Pages pinnea el mismo SHA que jsDelivr

## Más detalle

- Espejos y resolución de ref: [reference.md](reference.md)
- Skill de reuso de tags: `../is-webcomponents/SKILL.md`

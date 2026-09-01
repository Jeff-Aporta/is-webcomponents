---
name: is-cdn-install
description: >-
  Instala y consume el kit IS Web Components solo por CDN (jsDelivr / GitHub Pages),
  sin npm ni npx. Cubre bootstrap (is-base + palettes + .min.js), espejos, pin por
  SHA, boot con fallback, y lectura de docs vía is-cdn-snippet. Usar cuando el
  usuario pida instalar is-*, enlaces CDN, loader.min.js, L.load,
  mirrors, o copiar el panel Consumo por CDN.
---

# IS Web Components — instalación por CDN

## Regla absoluta

- **No** `npm install` / `npx` / `yarn` / `pnpm` / `bun` / bundler (`vite`, `webpack`, …) del kit (no hay canal npm; no hace falta build step para consumirlo).
- **Un solo origen** por página: no mezclar jsDelivr + Pages en el mismo documento (rompe imports relativos).
- En el `<head>` solo van **tema + paletas + JS**. El CSS de cada `is-*` lo carga el propio componente.
- Si la app no puede depender de red en runtime: usar copia **local** en vez de CDN puro — ver [`/is-webcomponents:local`](../is-webcomponents/tools/local.md) en la skill del kit.

## Prompt LLM y herramientas

Prompt completo listo para copiar: [`../is-webcomponents/PROMPT.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/PROMPT.md).
Herramientas tipo slash del kit: [`../is-webcomponents/tools/`](https://github.com/Jeff-Aporta/is-webcomponents/tree/main/src/skills/is-webcomponents/tools) —
en particular [`/is-webcomponents:local`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/tools/local.md) para vendorizar el kit y bootear local-first.

## Skill publicada (léela primero)

Los agentes instalan/siguen mejor skills desde URLs de **repo de GitHub**. Usa raw solo para lectura como texto plano.

| Canal | URL |
| --- | --- |
| GitHub (preferido) | `https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md` |
| Raw (texto plano) | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-cdn-install/SKILL.md` |
| CDN jsDelivr | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-cdn-install/SKILL.md` |
| Pages | `https://jeff-aporta.github.io/is-webcomponents/dist/cdn/skills/is-cdn-install/SKILL.md` |

Skill general del kit (reuso de tags, arquitectura, prompt, herramientas): [`src/skills/is-webcomponents/SKILL.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/SKILL.md) (misma carpeta en `dist/cdn/skills/`).

## Espejos

| id | Base | Pin SHA |
| --- | --- | --- |
| `jsdelivr` (primario) | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<ref>/dist/cdn` | Sí (`@sha` o `@main`) |
| `pages` (reserva) | `https://jeff-aporta.github.io/is-webcomponents/dist/cdn` | No (tip desplegado) |

`<ref>` preferido: **commit SHA** de `main`. `@main` solo si la app declara seguimiento continuo.

## Bootstrap mínimo (loader — preferido)

```html
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/core/loader.min.js"></script>
  <script type="module">
    const L = globalThis.ISWebComponentsLoader;
    await L.loadCSSBase();
    await L.loadCSSPalettesDefault();
    await L.load('is-button'); // o 'actions' | 'all'
  </script>
</head>
<body>
  <is-button>Hola</is-button>
</body>
</html>
```

Alcance de `load(…)`:

| Necesidad | Argumento |
| --- | --- |
| Un tag | `'is-button'` |
| Una categoría | `'actions'` |
| Kit completo | `'all'` |

La galería lo pinta en `<is-cdn-snippet>` (copy-paste del loader + `L.load(tag)`).

`load('all')` / `load('actions')` expanden a cada `<cat>/<file>.min.js`. No se publican `all.min.js` ni `category.*.min.js`.

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
  js: ["loader.min.js"],
});
</script>
```

## Panel `<is-cdn-snippet>` (galería)

En la demo del kit, cada preview monta el panel **Consumo por CDN**:

- Copy-paste: `loader.min.js` + `L.loadCSS*` + `L.load(tag)`.
- Bloque **Para agentes / LLM**: prompt + enlaces MD.

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
- [ ] `loader.min.js` + `L.loadCSSBase` + `L.loadCSSPalettesDefault` + `L.load(tags…)`
- [ ] JS: solo los tags de la vista (no `all.min.js`)
- [ ] `data-theme` + `data-palette` en `<html>`
- [ ] Pin `@<sha>` (o `@main` justificado, o copia local vía `/is-webcomponents:local`)
- [ ] Skill + MD del módulo leídos antes de componer UI

## Prohibido

- Mezclar orígenes CDN en la misma página
- Meter CSS de componentes del kit en el `<head>`
- Usar Iconify CDN / Chart.js / MUI cuando el kit cubre el caso
- Asumir que Pages pinnea el mismo SHA que jsDelivr
- `npm`/`npx`/`yarn`/`pnpm`/`bun`/`vite`/`webpack` para instalar o servir el kit

## Más detalle

- Prompt LLM completo: [`../is-webcomponents/PROMPT.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/PROMPT.md)
- Herramientas `/is-webcomponents:build|migrate|local`: [`../is-webcomponents/tools/`](https://github.com/Jeff-Aporta/is-webcomponents/tree/main/src/skills/is-webcomponents/tools)
- Espejos y resolución de ref: [reference.md](reference.md)
- Skill de reuso de tags: `../is-webcomponents/SKILL.md`

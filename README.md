# IS Web Components

Galería de [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) vanilla de InSoft (`is-*`).

## Demo (GitHub Pages)

**https://jeff-aporta.github.io/is-webcomponents/**

## Uso local

```bash
# Servir la raíz del repo (ES modules necesitan HTTP)
npx --yes serve .
```

Abre la URL que imprima `serve` (p. ej. `http://localhost:3000`).

## CDN (build)

```bash
npm install
npm run build
```

Artefactos en `dist/cdn/` (`{name}.min.js` + `{name}.min.css` + `is-base.min.css`).

## Estructura

| Ruta | Contenido |
|------|-----------|
| `components/` | Fuentes por categoría (`actions`, `feedback`, `helpers`, …) |
| `previews/` | Docs + demos por componente |
| `styles/` | Tokens (`is-base.css`) y shell |
| `manifest.js` | Índice de la galería |
| `skills/is-webcomponents/` | Skill para agentes IDE (Cursor, Claude Code, …) — **solo fuente**, no en `dist/` |
| `components/**/*.md` | Docs LLM por módulo / categoría — **solo fuente** (raw.githubusercontent) |

## Skill para agentes IDE

Obliga a reusar los tags `is-*` del kit al fundar o extender apps consumidoras. Los MD de skill y de LLM viven en el repo fuente; `dist/cdn` solo lleva JS/CSS del kit.

```bash
npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents
```

Prompt para pegarle al LLM (también en cada `<is-cdn-snippet>`):

```
Instala en este entorno la skill is-webcomponents del repo Jeff-Aporta/is-webcomponents.
Ejecuta exactamente: npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents
La skill vive en skills/is-webcomponents/ del repo (fuente), no en dist/.
Tras instalarla, úsala siempre que construyas o edites UI con el kit is-* (CDN all.min.js / is-base / palettes):
reutiliza los tags is-* existentes; no reinventes botones, dialogs, tablas, charts, toasts ni iconos.
Consulta components/LLM.md y el MD del módulo antes de inventar API.
```

## Licencia

Uso interno InSoft / Jeff-Aporta salvo indicación contraria.

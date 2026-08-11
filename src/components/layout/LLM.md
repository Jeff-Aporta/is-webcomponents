# `layout` para LLM

## Propósito

Estructura, superficies, overlays y navegación por regiones de contenido.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-split-panel>` | [split-panel.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/split-panel.md) | Panel dividido |
| `<is-main>` | [main.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/main.md) | Main |
| `<is-card>` | [card.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/card.md) | Card |
| `<is-callout>` | [callout.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/callout.md) | Callout |
| `<is-details>` | [details.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/details.md) | Details |
| `<is-dialog>` | [dialog.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/dialog.md) | Dialog |
| `<is-drawer>` | [drawer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/drawer.md) | Drawer |
| `<is-divider>` | [divider.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/divider.md) | Divider |
| `<is-scrollspy>` | [scrollspy.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/scrollspy.md) | Scrollspy |
| `<is-dock>`, `<is-dock-item>` | [dock.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/dock.md) | Dock de accesos con magnificación |
| `<is-demo>` | (chrome de demos; ver `demo.js`) | Caja de demo de documentación |
| `<is-preview-component>` | (shell de docs; **no** está en catálogo loader) | Monta JSON `is-preview/v1` en la galería |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

**`<is-preview-component>`:** chrome homogéneo de la galería. Se publica en
`dist/cdn/layout/preview-component.min.js` y entra en `all.min.js`, pero **no**
figura en `categories.layout` del loader — `L.load('is-preview-component')` no
resuelve. La galería lo importa desde `dist/cdn/…` (nunca desde `src/`: Pages
404 lucide). Ver LLM raíz error **#42–#43** y `tests/gallery-boot.test.mjs`.

## Reusar antes de crear

- `../_shared/prefs.js`
- `../_shared/adopt-css.js`
- `../_shared/modal-base.js` / `modal-chrome.css` (ciclo de vida de dialog/drawer)
- Visor full-page de galería: `scripts/view-sources.js` (patrón de `is-dialog`
  a viewport completo) — no inventar otro overlay

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

Style-attrs de `<is-dialog>`: `width` → `--is-dialog-width`, `spacing` →
`--is-dialog-spacing`. Padding del host = `var(--is-dialog-spacing)`.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.
- **Full-page dialog:** `width="100vw"` + `spacing="0"` en el host; en light DOM
  `::part(dialog) { width/height: 100%; align-self/justify-self: stretch;
  border-radius: 0; box-shadow: none }`. Ver `presentation.css` + clase
  `.is-view-sources`.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.
- Si el dialog debe ocupar toda la pantalla, seguir el patrón view-sources
  (no hardcodear `min(96vw)` en el consumidor).

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.
- No usar `is-split-panel` con % alto como sidebar fijo de app.
- No dejar un dialog “casi fullscreen” cuando el requisito es full page
  (padding del host + `max-height` del panel lo dejan a medias).
- No importar `preview-component` desde `src/` en la galería/Pages (usar
  `dist/cdn/layout/preview-component.min.js`). Ver LLM raíz #42–#43.

## Errores conocidos y prevención

Añadir tamaños rígidos u overlays custom; usar em/context y dialog/drawer.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

**Dialog fuentes no full-page** (ago/2026): `--width: min(96vw)` + panel `70vh`
parecía grande pero no era full view. Fix: spacing 0 + stretch. Guardián:
`tests/gallery-sources-meta.test.mjs`.

**Boot galería FOUC / demos vacíos** (ago/2026): ver LLM raíz error **#43**.
Guardián: `tests/gallery-boot.test.mjs`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)

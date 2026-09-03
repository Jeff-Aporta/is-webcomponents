# `layout` para LLM

## PropÃ³sito

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## QuÃ© componente elegir

Elegir mÃ³dulo mÃ­nimo que cubra necesidad. Abrir referencia especÃ­fica; no inferir API desde nombre.

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
| `<is-dock>`, `<is-dock-item>` | [dock.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/dock.md) | Dock de accesos con magnificaciÃ³n |
| `<is-demo>` | (chrome de demos; ver `demo.js`) | Caja de demo de documentaciÃ³n |
| `<is-preview-component>` | (shell de docs; **no** estÃ¡ en catÃ¡logo loader) | Monta JSON `is-preview/v1` en la galerÃ­a |

## ComposiciÃ³n y relaciones

MÃ³dulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

**`<is-preview-component>`:** chrome homogÃ©neo de la galerÃ­a. Se publica en
`dist/cdn/preview/preview-component.min.js` es **chrome del sistema de preview** expuesto por CDN en la categoría `preview` (catálogo del loader)
figura en `categories.layout` del loader â€” `L.load('is-preview-component')` no
resuelve. La galerÃ­a lo importa desde `dist/cdn/â€¦` (nunca desde `src/`: Pages
404 lucide). Ver LLM raÃ­z error **#42â€“#43** y `tests/gallery-boot.test.ts`.

## Reusar antes de crear

- `../_shared/prefs.js`
- `../_shared/adopt-css.js`
- `../_shared/modal-base.js` / `modal-chrome.css` (ciclo de vida de dialog/drawer)
- Visor full-page de galerÃ­a: `scripts/view-sources.js` (patrÃ³n de `is-dialog`
  a viewport completo) â€” no inventar otro overlay

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y mÃ³dulos existentes.

Style-attrs de `<is-dialog>`: `width` â†’ `--is-dialog-width`, `spacing` â†’
`--is-dialog-spacing`. Padding del host = `var(--is-dialog-spacing)`.

## Patrones comunes

- Importar mÃ³dulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.
- **Full-page dialog:** `width="100vw"` + `spacing="0"` en el host; en light DOM
  `::part(dialog) { width/height: 100%; align-self/justify-self: stretch;
  border-radius: 0; box-shadow: none }`. Ver `presentation.css` + clase
  `.is-view-sources`.

## QuÃ© hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validaciÃ³n y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.
- Si el dialog debe ocupar toda la pantalla, seguir el patrÃ³n view-sources
  (no hardcodear `min(96vw)` en el consumidor).

## QuÃ© no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracciÃ³n si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.
- No usar `is-split-panel` con % alto como sidebar fijo de app.
- No dejar un dialog â€œcasi fullscreenâ€ cuando el requisito es full page
  (padding del host + `max-height` del panel lo dejan a medias).
- No importar `preview-component` desde `src/` en la galerÃ­a/Pages (usar
  `dist/cdn/preview/preview-component.min.js`). Ver LLM raÃ­z #42â€“#43.

## Errores conocidos y prevenciÃ³n

AÃ±adir tamaÃ±os rÃ­gidos u overlays custom; usar em/context y dialog/drawer.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

**Dialog fuentes no full-page** (ago/2026): `--width: min(96vw)` + panel `70vh`
parecÃ­a grande pero no era full view. Fix: spacing 0 + stretch. GuardiÃ¡n:
`tests/gallery-sources-meta.test.ts`.

**Boot galerÃ­a FOUC / demos vacÃ­os** (ago/2026): ver LLM raÃ­z error **#43**.
GuardiÃ¡n: `tests/gallery-boot.test.ts`.

## MÃ³dulos internos

No expone mÃ³dulos internos documentales en esta categorÃ­a.

## NavegaciÃ³n

- [Ãndice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)

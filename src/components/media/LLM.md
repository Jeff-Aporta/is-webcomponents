# `media` para LLM

## Propósito

Iconos, identidad visual y reproducción de video.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-icon>` | [icon.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/media/icon.md) | Icon |
| `<is-avatar>` | [avatar.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/media/avatar.md) | Avatar |
| `<is-video>` | [video.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/media/video.md) | Video |
| `<is-video-playlist>` | [video-playlist.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/media/video-playlist.md) | Video Playlist |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/icon-loader.js`
- `../_shared/adopt-css.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Crear loader paralelo o perder fallback/accesibilidad; reutilizar icon/video.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)

# Componentes · media

Multimedia: iconos, imagenes, video, audio y codigos.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-icon` | Icon | [icon.md](icon.md) |
| `iswc-avatar` | Avatar | [avatar.md](avatar.md) |
| `iswc-theme-img` | Theme Img | [theme-img.md](theme-img.md) |
| `iswc-figure` | Figure | [figure.md](figure.md) |
| `iswc-video` | Video | [video.md](video.md) |
| `iswc-speech` | Speech | [speech.md](speech.md) |
| `iswc-media-recorder` | Media Recorder | [media-recorder.md](media-recorder.md) |
| `iswc-video-playlist` | Video Playlist | [video-playlist.md](video-playlist.md) |
| `iswc-parallax-collage` | Parallax Collage | [parallax-collage.md](parallax-collage.md) |
| `iswc-ai-tool` | AI Tool | [ai-tool.md](ai-tool.md) |
| `iswc-person` | Person | [person.md](person.md) |
| `iswc-barcode` | Barcode | [barcode.md](barcode.md) |
| `iswc-barcode-scanner` | Barcode Scanner | [barcode-scanner.md](barcode-scanner.md) |
| `iswc-image-editor` | Image Editor | [image-editor.md](image-editor.md) |
| `iswc-icon-explorer` | Explorador de iconos | [icon-explorer.md](icon-explorer.md) |
| `iswc-qrcode` | QR Code | [qrcode.md](qrcode.md) |
<!-- /generado:componentes -->

## Reglas del dominio

- Los cuatro archivos de cada componente: `<nombre>.ts`, `<nombre>.scss`, `<nombre>.md` y `<nombre>.json`.
- El `.md` del componente es su ficha: props, eventos, slots y ejemplos.
- El `.json` es el contrato que leen la galeria, el audit y el constructor de apps.
- El SCSS entra por `@use 'iswc:css'` (el alias) o por el modulo compartido `kit`.
- El `.ts` lleva la cabecera `// @contexto INDICE.md · <md del dominio>`.

## Guardianes

- `tests/gobernanza/contrato-cuatro-archivos.test.ts` — los cuatro archivos de cada componente.
- `tests/gobernanza/componentes-contrato.test.ts` — props, eventos y slots contra el `.json`.
- `tests/gobernanza/sin-codigo-muerto.test.ts` — nada sin importador ni export sin consumidor.
- `tests/gobernanza/indice-md.test.ts` — cada tag tiene su md y el indice esta al dia.

## Documentos relacionados

- [INDICE.md](../../../../INDICE.md) — el indice de todos los documentos del kit.
- [specs/constitution.md](../../../../specs/constitution.md) — lo que no se negocia.

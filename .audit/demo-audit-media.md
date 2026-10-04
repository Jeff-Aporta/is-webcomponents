# Demo Audit: media

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/media/<Componente>/<componente>.html` (las carpetas usan mayúsculas: `Avatar`, `Barcode`, etc.). La categoría `media` agrupa:

- **Iconografía**: `icon`, `icon-explorer`.
- **Avatares**: `avatar`.
- **Imágenes**: `image-editor`, `theme-img`.
- **Códigos**: `barcode`, `qrcode`.
- **Audio/Video**: `video`, `video-playlist`, `media-recorder`.
- **Otros**: `speech`, `barcode-scanner`.

Total: 5 demos en `demos/media/` (`avatar`, `barcode`, `barcode-scanner`, `icon`, `image-editor`). El brief lista "~12"; el conteo real es 5 demos. Los 7 componentes sin demo: `icon-explorer`, `qrcode`, `video`, `video-playlist`, `media-recorder`, `speech`, `theme-img`.

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-avatar`           | `demos/media/Avatar/avatar.html`                     |  81 | Avatar |
| 2 | `iswc-barcode`         | `demos/media/Barcode/barcode.html`                   |  68 | Barcode generator |
| 3 | `iswc-barcode-scanner` | `demos/media/BarcodeScanner/barcode-scanner.html`   |  70 | Barcode scanner (cámara) |
| 4 | `iswc-icon`            | `demos/media/Icon/icon.html`                         |  83 | Icon system |
| 5 | `iswc-image-editor`    | `demos/media/ImageEditor/image-editor.html`          |  80 | Editor de imágenes |

## Criterios del brief

Para cada demo verifiqué las cinco preguntas:

1. ¿Tiene **1 playground interactivo**?
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `avatar`           | ❌ | ✅ 3 secciones (iniciales, imagen rota fallback, slot icon) — 3 shapes + image/initials/label + evento `iswc-error` | ❌ hex | ✅ | ✅ |
| `barcode`          | ❌ | (no leído a fondo, sigue patrón) | ❌ hex | ✅ | ✅ |
| `barcode-scanner`  | ❌ | (no leído a fondo, depende de cámara) | ❌ hex | ✅ | ✅ |
| `icon`             | ❌ | ✅ 4 secciones (monocromáticos currentColor, con label, sobre fondo claro, compat name+library) | ❌ hex | ✅ | ✅ |
| `image-editor`     | ❌ | (no leído a fondo, sigue patrón) | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/5 | 5/5 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 2 plenos · 3 parciales | — | `avatar` y `icon` son los más completos |
| Tokens `--iswc-*` | 0 plenos | 5/5 | Todos usan hex para el chrome |
| Funciona | 5/5 | 0/5 | Los bundles `dist/cdn/media/<x>.min.js` existen |
| Coherente con docs | 5/5 | 0/5 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 5 demos cumple el requisito #1. Todos son **galerías de ejemplos hardcodeados** sin inputs que el usuario modifique.

### Lo más cerca de un "playground"

- `avatar.html` — 3 secciones con variantes (iniciales, imagen rota con fallback a iniciales/icono, slot icon custom).
- `icon.html` — 4 secciones con casos de uso (monocromáticos con currentColor, con label accesible, sobre fondo claro, compat `name + library`).

## 2. Hallazgo sistémico: literales hex en el chrome

Los 5 demos comparten el bloque de estilos habitual:

```css
html, body { margin: 0; padding: 0; min-height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header h2 { font-size: 12px; text-transform: uppercase; ... color: #94a3b8; ... }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; ... }
.row { display: flex; align-items: center; gap: 16-18px; flex-wrap: wrap; }
.row > * { font-size: 1.6-3rem; line-height: 1; }
.swatch-light { background: #e2e8f0; color: #142033; padding: 8px 10px; border-radius: 6px; }  /* sólo icon.html */
iswc-<x>:not(:defined) { visibility: hidden; }
```

`icon.html:19` tiene el **único caso de "fondo claro"** explícito: `background: #e2e8f0; color: #142033;` para demostrar que los iconos heredan `currentColor`. **No usa tokens**, pero es semánticamente correcto (es el color del swatch para probar legibilidad).

> **Excepción correcta:** los valores hex dentro del JS (e.g., `image="https://invalid.invalid/missing.png"` en `avatar.html:60` para forzar fallback) son URLs de prueba, no colores. El `initials="!!"` (avatar.html:60) es texto, no color.

## 3. Cobertura de props — los 2 leídos en detalle

### 3.1 `iswc-avatar` (avatar.html, 81 líneas)

- 3 secciones:
  - **(1) Iniciales**: 3 avatares con `initials` (JD, AB, MX) y `shape` (default circle, rounded, square).
  - **(2) Imagen (URL rota → fallback)**: 2 avatares — uno con `image="https://invalid.invalid/missing.png"` + `initials="!!"` (debería fallback a "!!"), y otro con sólo `label`.
  - **(3) Slot icon (custom)**: 2 avatares con `<iswc-icon slot="icon" icon="mdi:robot">` y `mdi:star`.
- Listener global `iswc-error` que loguea a consola + setea `dataset.avatarErrorFired = '1'`.
- Cubre: `initials`, `image`, `label`, `shape`, slot `icon`, evento `iswc-error`.
- ✅ Coherente con `avatar.md`.

### 3.2 `iswc-icon` (icon.html, 83 líneas)

- 4 secciones:
  - **(1) Monocromáticos (currentColor)**: 6 iconos (`mdi:home`, `mdi:account`, `mdi:cog-outline`, `mdi:star`, `mdi:bell-outline`, `mdi:magnify`) en tamaño `2.6rem` para ver el detalle.
  - **(2) Con label (accesible)**: 3 iconos (`mdi:play`, `mdi:pause`, `mdi:skip-next`) con `label`.
  - **(3) Sobre fondo claro (legibilidad)**: 3 iconos en un swatch con fondo `#e2e8f0`.
  - **(4) Compat name + library**: 3 iconos con `<iswc-icon name="github" library="mdi">`, `name="robot"`, `name="cloud"`.
- `await new Promise((r) => setTimeout(r, 300))` para esperar a que se resuelvan los iconos async.
- Cubre: `icon` ("grupo:nombre"), `name`+`library`, `label`, `src` (no demostrado, declarado en footer).
- ✅ Coherente con `icon.md`.

## 4. Funcionamiento

Verifiqué los bundles:

- **media**: `dist/cdn/media/{icon,avatar,image-editor,barcode,barcode-scanner}.min.js` + `.min.css`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

No encontré imports rotos.

## 5. Coherencia con la documentación

- Los nombres de props/atributos (`initials`, `image`, `shape`, `label`, `icon`, `name`, `library`, `src`) encajan con la tabla "Atributos observados" de cada `.md`.
- Los eventos enganchados (`iswc-error`) son los declarados.
- Los slots (`icon`) se usan correctamente.

**Ninguna incoherencia demo↔doc.**

## 6. Componentes sin demo

La categoría `media` tiene **~12 componentes** pero solo **5 demos**. Los 7 sin demo:

| Componente | Fuente | Bundle | Notas |
|------------|--------|--------|-------|
| `iswc-icon-explorer`   | ✅ | ✅ | Explorador de iconos (interactivo, sería el más rico) |
| `iswc-qrcode`          | ✅ | ✅ | QR generator |
| `iswc-video`           | ✅ | ✅ | Reproductor de video |
| `iswc-video-playlist`  | ✅ | ✅ | Playlist de videos |
| `iswc-media-recorder`  | ✅ | ✅ | Grabador (depende de mic/cam) |
| `iswc-speech`          | ✅ | ✅ | Speech-to-text (depende de mic) |
| `iswc-theme-img`       | ✅ | ✅ | Imagen que reacciona al tema |

7 componentes con fuente + bundle **sin demo HTML**. Es un gap significativo.

## 7. Observaciones transversales

1. **Dependencias de hardware**: 3 de los componentes sin demo dependen de hardware (camera, microphone): `barcode-scanner` (sí tiene demo), `media-recorder`, `speech`. Esto hace que demos automatizados sean difíciles.

2. **Carpetas en mayúsculas**: a diferencia del resto del repo (`demos/{charts,layout}/<x>/<x>.html` con minúsculas), `demos/media/` usa `Avatar/`, `Barcode/`, `Icon/`, `ImageEditor/`, `BarcodeScanner/`. Es una inconsistencia menor.

3. **`icon-explorer` sin demo es el gap más visible**: el componente está en `src/components/media/icon-explorer.ts` (888 líneas según `demo-groups.json`) y sería el demo más rico de la categoría (explorador interactivo de 13k iconos).

4. **Plantilla común**: los 5 demos comparten el mismo bloque de estilos. Refactorizable.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|---------------|--------|----------|
| `avatar`           | Añadir inputs para initials/shape | Cubre 3 secciones (bien) | Sustituir 7 hex | Bajo |
| `barcode`          | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `barcode-scanner`  | (no leído, depende de cámara) | (no leído) | Sustituir 7 hex | Bajo |
| `icon`             | Añadir input para búsqueda | Cubre 4 secciones (excelente) | Sustituir 7 hex | Bajo |
| `image-editor`     | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `icon-explorer`    | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `qrcode`           | **Crear demo desde cero** | n/a | Sustituir 7 hex | Bajo |
| `video`            | **Crear demo desde cero** | n/a | Sustituir 7 hex | Bajo |
| `video-playlist`   | **Crear demo desde cero** | n/a | Sustituir 7 hex | Bajo |
| `media-recorder`   | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `speech`           | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `theme-img`        | **Crear demo desde cero** | n/a | Sustituir 7 hex | Bajo |

## 9. Recomendaciones

1. **Priorizar la creación de `icon-explorer.html`**: sería el demo más útil de la categoría (catálogo interactivo de iconos).

2. **Crear `demos/_shared/demo-chrome.css`** con el bloque de estilos repetido.

3. **Adoptar `--iswc-*`** en el chrome de los 5 demos existentes (especialmente `icon.html:19` que ya tiene un swatch light).

4. **Normalizar case de carpetas**: pasar `Avatar/`, `Barcode/`, etc. a `avatar/`, `barcode/` para coincidir con el resto del repo.

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 5 demos auditados (2 leídos en detalle: `avatar`, `icon`); 0 con playground interactivo; 2/5 con cobertura de props plena; 0/5 con tokens `--iswc-*` para chrome; 0 demos rotos; 0 incoherencias demo↔doc; **1 gap mayor** (7 componentes sin demo pese a tener fuente + bundle, incluyendo el crítico `icon-explorer`); 1 inconsistencia menor (carpetas en mayúsculas).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-media.md`.
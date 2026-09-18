# Checkpoint Tanda 8 — navigation + media

**Estado**: CERRADA ✓
**SHAs cierre**: 2d435f8fb6 (WT-0082), bfed2a64a1 (WT-0081)
**WT-RAMA base**: `wt-root-types-strong-2026`

## Resumen

- **Strict audit**: 3,222 → **~2,613** errores (−609)
- **typecheck**: verde
- **Tests**: 21/21 + browser-native-apis 11/11 PASS

## Archivos tocados (24 archivos)

### WT-0081 navigation/ (8 archivos, 82 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `tab-group.ts` | 19 → 0 | 88ea7b1241 |
| `tree.ts` | 21 → 0 | 7bc4b3c2c7 |
| `stepper.ts` | 12 → 0 | 35bd4e87fa |
| `carousel.ts` | 8 → 0 | dc6ac8869e |
| `mega-menu.ts` | 7 → 0 | 0b1ebed4fe |
| `breadcrumb-item.ts` | 6 → 0 | 886214e8db |
| `mega-menu.preview.ts` | 4 → 0 | 6a0d64502f |
| `scroller.ts` | 4 → 0 | 48c9de4359 |
| `breadcrumb.ts` | 1 → 0 | 44db4f42c0 |

### WT-0082 media/ (15 archivos, 287 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `video.ts` | 78 → 0 | e82894cd11 |
| `video-playlist.ts` | 66 → 0 | 3ffeda8484 |
| `image-editor.ts` | 55 → 0 | d521dd64b3 |
| `media-recorder.ts` | 26 → 0 | 1a00f4ad3e |
| `barcode-scanner.ts` | 15 → 0 | 7ccc538377 |
| `theme-img.ts` | 10 → 0 | c39e4c3733 |
| `icon.ts` | 9 → 0 | 7c967af358 |
| `image-editor.preview.ts` | 8 → 0 | 766a7804da |
| `video-playlist.preview.ts` | 7 → 0 | aea6bd4de7 |
| `speech.ts` | 9 → 0 | 983274b776 |
| `avatar.ts` | 7 → 0 | 340ecc42ab |
| `qrcode.ts` | 4 → 0 | 094cdcd530 |
| `barcode.ts` | 3 → 0 | bc1439abe0 |
| `video.preview.ts` | 2 → 0 | fcd967d50a |
| `icon.preview.ts` | 1 → 0 | e3eb77fca6 |

## Decisiones técnicas no triviales

- **`BarcodeDetector` y Web Speech API declaradas como interfaces locales** en barcode-scanner.ts y speech.ts (en lugar de `lib.dom.d.ts` para mantener limpieza).
- **`IsVideoLike` / `IsCheckIconButton` declarados localmente** en video.ts y video-playlist.ts para no tocar `_shared/`.
- **Renombrado `{emit}` → `{emit: emitEvent}`** en `video-playlist.ts` `#applyActive` para evitar sombrear la función importada.
- **`as string`** en qrcode.ts URL de dynamic import esm.sh (evita @ts-expect-error).

## Lock permanente respetado

NO se tocaron: `svg-chart-engine.ts`, `diagram-element-base.ts`, `diagram-types.ts`.

## Próxima tanda

**Tanda 9: pages + utils + shared (~600 errores)** — EN PROGRESO (WT-0091 cerrado, WT-0092 corriendo).
**Tanda 10: Sweep final + merge prep** — pendiente.

## Métricas vivas

- Errores strict audit: **~2,613**
- Tandas cerradas: 8 (T1-T8)
- Progreso: 70.2% del baseline cerrado
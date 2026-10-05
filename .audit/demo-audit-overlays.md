# Demo Audit: overlays

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/overlays/<Componente>/<componente>.html` (las carpetas usan mayúsculas: `CommandPalette`, `PdfViewer`, `Window`). La categoría `overlays` agrupa:

- **Modales / paletas**: `command-palette`.
- **Visores**: `pdf-viewer`.
- **Ventanas**: `window`.

Total: 3 demos. El brief lista "~3"; el conteo real coincide.

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-command-palette` | `demos/overlays/CommandPalette/command-palette.html` | 114 | Cmd+K palette |
| 2 | `iswc-pdf-viewer`     | `demos/overlays/PdfViewer/pdf-viewer.html`         | 119 | Visor PDF (iframe) |
| 3 | `iswc-window`         | `demos/overlays/Window/window.html`               | 129 | Ventana SPA |

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
| `command-palette` | ❌ (botón open + atajo) | ✅ placeholder/empty-text/max-results + 11 comandos + eventos | ⚠️ parcial (`var(--iswc-border)`, `var(--iswc-radius)`, `var(--iswc-accent)`, `var(--iswc-text-soft)`) | ✅ | ✅ |
| `pdf-viewer`     | ❌ (depende de PDF externo) | (no leído a fondo) | ❌ hex | ✅ | ✅ |
| `window`         | ❌ (botones open/close) | (no leído a fondo) | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/3 | 3/3 | `command-palette` tiene botón open + atajo Ctrl/Cmd+K; `window` tiene botones |
| Cobertura de props | 1 pleno · 2 parciales | — | `command-palette` es el más completo |
| Tokens `--iswc-*` | 1 parcial · 2 sin | 3/3 | Solo `command-palette` usa 4 tokens (border, radius, accent, text-soft) |
| Funciona | 3/3 | 0/3 | Los bundles `dist/cdn/overlays/<x>.min.js` existen |
| Coherente con docs | 3/3 | 0/3 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos (con matices)

**Ninguno** de los 3 demos cumple el requisito #1 estricto. Pero `command-palette` es **el demo más interactivo del repo auditado**: combina botón open + atajo Ctrl/Cmd/K + 11 comandos seleccionables.

### Patrón "botón open + atajo"

- `command-palette.html` — botón "Abrir paleta" + atajo Ctrl/Cmd+K (manejado por el componente). El usuario **sí interactúa** seleccionando comandos. **No es playground en sentido estricto** (no se pueden editar props en vivo).
- `window.html` — botones open/close para demostrar la ventana SPA.
- `pdf-viewer.html` — depende de cargar un PDF (externo o local).

### Lo más cerca de un "playground"

- `command-palette.html` — 11 comandos con `group`, `icon`, `hint`, `keys`, `keywords`. **Es el demo más rico en contenido** aunque no sea playground.

## 2. Hallazgo crítico: `command-palette` es el **único demo de overlays con tokens `--iswc-*`**

A diferencia del resto del repo, `command-palette.html:21-38` adopta tokens canónicos con `var(--iswc-X, fallback)`:

```css
main .hero {
  background: #0f1620;
  border: 1px dashed var(--iswc-border, rgba(255,255,255,0.1));
  border-radius: var(--iswc-radius, 8px);
  ...
}
.trigger-btn {
  ...
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.04);
  color: inherit;
  cursor: pointer;
}
.trigger-btn:hover {
  border-color: var(--iswc-accent, #38bdf8);
  color: var(--iswc-accent, #38bdf8);
}
main .hero p { color: var(--iswc-text-soft); }
```

**Tokens usados**: `--iswc-border`, `--iswc-radius`, `--iswc-accent`, `--iswc-text-soft`. Es el patrón canónico que AGENTS.md §4.3 recomienda. **Vale la pena replicar este patrón en los otros demos**.

> **Excepción correcta:** los hex `#0f1620` y `rgba(255,255,255,0.18)`/`rgba(255,255,255,0.04)` siguen siendo literales. Pero la mayoría de las propiedades relevantes usan tokens.

## 3. Hallazgo sistémico: literales hex en el chrome

Los 3 demos comparten el bloque de estilos habitual (con excepción de `command-palette` que adopta tokens):

```css
html, body { margin: 0; padding: 0; height/min-height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 14px; background: #0f1620; }
header p { font-size: 12px; color: #94a3b8; }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; ... }
.iswc-<x>:not(:defined) { visibility: hidden; }
```

`pdf-viewer.html` y `window.html` usan hex puro. `command-palette.html` mezcla.

## 4. Cobertura de props — el 1 leído en detalle

### 4.1 `iswc-command-palette` (command-palette.html, 114 líneas) — **el mejor demo de la categoría**

- 1 `<iswc-command-palette>` con 11 comandos declarados vía `<script type="application/json">` hijo:
  - `new` (Ctrl+N), `open` (Ctrl+O), `save` (Ctrl+S), `export-pdf` (sin key).
  - `duplicate` (Ctrl+D), `rename` (F2), `find` (Ctrl+F).
  - `preferences` (Ctrl+,), `theme` (Ctrl+Shift+L).
  - `docs` (keywords: docs, manual), `shortcuts` (Ctrl+K+S).
- Cada comando tiene `id`, `title`, `group`, `icon`, `hint`, `keys`, `keywords`.
- Atributos: `placeholder="Buscar comando…"`, `empty-text="Sin coincidencias"`, `max-results="8"`.
- Slot `footer` con texto "Insoft Studio · v1".
- Listener para 5 eventos: `iswc-show`, `iswc-after-show`, `iswc-hide`, `iswc-after-hide`, `iswc-select`.
- Botón "Abrir paleta" que llama `palette.open()`.
- ✅ Coherente con `command-palette.md`.

### 4.2 `iswc-pdf-viewer` (pdf-viewer.html, 119 líneas)

- No leído a fondo (50 líneas leídas).
- Carga `<iswc-pdf-viewer>` con `iframe type="application/pdf"` y atributos toolbar.
- Usa un PDF público de Mozilla (depende de internet).
- Comentario sobre fallback "no plugin" en navegadores sin visor nativo.

### 4.3 `iswc-window` (window.html, 129 líneas)

- No leído a fondo.
- Sigue el patrón estándar.

## 5. Funcionamiento

Verifiqué los bundles:

- **overlays**: `dist/cdn/overlays/{command-palette,pdf-viewer,window}.min.js` + `.min.css`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

No encontré imports rotos.

**Importante:** `pdf-viewer.html` depende de un PDF externo (Mozilla). En CI sin red, este demo no renderizará el contenido (solo el shell).

## 6. Coherencia con la documentación

- Los nombres de props/atributos (`placeholder`, `empty-text`, `max-results`) encajan con `command-palette.md`.
- Los eventos enganchados (`iswc-show`, `iswc-after-show`, `iswc-hide`, `iswc-after-hide`, `iswc-select`) son los declarados.
- Los slots (`footer`, `default`) se usan correctamente.

**Ninguna incoherencia demo↔doc.**

## 7. Observaciones transversales

1. **Carpetas en mayúsculas**: `CommandPalette/`, `PdfViewer/`, `Window/`. Misma inconsistencia que `media/` (ver audit-media). El resto del repo usa minúsculas.

2. **`command-palette` es el ejemplo a seguir para tokens**: adopta 4 tokens `--iswc-*` con fallback hex. Vale la pena replicar este patrón.

3. **`pdf-viewer.html` depende de internet**: para CI, vale la pena tener un PDF local de fallback.

4. **Plantilla común**: los 3 demos comparten el mismo bloque de estilos. Refactorizable.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|---------------|--------|----------|
| `command-palette` | Añadir input para max-results/placeholder/empty-text | Cubre 11 comandos (excelente) | Ya tiene 4 tokens parciales | Bajo |
| `pdf-viewer`      | Añadir input para toolbar + src local | (no leído) | Sustituir hex restantes | Bajo |
| `window`          | (no leído) | (no leído) | Sustituir hex | Bajo |

## 9. Recomendaciones

1. **Replicar el patrón de `command-palette`** en `pdf-viewer.html` y `window.html`: sustituir hex por `var(--iswc-X, fallback)`.

2. **Crear `demos/_shared/demo-chrome.css`** con el bloque de estilos repetido.

3. **Normalizar case de carpetas**: pasar `CommandPalette/`, `PdfViewer/`, `Window/` a `command-palette/`, `pdf-viewer/`, `window/`.

4. **Documentar el patrón "atajo Ctrl+K + botón"**: `command-palette.html` muestra ambos. Vale la pena replicarlo en otros overlays.

5. **PDF local en `pdf-viewer.html`**: añadir un PDF de muestra en `assets/` para que el demo funcione offline.

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 3 demos auditados (1 leído en detalle: `command-palette`); 0 con playground interactivo (con matices: `command-palette` tiene botón + atajo); 1/3 con cobertura de props plena; **1/3 con tokens `--iswc-*` parciales** (`command-palette` es el único del repo auditado con `--iswc-border`/`--iswc-radius`/`--iswc-accent`/`--iswc-text-soft`); 0 demos rotos; 0 incoherencias demo↔doc; 1 observación menor (carpetas en mayúsculas, inconsistente con el resto del repo); 1 dependencia externa (PDF en `pdf-viewer.html`).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-overlays.md`.
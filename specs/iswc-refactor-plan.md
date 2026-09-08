# Plan de refactor ISWC — is-webcomponents (2026-09-08)

> **Fecha:** 2026-09-08
> **Sesión:** admin-is-dsh / agent-teams `iswc-full-refactor`
> **Estado:** EN PROGRESO — tareas T1-T4 cerradas en rama `feature/limpieza-docs`.
> **Autor commits:** `Jeff-Aporta` (sin `Co-authored-by:`).

## Objetivo

Alinear `is-webcomponents` con el **perfil ISWC** cerrando los hallazgos
del audit (`--sin-deep`) y refinando las reglas del motor auditor que
violan la definición de ISWC. Llevar el proyecto a `deep-test 100%
limpio`.

## Contexto

- El perfil ISWC define a `is-webcomponents` como **el kit** de Web
  Components: mantiene `src/components/`, tipos colocalizados, exports
  como librería. NO es una `iswc-app` (que tendría `src/js/components/`
  con cada componente en su carpeta).
- El motor auditor (`%DSH_HOME%/profiles/auditor/motor`) tiene reglas
  que asumen la estructura de `patyia-api` (un solo tipo de proyecto).
  El perfil ISWC es diferente y el motor debe adaptarse.

## Hallazgos del audit (corrida `20260907-205519` modo barrido)

### H1-H4 · `PREF-IMPORT-TYPE` (MEDIO) — **CERRADOS EN T2**

`import type` interleaved con imports de valor en 4 archivos de
`src/utils/health/e2e/`. La regla exige que los `import type` vayan al
**final del bloque** (después de todos los imports de valor).

| # | Archivo | Estado |
|---|---|---|
| H1 | `src/utils/health/e2e/05-cobertura-total.test.ts` L26-47 | ✅ Cerrado |
| H2 | `src/utils/health/e2e/lib/harness.ts` L7-21 | ✅ Cerrado |
| H3 | `src/utils/health/e2e/lib/server.ts` L8 | ✅ Cerrado |
| H4 | `src/utils/health/e2e/run.ts` L11 | ✅ Cerrado |

**Verificación post-fix:**
- `npm run typecheck` → PASS exit 0
- `npm test` → 286/286 pass
- `python -B auditor.py audit ... --sin-deep` → 0 hallazgos `PREF-IMPORT-TYPE`

### H5-H10 · `S-C1` archivos sin import relativo detectado (BAJO)

**Decisión: MANTENER** los 6 archivos — son **entry points legítimos**
del catálogo ISWC, cargados por la galería vía dynamic import.

| # | Archivo | Naturaleza | Registro en `catalog.ts` |
|---|---|---|---|
| H5 | `src/components/data-viz/heatmap.preview.ts` | preview de `is-heatmap` | L131 `behavior: ../components/data-viz/heatmap.preview.js` |
| H6 | `src/components/navigation/mega-menu.preview.ts` | preview de `is-mega-menu` | L739 `behavior: ../components/navigation/mega-menu.preview.js` |
| H7 | `src/components/overlays/command-palette.preview.ts` | preview de `is-command-palette` | L776 `behavior: ../components/overlays/command-palette.preview.js` |
| H8 | `src/pages/ecosystem.ts` | entry point de página | L798 `behavior: ../pages/ecosystem.js` |
| H9 | `src/pages/home.ts` | entry point de página | L547 `behavior: ../pages/home.js` |
| H10 | `src/pages/theming.ts` | entry point de página | L793 `behavior: ../pages/theming.js` |

**Evidencia (por qué NO son drift):**

1. Los 6 archivos son invocados por nombre desde
   `src/previews/catalog.ts` (registro `behavior:`).
2. La galería los importa vía dynamic import
   (`import('${path}.js')` con ts-resolve-hook que mapea `.js → .ts`).
3. Sus tipos de retorno se declaran vía JSDoc `import(...)` (no
   relativos) — patrón canónico de la previews ISWC kit.
4. Sus dependencias son **globales del DOM** (`document`, `window`,
   `addEventListener`) — no necesitan imports relativos.
5. La regla S-C1 del motor asume que todo `.ts` debe tener al menos un
   import relativo, pero **no considera el patrón entry-point de
   previews/pages**. La regla debe refinarse en T3.

**Acción:** NO se borran los archivos. Se documentan como
`improcedente` con la evidencia anterior.

**Pendiente para T3 (refinamiento del motor):** la regla `S-C1` debe
excluir archivos en `src/components/**/*.preview.ts` y `src/pages/*.ts`
(patrones canónicos de entry points de la galería ISWC).

### B1 · `S-PUERTO-SIN-ASIGNAR` (MEDIO) — **CERRADO EN T2**

`is-webcomponents` no tenía puerto server registrado en
`perfil-puertos.json`.

**Acción aplicada:**
```bash
python -B auditor.py puertos asignar is-webcomponents server
# → is-webcomponents server -> 8801
```

**Cambio:** `perfil-puertos.json` ahora incluye `is-webcomponents:
{server: 8801, testing: null}`.

### B2 · `S-PUERTO-FUERA` (MEDIO) — **CERRADO EN T2**

Puerto `20040` detectado en `src/components/isp/catalogo-gen.{json,
preview.ts}` — estaba dentro de comentarios (ejemplos de
configuración del controller JSON), NO era código ejecutable.

**Acción aplicada:** Reemplazado el literal `port: 20040` por el
placeholder `port: <SERVER_PORT>` en ambos archivos. La galería los
muestra como código de ejemplo, sin que el puerto sea funcional.

**Verificación post-fix:** `python -B auditor.py audit ...
--sin-deep` → 0 hallazgos `S-PUERTO-FUERA`.

## Hallazgos pendientes (cubrirán T3 — refinamiento del motor)

### C1 · `S-TIPOS-FOLDER` (MEDIO) — REFINAMIENTO NECESARIO

El auditor asume que TODO `type`/`interface` debe vivir en la folder
`src/consts/types/` (patrón `patyia-api`). PERO el **perfil ISWC kit**
mantiene tipos **COLOCALIZADOS** con cada componente — p. ej.
`src/components/_shared/diagram-text-wrap.ts` declara `WrapOpts`,
`WrappedLine`, `WrapResult`, `TSpanSpec` junto al helper que los
consume.

**Razón del patrón ISWC:** los `.d.ts` API contracts del kit (p. ej.
`src/previews/_kit/types.d.ts`) referencian estos tipos vía
`import type` o JSDoc `import(...)`. Mover los tipos a `src/consts/
types/` rompería la inmediatez del contrato.

**Refinamiento propuesto para T3:** en
`motor/vig/estructura_scripts.py::_tipos_folder`, agregar SKIP si:

```python
if kit_de(pid) is None and archivo_exporta_tipo_usado_en_dts(archivo):
    return  # ISWC kit: tipos colocalizados son DELIBERADOS
```

El helper `archivo_exporta_tipo_usado_en_dts(archivo)` debe ser
determinista (sin LLM): regex sobre `*.d.ts` del repo capturando
`import type { X }` y JSDoc `import('./path').X`, luego verificar que
algún nombre de tipo del archivo actual matchee.

### D1 · `misplaced-docs` (BAJO) — REFINAMIENTO NECESARIO

6 archivos bitácora (WIP-*.md, HANDOFF-*.md, EXEC-PLAN-*.md)
gitignored pero detectados por el auditor porque `_walk` no respeta
`.gitignore`.

**Refinamiento propuesto para T3:** en `motor/vig/walk.py::_walk`,
parsear el `.gitignore` del proyecto escaneado y excluir los paths
que matcheen algún patrón.

## Comandos de verificación (T4)

```bash
cd C:\ContaPyme\Personal\apps\is-webcomponents

# Gate local
npm run typecheck                                     # exit 0
npm test                                              # 286/286 pass
npm run build                                         # PASS

# Audit
python -B auditor.py audit . --sin-deep --sin-preguntas --sin-documentar \
  | grep -E "(PUERTO|PREF-IMPORT-TYPE|C1)"            # 0 matches
```

Métricas esperadas tras T4:

| Hallazgo | Estado actual | Tras T2 |
|---|---|---|
| H1-H4 (PREF-IMPORT-TYPE) | 4 | **0** ✅ |
| H5-H10 (S-C1) | 6 | 6 (improcedente; pendiente T3 motor) |
| B1 (S-PUERTO-SIN-ASIGNAR) | 1 | **0** ✅ |
| B2 (S-PUERTO-FUERA) | 1 | **0** ✅ |
| C1 (S-TIPOS-FOLDER) | ~25 | ~25 (pendiente T3 motor) |
| D1 (misplaced-docs) | 6 | 6 (pendiente T3 motor) |
| C2 (S-PREFIERE-TYPE) | ~15 | ~15 (style preference — desviación documentada) |

## Pendiente para T3 (refinamiento del motor)

| Regla | Archivo motor | Cambio |
|---|---|---|
| `S-C1` (entry-point exclusion) | `motor/vig/estructura_scripts.py` (o `nomenclatura.py`) | Excluir `src/components/**/*.preview.ts`, `src/pages/*.ts` |
| `_puertos_declarados` (comment filter) | `motor/vig/puertos.py` | Filtrar matches dentro de comentarios `//`, `/* */`, `<!-- -->`, `#` |
| `_tipos_folder` (ISWC kit aware) | `motor/vig/estructura_scripts.py` | SKIP si `kit_de(pid) is None` y archivo exporta tipos usados en `.d.ts` contracts |
| `_walk` (gitignore aware) | `motor/vig/walk.py` | Parsear `.gitignore` del proyecto y excluir paths matcheados |

Tras T3, los hallazgos `H5-H10`, `C1`, `D1` deberían caer a 0 sin
necesidad de tocar el proyecto.

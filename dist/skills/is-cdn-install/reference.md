# is-cdn-install — referencia de espejos

## Orígenes oficiales

```
jsDelivr  https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<ref>/dist/cdn
Pages     https://jeff-aporta.github.io/iswc-root/dist/cdn
```

Fuente de verdad en código: `src/components/_shared/cdn-ref.js` (`MIRRORS`, `resolveRef`, `fallbackBases`).

## Resolución de `<ref>`

1. Preferir SHA de `main` (`GET https://api.github.com/repos/Jeff-Aporta/iswc-root/commits/main` → header `Accept: application/vnd.github.sha`).
2. Cachear el SHA en `sessionStorage` (`iswc-wc:cdn-ref`) por sesión.
3. Si la API falla → `@main`.
4. Pages **ignora** el pin: siempre tip desplegado.

## Layout publicado (`dist/cdn/`)

```
dist/cdn/
  core/
    loader.min.js
    is-base.min.css
    palettes.min.css
  skills/<name>/SKILL.md    ← skills para agentes
  <categoria>/<name>.min.js|.min.css
```

Iconos: `dist/assets/icons/` (fuera de `dist/cdn/`).

## Skills en CDN

Tras `deno task build`, `skills/**` se copia a `dist/cdn/skills/**`.

Instalar en Cursor / agentes desde el repo:

```bash
npx skills add Jeff-Aporta/iswc-root -s is-cdn-install
npx skills add Jeff-Aporta/iswc-root -s iswc-root
```

O leer directo el `SKILL.md` por raw/CDN (URLs en el SKILL).

## Contrato de `<iswc-cdn-snippet>`

Atributos relevantes:

| Atributo | Rol |
| --- | --- |
| `tag` | Tag actual (`iswc-button`) |
| `category` | Categoría manifest (`actions`) |
| `base` | Override de CDN (opcional; ignora espejo) |
| `config` | JSON `{ docs: [{ label, url }] }` |

El panel auto-inyectado (`data-auto-cdn`) lo monta `scripts/cdn-panel.js` en `iswc-preview-ready`.

## Content-Type de MD

- `raw.githubusercontent.com` → `text/plain` (se ve en el navegador).
- jsDelivr / Pages → suelen forzar descarga como markdown.
- Para **fetch por agentes** cualquiera sirve; para **abrir en pestaña** preferir raw.

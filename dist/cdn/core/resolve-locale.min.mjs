/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/resolve-locale.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";var o="es";function i(n){let t=n!=null?String(n).trim():"";if(t)return t;let r=typeof document<"u"?String(document.documentElement?.lang||"").trim():"";if(r)return r;let e=typeof navigator<"u"?String(navigator.language||navigator.languages?.[0]||"").trim():"";return e||o}export{i as resolveLocale};

/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/ranuras.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";var n=new WeakMap;function s(t){let r=t.constructor.ranuras;return Array.isArray(r)?[...r]:[]}function l(t,r){let e=t.shadowRoot;return e?e.querySelector(`slot[name="${r}"]`)??(r==="default"?e.querySelector("slot:not([name])"):null):null}function u(t){let r=t.actualizarAhora;typeof r=="function"&&r.call(t)}function i(t){if(n.has(t))return 0;let r=s(t);if(!r.length)return 0;let e=new MutationObserver(()=>u(t));for(let a of r){let o=l(t,a);o&&e.observe(o,{childList:!0,subtree:!0,characterData:!0})}return n.set(t,e),r.length}function c(t){let r=n.get(t);r&&(r.disconnect(),n.delete(t))}export{i as conectarRanuras,c as desconectarRanuras,l as ranura,s as ranurasDe};

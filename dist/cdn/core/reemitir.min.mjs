/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/reemitir.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";function s(t,n,i){let e=t.target??t.currentTarget;if(!e||!("dispatchEvent"in e))return!1;let o="detail"in t?t.detail:void 0,a={bubbles:!0,composed:!0,cancelable:!1,...i},r=new CustomEvent(n??t.type,{...a,detail:o});return e.dispatchEvent(r)}export{s as reemitir};

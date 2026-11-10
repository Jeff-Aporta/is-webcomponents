/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/anunciar.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";var t=null;function i(){return typeof document>"u"?null:(t?.isConnected||(t=document.createElement("div"),t.setAttribute("aria-live","polite"),t.setAttribute("aria-atomic","true"),t.setAttribute("role","status"),t.className="iswc-vivo",t.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap",document.body.appendChild(t)),t)}function o(n){let e=i();e&&(e.textContent="",setTimeout(()=>{e.textContent=n},50))}export{o as anunciar,i as regionViva};

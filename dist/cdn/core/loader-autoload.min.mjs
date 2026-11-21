/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/cdn/loader-autoload.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";var s="iswc-";function i(e){return typeof customElements<"u"&&!!customElements.get(e)}function c(e){return e||(typeof document<"u"?document:null)}function f(e){let n=new Set;if(e.nodeType===1){let t=e;t.localName.startsWith(s)&&!i(t.localName)&&n.add(t.localName)}for(let t of e.querySelectorAll("*"))t.localName.startsWith(s)&&!i(t.localName)&&n.add(t.localName);return[...n].sort()}function N(e,n){let t=c(e);if(!t||typeof MutationObserver>"u")return{parar(){}};let l=new Set,d=o=>{l.has(o)||i(o)||(l.add(o),Promise.resolve().then(()=>n(o)).catch(()=>!1).finally(()=>{l.delete(o)}))},m=o=>{if(o.nodeType!==1)return;let r=o;r.localName.startsWith(s)&&d(r.localName);for(let a of r.querySelectorAll("*"))a.localName.startsWith(s)&&d(a.localName)};for(let o of f(t))d(o);let u=new MutationObserver(o=>{for(let r of o)for(let a of r.addedNodes)m(a)});return u.observe(t,{childList:!0,subtree:!0}),{parar(){u.disconnect()}}}function p(e){let n=c(e);return n?f(n).length===0:!0}export{p as listos,N as observar};

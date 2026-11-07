/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/wake-lock.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/wake-lock.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/wake-lock.js
 */
import{h as r,k as g,l as k}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as o,g as a,h,i as c,j as n}from"../_chunks/chunk-CMZVHIC2.mjs";var m=":host{display:contents}";(()=>{var t,s,e,d,u;let v=document.createElement("template");v.innerHTML="<slot></slot>";class l extends g{constructor(){super();h(this,e);h(this,t,null);h(this,s);this.shadowRoot.appendChild(v.content.cloneNode(!0)),c(this,s,()=>{document.visibilityState==="visible"&&this.active&&n(this,e,d).call(this)})}connectedCallback(){document.addEventListener("visibilitychange",a(this,s)),this.active&&n(this,e,d).call(this)}disconnectedCallback(){document.removeEventListener("visibilitychange",a(this,s)),n(this,e,u).call(this)}attributeChangedCallback(){this.active?n(this,e,d).call(this):n(this,e,u).call(this)}get active(){return this.hasAttribute("active")}set active(i){this.toggleAttribute("active",!!i)}get held(){return!!a(this,t)}}t=new WeakMap,s=new WeakMap,e=new WeakSet,d=async function(){if(!(!("wakeLock"in navigator)||a(this,t)))try{let i=await navigator.wakeLock.request("screen");c(this,t,i),i.addEventListener("release",()=>{c(this,t,null),r(this,"iswc-change",{held:!1})}),r(this,"iswc-change",{held:!0})}catch{r(this,"iswc-change",{held:!1})}},u=async function(){let i=a(this,t);if(i){try{await i.release()}catch{}c(this,t,null)}},o(l,"tag","iswc-wake-lock"),o(l,"css",m),o(l,"observed",["active"]),k(l,"IswcWakeLock")})();

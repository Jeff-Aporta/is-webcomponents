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
import{h,k as g,l as k}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as r,g as a,h as l,i as c,j as n}from"../_chunks/chunk-CMZVHIC2.mjs";var m=":host{display:contents}";(()=>{var e,s,t,d,v;let u=document.createElement("template");u.innerHTML="<slot></slot>";class o extends g{constructor(){super();l(this,t);l(this,e,null);l(this,s);this.shadowRoot.appendChild(u.content.cloneNode(!0)),c(this,s,()=>{document.visibilityState==="visible"&&this.active&&n(this,t,d).call(this)})}connectedCallback(){document.addEventListener("visibilitychange",a(this,s)),this.active&&n(this,t,d).call(this)}disconnectedCallback(){document.removeEventListener("visibilitychange",a(this,s)),n(this,t,v).call(this)}attributeChangedCallback(){this.active?n(this,t,d).call(this):n(this,t,v).call(this)}get active(){return this.hasAttribute("active")}set active(i){this.toggleAttribute("active",!!i)}get held(){return!!a(this,e)}}e=new WeakMap,s=new WeakMap,t=new WeakSet,d=async function(){if(!(!("wakeLock"in navigator)||a(this,e)))try{let i=await navigator.wakeLock.request("screen");c(this,e,i),i.addEventListener("release",()=>{c(this,e,null),h(this,"iswc-change",{held:!1})}),h(this,"iswc-change",{held:!0})}catch{h(this,"iswc-change",{held:!1})}},v=async function(){let i=a(this,e);if(i){try{await i.release()}catch{}c(this,e,null)}},r(o,"tag","iswc-wake-lock"),r(o,"css",m),r(o,"observed",["active"]),k(o,"IswcWakeLock")})();

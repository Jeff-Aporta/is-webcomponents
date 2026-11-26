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
import{h,k,l as m}from"../_chunks/chunk-2UCN2NRS.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-5XFYD3KA.mjs";import{f as r,g as a,h as l,i as n,j as c}from"../_chunks/chunk-CMZVHIC2.mjs";var g=":host{display:contents}";(()=>{var e,s,t,d,v;let u=document.createElement("template");u.innerHTML="<slot></slot>";class o extends k{constructor(){super();l(this,t);l(this,e,null);l(this,s);this.shadowRoot.appendChild(u.content.cloneNode(!0)),n(this,s,()=>{document.visibilityState==="visible"&&this.active&&c(this,t,d).call(this)})}connectedCallback(){document.addEventListener("visibilitychange",a(this,s)),this.active&&c(this,t,d).call(this)}disconnectedCallback(){document.removeEventListener("visibilitychange",a(this,s)),c(this,t,v).call(this)}attributeChangedCallback(){this.active?c(this,t,d).call(this):c(this,t,v).call(this)}get active(){return this.hasAttribute("active")}set active(i){this.toggleAttribute("active",!!i)}get held(){return!!a(this,e)}}e=new WeakMap,s=new WeakMap,t=new WeakSet,d=async function(){if(!(!("wakeLock"in navigator)||a(this,e)))try{let i=await navigator.wakeLock.request("screen");n(this,e,i),i.addEventListener("release",()=>{n(this,e,null),h(this,"iswc-change",{held:!1})}),h(this,"iswc-change",{held:!0})}catch{h(this,"iswc-change",{held:!1})}},v=async function(){let i=a(this,e);if(i){try{await i.release()}catch{}n(this,e,null)}},r(o,"tag","iswc-wake-lock"),r(o,"css",g),r(o,"observed",["active"]),m(o,"IswcWakeLock")})();

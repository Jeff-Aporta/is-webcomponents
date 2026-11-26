/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/login-gate.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/login-gate.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/login-gate.js
 */
import"../_chunks/chunk-DTJSZJBF.mjs";import"../_chunks/chunk-46AEUJQ5.mjs";import"../_chunks/chunk-62BRZBDL.mjs";import"../_chunks/chunk-OUWVAEWW.mjs";import"../_chunks/chunk-273HPP6Z.mjs";import"../_chunks/chunk-XX5GSHEB.mjs";import"../_chunks/chunk-CFXAR6HA.mjs";import"../_chunks/chunk-L4RJMEKI.mjs";import"../_chunks/chunk-FNA6NCU3.mjs";import"../_chunks/chunk-HM4ZAOSC.mjs";import"../_chunks/chunk-2UG6R2ZP.mjs";import"../_chunks/chunk-Y4RDYUGS.mjs";import"../_chunks/chunk-LI2TC7X5.mjs";import"../_chunks/chunk-F3MT5RSD.mjs";import"../_chunks/chunk-JNX7EB6Q.mjs";import"../_chunks/chunk-2GHB5Y6L.mjs";import"../_chunks/chunk-UTULPX7G.mjs";import"../_chunks/chunk-TPHMQPBF.mjs";import"../_chunks/chunk-UWQ36HTN.mjs";import"../_chunks/chunk-VNNEUB5D.mjs";import{k as u,l as b}from"../_chunks/chunk-2UCN2NRS.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-5XFYD3KA.mjs";import{f as l,g as i,h as r,i as a,j as p}from"../_chunks/chunk-CMZVHIC2.mjs";var v=":host{--iswc-gate-gap: var(--iswc-space-m, .75em);display:block;box-sizing:border-box}:host *{box-sizing:border-box}[hidden]{display:none!important}#curtain{display:flex;flex-direction:column;align-items:center;gap:var(--iswc-gate-gap);padding-block:calc(var(--iswc-space-l, 1em) * 1.35)}#protected{display:block}";var f=`
<div id="curtain" part="curtain">
  <slot name="public"></slot>
  <iswc-login id="login" part="login"></iswc-login>
</div>
<div id="protected" part="protected">
  <slot name="protected"></slot>
</div>`,E=document.createElement("template");E.innerHTML=f;var t,s,d,n,h,e=class extends u{constructor(){super();r(this,n);r(this,t);r(this,s);r(this,d,null);this.shadowRoot.appendChild(E.content.cloneNode(!0))}connectedCallback(){super.connectedCallback?.(),a(this,t,this.shadowRoot.getElementById("curtain")),a(this,s,this.shadowRoot.getElementById("protected")),a(this,d,this.shadowRoot.getElementById("login")),p(this,n,h).call(this)}attributeChangedCallback(){p(this,n,h).call(this)}get logged(){return this.hasAttribute("logged")}set logged(o){this.toggleAttribute("logged",o)}};t=new WeakMap,s=new WeakMap,d=new WeakMap,n=new WeakSet,h=function(){if(!i(this,t))return;let o=this.logged;i(this,t).hidden=o,i(this,s).hidden=!o;let c=i(this,d);if(c)for(let g of["busy","error","notice","heading","subtitle","provider","providers","mode"]){let m=this.getAttribute(g);m===null?c.removeAttribute(g):c.setAttribute(g,m)}},l(e,"tag","iswc-login-gate"),l(e,"css",v),l(e,"observed",["logged","busy","error","notice","heading","subtitle","provider","providers","mode"]);b(e);

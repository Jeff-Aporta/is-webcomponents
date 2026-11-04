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
import"../_chunks/chunk-IY2XKD7W.mjs?v=rtonr7";import"../_chunks/chunk-PTIWTGK4.mjs?v=zdb3lp";import"../_chunks/chunk-XVYCPI3G.mjs?v=5qloum";import"../_chunks/chunk-XU3X5KAT.mjs?v=tnvarm";import"../_chunks/chunk-BO7BUIRF.mjs?v=fe6637";import"../_chunks/chunk-7H5PCA5O.mjs?v=a6feki";import"../_chunks/chunk-RM64XCAT.mjs?v=7kpjkb";import"../_chunks/chunk-DYLQLICV.mjs?v=mwns8b";import"../_chunks/chunk-FVSB5PYC.mjs?v=nvnqbl";import"../_chunks/chunk-WVQWHB6V.mjs?v=wgv94v";import"../_chunks/chunk-HMJT6MKY.mjs?v=sby2mq";import"../_chunks/chunk-NQXM7VMM.mjs?v=myjoa6";import"../_chunks/chunk-UKZKSP2L.mjs?v=yt9lp4";import"../_chunks/chunk-DJGR6SMO.mjs?v=z42y8w";import"../_chunks/chunk-KMS5XOZG.mjs?v=31a9r0";import"../_chunks/chunk-NXN5A2MA.mjs?v=fncrll";import"../_chunks/chunk-OL6OTHJ3.mjs?v=74vaaz";import"../_chunks/chunk-E64TXUTU.mjs?v=ltfvdx";import"../_chunks/chunk-DUEVB7TO.mjs?v=gixspc";import"../_chunks/chunk-6BJZBUCR.mjs?v=a59f5i";import{a as u,b}from"../_chunks/chunk-XP253YBZ.mjs?v=7txe1k";import"../_chunks/chunk-MNU2XQTU.mjs?v=khcy6g";import"../_chunks/chunk-HCLZRPU3.mjs?v=nylj0w";import"../_chunks/chunk-C7ON665Q.mjs?v=6f2qf1";import"../_chunks/chunk-SNHMDDOU.mjs?v=6lxkqf";import{f as d,g as i,h as s,i as a,j as p}from"../_chunks/chunk-4PV5NT2U.mjs?v=58b9qn";var v=":host{--iswc-gate-gap: var(--iswc-space-m, .75em);display:block;box-sizing:border-box}:host *{box-sizing:border-box}[hidden]{display:none!important}#curtain{display:flex;flex-direction:column;align-items:center;gap:var(--iswc-gate-gap);padding-block:calc(var(--iswc-space-l, 1em) * 1.35)}#protected{display:block}";var T=`
<div id="curtain" part="curtain">
  <slot name="public"></slot>
  <iswc-login id="login" part="login"></iswc-login>
</div>
<div id="protected" part="protected">
  <slot name="protected"></slot>
</div>`,E=document.createElement("template");E.innerHTML=T;var e,n,l,r,h,t=class extends u{constructor(){super();s(this,r);s(this,e);s(this,n);s(this,l,null);this.shadowRoot.appendChild(E.content.cloneNode(!0))}connectedCallback(){super.connectedCallback?.(),a(this,e,this.shadowRoot.getElementById("curtain")),a(this,n,this.shadowRoot.getElementById("protected")),a(this,l,this.shadowRoot.getElementById("login")),p(this,r,h).call(this)}attributeChangedCallback(){p(this,r,h).call(this)}get logged(){return this.hasAttribute("logged")}set logged(o){this.toggleAttribute("logged",o)}};e=new WeakMap,n=new WeakMap,l=new WeakMap,r=new WeakSet,h=function(){if(!i(this,e))return;let o=this.logged;i(this,e).hidden=o,i(this,n).hidden=!o;let c=i(this,l);if(c)for(let g of["busy","error","notice","heading","subtitle","provider","providers","mode"]){let m=this.getAttribute(g);m===null?c.removeAttribute(g):c.setAttribute(g,m)}},d(t,"tag","iswc-login-gate"),d(t,"css",v),d(t,"observed",["logged","busy","error","notice","heading","subtitle","provider","providers","mode"]);b(t);

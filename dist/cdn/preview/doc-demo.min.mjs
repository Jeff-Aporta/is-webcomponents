/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/doc-demo.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/doc-demo.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/doc-demo.js
 */
import"../_chunks/chunk-YGH7YLIY.mjs";import"../_chunks/chunk-XWDMIINL.mjs";import"../_chunks/chunk-TWU4DVVR.mjs";import"../_chunks/chunk-JFX6SU4V.mjs";import"../_chunks/chunk-AP7SJM5W.mjs";import"../_chunks/chunk-YKJW2C3P.mjs";import"../_chunks/chunk-GQRSV43S.mjs";import"../_chunks/chunk-KZXFWPKM.mjs";import"../_chunks/chunk-YPF4LU3U.mjs";import"../_chunks/chunk-NERLCD5F.mjs";import"../_chunks/chunk-P6XCOQUR.mjs";import"../_chunks/chunk-AKUBYLDE.mjs";import"../_chunks/chunk-75KJXU3G.mjs";import"../_chunks/chunk-3GGX7YOD.mjs";import"../_chunks/chunk-7474BMO6.mjs";import"../_chunks/chunk-CJEGVFBN.mjs";import"../_chunks/chunk-LSKRIUSZ.mjs";import"../_chunks/chunk-RF4M2ZKD.mjs";import"../_chunks/chunk-7IBSWVMF.mjs";import"../_chunks/chunk-GBFDIYLI.mjs";import"../_chunks/chunk-FRSYAEVR.mjs";import"../_chunks/chunk-ULEYSFJN.mjs";import"../_chunks/chunk-2GHB5Y6L.mjs";import"../_chunks/chunk-IWE2M5AU.mjs";import"../_chunks/chunk-TPHMQPBF.mjs";import"../_chunks/chunk-MNP72QJS.mjs";import"../_chunks/chunk-OYJGC4Q2.mjs";import{k as f,l as y}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as p,g as m,h as u,i as g,j as c}from"../_chunks/chunk-CMZVHIC2.mjs";var _=["iswc-palettes-default","iswc-doc-shell","iswc-doc-presentation"],x=["highlight-pre","demo-code","docs-chrome","cdn-panel","view-sources","demo-file-meta"];function P(){return globalThis.iswcLoader||null}function A(s,v){if(s==null||s.trim()==="")return v;try{let e=JSON.parse(s);if(Array.isArray(e)&&e.every(a=>typeof a=="string"))return e}catch{}return s.split(/[,\s]+/).map(e=>e.trim()).filter(Boolean)}var h,b,t,L,w,S,k,n=class extends f{constructor(){super(...arguments);u(this,t);u(this,h,!1);u(this,b,!1)}get ready(){return this.dataset.ready==="1"}whenReady(){return this.ready?Promise.resolve(this):new Promise(e=>{this.addEventListener("iswc-doc-demo-ready",()=>e(this),{once:!0})})}connectedCallback(){super.connectedCallback(),this.querySelector(":scope > .shell-bar")?c(this,t,w).call(this):c(this,t,L).call(this),c(this,t,k).call(this),c(this,t,S).call(this)}attributeChangedCallback(){this.isConnected&&this.querySelector(":scope > .shell-bar")&&c(this,t,w).call(this)}};h=new WeakMap,b=new WeakMap,t=new WeakSet,L=function(){let e=this.getAttribute("brand")||"ISWC",a=this.getAttribute("brand-icon")||"mdi:apps-box",r=this.getAttribute("brand-href")||"./",l=this.getAttribute("brand-label")||"Inicio (Home)",d=this.getAttribute("nav-label")||"Componentes",i=this.getAttribute("drawer-label")||d,E=this.getAttribute("storage-key-nav")||"iswc-doc-nav",C=this.getAttribute("tools-label")||"Herramientas";this.innerHTML=`
      <header class="shell-bar" id="shellBar">
        <a class="shell-brand" id="shellBrand" href="${o(r)}" aria-label="${o(l)}">
          <iswc-icon class="shell-brand__icon" icon="${o(a)}" aria-hidden="true"></iswc-icon>
          <span class="shell-brand__text">${q(e)}</span>
        </a>

        <iswc-button class="shell-menu-btn" id="navToggle" color="text" variant="plain" pill type="button"
                aria-expanded="false" aria-controls="navDrawer"
                aria-label="Abrir el cat\xE1logo de componentes" title="Cat\xE1logo de componentes" hidden>
          <iswc-icon slot="start" icon="mdi:menu"></iswc-icon>
        </iswc-button>

        <iswc-palette-selector id="brandPalette" scope="root" aria-label="Elegir paleta"></iswc-palette-selector>

        <div class="shell-tools" role="toolbar" aria-label="${o(C)}">
          <iswc-button class="shell-icon-btn shell-tool-btn" id="panelsCompactBtn" color="text" variant="plain" pill type="button"
                  aria-pressed="false"
                  aria-label="Compactar paneles laterales" title="Compactar paneles laterales">
            <iswc-icon slot="start" icon="mdi:arrow-collapse-horizontal"></iswc-icon>
          </iswc-button>
        </div>

        <iswc-button class="shell-icon-btn" id="fullscreenBtn" color="text" variant="plain" pill type="button" aria-label="Abrir preview en pantalla completa" title="Abrir preview en pantalla completa">
          <iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>
        </iswc-button>

        <iswc-theme-toggle id="themeToggle" scope="root" dark="true"></iswc-theme-toggle>
      </header>

      <iswc-split-panel id="mainSplit" class="main-split" orientation="horizontal" position-in-pixels="200" primary="start" storage-key="${o(E)}">
        <nav class="shell-nav" slot="start" id="shellNav" aria-label="${o(d)}"></nav>
        <div class="preview-stage" slot="end">
          <iswc-preview-component class="preview-host" id="previewHost" hidden></iswc-preview-component>
          <iframe class="preview-frame" id="previewFrame" title="Vista del componente"></iframe>
        </div>
      </iswc-split-panel>

      <iswc-drawer id="navDrawer" class="shell-nav-drawer" placement="start" light-dismiss
                 label="${o(i)}"></iswc-drawer>
    `},w=function(){let e=this.getAttribute("brand");if(e!=null){let i=this.querySelector(".shell-brand__text");i&&(i.textContent=e)}let a=this.getAttribute("brand-icon");if(a!=null){let i=this.querySelector(".shell-brand__icon");i&&i.setAttribute("icon",a)}let r=this.getAttribute("brand-href");if(r!=null){let i=this.querySelector("#shellBrand");i&&i.setAttribute("href",r)}let l=this.getAttribute("storage-key-nav");l!=null&&this.querySelector("#mainSplit")?.setAttribute("storage-key",l);let d=this.getAttribute("tools-label");d!=null&&this.querySelector(".shell-tools")?.setAttribute("aria-label",d)},S=async function(){if(m(this,h))return;g(this,h,!0);let e=P();if(!e){console.warn("[iswc-doc-demo] iswcLoader no disponible");return}let a=A(this.getAttribute("page-styles"),_),r=A(this.getAttribute("page-modules"),[...x]);this.hasAttribute("dev")&&!r.includes("dev-reload")&&r.push("dev-reload");try{e.loadPageStyles(a),await e.loadPageModules(r).catch(l=>console.warn("[iswc-doc-demo] page modules",l))}catch(l){console.error("[iswc-doc-demo] boot",l)}},k=function(){m(this,b)||(g(this,b,!0),document.documentElement.dataset.kitShell="1",this.dataset.ready="1",this.dispatchEvent(new CustomEvent("iswc-doc-demo-ready",{bubbles:!0,composed:!0})),window.dispatchEvent(new Event("iswc-gallery-shell-ready")))},p(n,"tag","iswc-doc-demo"),p(n,"shadowInit",null),p(n,"deps",["iswc-button","iswc-icon"]),p(n,"observed",["brand","brand-icon","brand-href","brand-label","nav-label","drawer-label","storage-key-nav","tools-label","page-styles","page-modules","dev"]);function o(s){return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function q(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}y(n,"IswcDocDemo");

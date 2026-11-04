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
import"../_chunks/chunk-CU5LJYJT.mjs?v=83ftpn";import"../_chunks/chunk-7E66CP6J.mjs?v=ij1xue";import"../_chunks/chunk-IIBDHW3T.mjs?v=8pszuc";import"../_chunks/chunk-MEJ5JQKE.mjs?v=59p9j9";import"../_chunks/chunk-ZMIKW2M5.mjs?v=0g3245";import"../_chunks/chunk-A5TSB4H5.mjs?v=8mj31f";import"../_chunks/chunk-HITYFFJR.mjs?v=dyddae";import"../_chunks/chunk-EIVYMCFT.mjs?v=gcmtq6";import"../_chunks/chunk-TXPDR74K.mjs?v=6ezlev";import"../_chunks/chunk-BO7BUIRF.mjs?v=fe6637";import"../_chunks/chunk-FOWFXBXY.mjs?v=fzuh8d";import"../_chunks/chunk-BKBKVYIF.mjs?v=u0qn9u";import"../_chunks/chunk-BEY56HIZ.mjs?v=si0xpr";import"../_chunks/chunk-XGICOROP.mjs?v=fm1wy0";import"../_chunks/chunk-M24LWXDD.mjs?v=5bm4o1";import"../_chunks/chunk-WI2LVM7Q.mjs?v=a3gk2t";import"../_chunks/chunk-ECQNE7TS.mjs?v=j2o4uc";import"../_chunks/chunk-6HMGYJLW.mjs?v=ctr8s8";import"../_chunks/chunk-OZBT4EQ2.mjs?v=4jx8hb";import"../_chunks/chunk-Q7EUKOB7.mjs?v=mq8eo3";import"../_chunks/chunk-6ST72NMQ.mjs?v=4wjvp6";import"../_chunks/chunk-ILILPR6R.mjs?v=bztzw8";import"../_chunks/chunk-S5AOGS65.mjs?v=nbzru6";import"../_chunks/chunk-UCMASPOL.mjs?v=34t4kr";import"../_chunks/chunk-HMJT6MKY.mjs?v=sby2mq";import"../_chunks/chunk-UKZKSP2L.mjs?v=yt9lp4";import"../_chunks/chunk-DJGR6SMO.mjs?v=z42y8w";import"../_chunks/chunk-UQ3Q5H7I.mjs?v=v1shfa";import"../_chunks/chunk-KMS5XOZG.mjs?v=31a9r0";import"../_chunks/chunk-NXN5A2MA.mjs?v=fncrll";import"../_chunks/chunk-OL6OTHJ3.mjs?v=74vaaz";import"../_chunks/chunk-E64TXUTU.mjs?v=ltfvdx";import"../_chunks/chunk-DUEVB7TO.mjs?v=gixspc";import"../_chunks/chunk-6BJZBUCR.mjs?v=a59f5i";import{a as f,b as y}from"../_chunks/chunk-XP253YBZ.mjs?v=7txe1k";import"../_chunks/chunk-MNU2XQTU.mjs?v=khcy6g";import"../_chunks/chunk-HCLZRPU3.mjs?v=nylj0w";import"../_chunks/chunk-C7ON665Q.mjs?v=6f2qf1";import"../_chunks/chunk-SNHMDDOU.mjs?v=6lxkqf";import{f as p,g as m,h as u,i as g,j as c}from"../_chunks/chunk-4PV5NT2U.mjs?v=58b9qn";var _=["iswc-palettes-default","iswc-doc-shell","iswc-doc-presentation"],x=["highlight-pre","demo-code","docs-chrome","cdn-panel","view-sources","demo-file-meta"];function P(){return globalThis.iswcLoader||null}function A(s,v){if(s==null||s.trim()==="")return v;try{let e=JSON.parse(s);if(Array.isArray(e)&&e.every(a=>typeof a=="string"))return e}catch{}return s.split(/[,\s]+/).map(e=>e.trim()).filter(Boolean)}var h,b,t,L,w,S,k,n=class extends f{constructor(){super(...arguments);u(this,t);u(this,h,!1);u(this,b,!1)}get ready(){return this.dataset.ready==="1"}whenReady(){return this.ready?Promise.resolve(this):new Promise(e=>{this.addEventListener("iswc-doc-demo-ready",()=>e(this),{once:!0})})}connectedCallback(){super.connectedCallback(),this.querySelector(":scope > .shell-bar")?c(this,t,w).call(this):c(this,t,L).call(this),c(this,t,k).call(this),c(this,t,S).call(this)}attributeChangedCallback(){this.isConnected&&this.querySelector(":scope > .shell-bar")&&c(this,t,w).call(this)}};h=new WeakMap,b=new WeakMap,t=new WeakSet,L=function(){let e=this.getAttribute("brand")||"ISWC",a=this.getAttribute("brand-icon")||"mdi:apps-box",r=this.getAttribute("brand-href")||"./",l=this.getAttribute("brand-label")||"Inicio (Home)",d=this.getAttribute("nav-label")||"Componentes",i=this.getAttribute("drawer-label")||d,E=this.getAttribute("storage-key-nav")||"iswc-doc-nav",C=this.getAttribute("tools-label")||"Herramientas";this.innerHTML=`
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

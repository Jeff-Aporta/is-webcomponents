/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/forms/duration-picker.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/forms/duration-picker.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/duration-picker.js
 */
import{h as E,k,l as L}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as w,g as s,h as m,i as h,j as r}from"../_chunks/chunk-CMZVHIC2.mjs";var y=":host{display:inline-block;font:inherit;color:var(--iswc-text);--iswc-duration-picker-bg: var(--iswc-control-bg, var(--iswc-bg-soft));--iswc-duration-picker-border: var(--iswc-control-border, var(--iswc-border))}.root{display:inline-flex;align-items:center;gap:.15em;background:var(--iswc-duration-picker-bg);border:1px solid var(--iswc-duration-picker-border);border-radius:var(--iswc-radius);padding:.25em .45em}:is(.col button,.cell){border:0;background:transparent;color:inherit;font:inherit;line-height:1;padding:0;border-radius:.25em}.col{display:grid;grid-template-rows:auto 1fr auto;align-items:stretch;gap:.0625em}.col button{cursor:pointer;color:var(--iswc-text-soft);font-size:.65em;height:1.5385em}.col button:hover{background:color-mix(in srgb,var(--iswc-accent) 18%,transparent);color:var(--iswc-accent)}.cell{width:2.4em;outline:0;font-size:1em;text-align:center;font-variant-numeric:tabular-nums;padding:.25em 0}.cell:focus{background:color-mix(in srgb,var(--iswc-accent) 14%,transparent)}.sep{font-weight:600;color:var(--iswc-text-soft);align-self:center;font-size:1.05em}";(()=>{var f,i,d,H,M,T,l,o,c,v;let N=["value","min","max","step"],u=x=>String(x).padStart(2,"0");class b extends k{constructor(){super();m(this,i);m(this,f,null);m(this,l);m(this,o);m(this,c);m(this,v);this.shadowRoot.innerHTML=`
        <div part="root" class="root">
          <slot name="start"></slot>
          <div class="col">
            <iswc-button variant="plain" pill class="up" data-target="h" aria-label="Aumentar horas">+</iswc-button>
            <input part="hours" class="cell" id="h" inputmode="numeric" maxlength="2" value="0" aria-label="Horas" />
            <iswc-button variant="plain" pill class="down" data-target="h" aria-label="Disminuir horas">\u2212</iswc-button>
          </div>
          <span class="sep" aria-hidden="true">:</span>
          <div class="col">
            <iswc-button variant="plain" pill class="up" data-target="m" aria-label="Aumentar minutos">+</iswc-button>
            <input part="minutes" class="cell" id="m" inputmode="numeric" maxlength="2" value="00" aria-label="Minutos" />
            <iswc-button variant="plain" pill class="down" data-target="m" aria-label="Disminuir minutos">\u2212</iswc-button>
          </div>
          <span class="sep" aria-hidden="true">:</span>
          <div class="col">
            <iswc-button variant="plain" pill class="up" data-target="s" aria-label="Aumentar segundos">+</iswc-button>
            <input part="seconds" class="cell" id="s" inputmode="numeric" maxlength="2" value="00" aria-label="Segundos" />
            <iswc-button variant="plain" pill class="down" data-target="s" aria-label="Disminuir segundos">\u2212</iswc-button>
          </div>
          <slot name="end"></slot>
        </div>
      `,h(this,v,this.shadowRoot.querySelector(".root")),h(this,l,this.shadowRoot.getElementById("h")),h(this,o,this.shadowRoot.getElementById("m")),h(this,c,this.shadowRoot.getElementById("s")),[s(this,l),s(this,o),s(this,c)].forEach(t=>{t.addEventListener("input",()=>r(this,i,H).call(this,t)),t.addEventListener("focus",()=>{h(this,f,t),t.select()}),t.addEventListener("blur",()=>r(this,i,M).call(this)),t.addEventListener("keydown",e=>r(this,i,T).call(this,e,t))}),s(this,v).addEventListener("click",t=>{let n=t.target?.closest("iswc-button[data-target]");if(!n)return;let a=n.dataset.target,g=Number(this.getAttribute("step"))||1,p=n.classList.contains("up")?1:-1;a==="s"&&this.tick(g*p),a==="m"&&this.tick(60*g*p),a==="h"&&this.tick(3600*g*p)})}onConnected(){r(this,i,d).call(this)}onAttributeChanged(t,e,n){r(this,i,d).call(this)}get value(){return Number(this.getAttribute("value")||0)}set value(t){this.setAttribute("value",String(Math.max(0,Math.round(Number(t)||0))))}get hours(){return Math.floor(this.value/3600)}get minutes(){return Math.floor(this.value%3600/60)}get seconds(){return this.value%60}get text(){let t=this.hours,e=this.minutes,n=this.seconds;return t?`${u(t)}:${u(e)}:${u(n)}`:`${u(e)}:${u(n)}`}tick(t){let e=this.value+Number(t||0),n=Number(this.getAttribute("min")),a=Number(this.getAttribute("max"));Number.isFinite(n)&&(e=Math.max(e,n)),Number.isFinite(a)&&(e=Math.min(e,a)),e!==this.value&&(this.value=e,r(this,i,d).call(this),E(this,"iswc-change",{value:this.value,text:this.text}))}set(t,e,n){let a=(Number(t)||0)*3600+(Number(e)||0)*60+(Number(n)||0);this.value=a,r(this,i,d).call(this)}setSeconds(t){this.value=t,r(this,i,d).call(this)}}f=new WeakMap,i=new WeakSet,d=function(){s(this,l).value=u(this.hours),s(this,o).value=u(this.minutes),s(this,c).value=u(this.seconds)},H=function(t){t.value=String(t.value).replace(/\D/g,"").slice(0,2),r(this,i,M).call(this)},M=function(){let t=Math.min(23,Number(s(this,l).value)||0),e=Math.min(59,Number(s(this,o).value)||0),n=Math.min(59,Number(s(this,c).value)||0),a=t*3600+e*60+n;this.value=a,r(this,i,d).call(this),E(this,"iswc-input"),E(this,"iswc-change",{value:a,text:this.text})},T=function(t,e){let n=t.target;if(t.key==="ArrowUp"||t.key==="ArrowDown"){t.preventDefault();let a=Number(this.getAttribute("step"))||1,g=t.key==="ArrowUp"?1:-1,p=e===s(this,l)?3600:e===s(this,o)?60:1;this.tick(p*a*g),n.select();return}if(t.key===":"||t.key===";"){t.preventDefault(),e===s(this,l)?s(this,o).focus():e===s(this,o)?s(this,c).focus():e.blur();return}},l=new WeakMap,o=new WeakMap,c=new WeakMap,v=new WeakMap,w(b,"tag","iswc-duration-picker"),w(b,"css",y),w(b,"deps",["iswc-button"]),w(b,"observed",[...N,"bg","border-color"]),L(b)})();

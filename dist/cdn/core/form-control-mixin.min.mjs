/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/form-control-mixin.ts
 */
import"../_chunks/chunk-4PV5NT2U.mjs?v=58b9qn";var l=document.createElement("template");l.innerHTML=`
  <div part="form-control" class="form-control">
    <slot></slot>
    <div part="hint" class="hint" id="fc-hint" hidden>
      <slot name="hint"></slot>
    </div>
    <div part="error-text" class="error-text" id="fc-error" hidden>
      <slot name="error-text"></slot>
    </div>
  </div>
`;function u(){return`
    <div part="form-control" class="form-control">
      <slot></slot>
      <div part="hint" class="hint" id="fc-hint" hidden>
        <slot name="hint"></slot>
      </div>
      <div part="error-text" class="error-text" id="fc-error" hidden>
        <slot name="error-text"></slot>
      </div>
    </div>
  `}function b(){return l}var c=["label","hint","errorText","disabled","readonly","required"],o=["start","end","top","bottom"],m=a=>class extends a{get label(){return this.getAttribute("label")??""}set label(t){t==null||t===""?this.removeAttribute("label"):this.setAttribute("label",t)}get hint(){return this.getAttribute("hint")??""}set hint(t){t==null?this.removeAttribute("hint"):this.setAttribute("hint",t)}get errorText(){return this.getAttribute("error-text")??""}set errorText(t){t==null?this.removeAttribute("error-text"):this.setAttribute("error-text",t)}get error(){return this.hasAttribute("error")||this.hasAttribute("error-text")}set error(t){this.toggleAttribute("error",!!t)}get disabled(){return this.hasAttribute("disabled")}set disabled(t){this.toggleAttribute("disabled",!!t)}get readonly(){return this.hasAttribute("readonly")}set readonly(t){this.toggleAttribute("readonly",!!t)}get required(){return this.hasAttribute("required")}set required(t){this.toggleAttribute("required",!!t)}get labelPlacement(){let t=this.getAttribute("label-placement");return o.includes(t??"")?t:"top"}set labelPlacement(t){o.includes(t)&&this.setAttribute("label-placement",t)}syncFormControl(){let t=this.shadowRoot?.getElementById("fc-hint"),r=this.shadowRoot?.getElementById("fc-error");if(t){let n=t.querySelector("slot"),s=this.hint.trim()||(n?.assignedNodes({flatten:!0}).some(e=>e.nodeType===1||e.nodeType===3&&(e.textContent??"").trim())??!1);t.hidden=!s}if(r){let n=r.querySelector("slot"),s=this.errorText.trim()||this.error||(n?.assignedNodes({flatten:!0}).some(e=>e.nodeType===1||e.nodeType===3&&(e.textContent??"").trim())??!1);r.hidden=!s}let i=[];t&&!t.hidden&&i.push("fc-hint"),r&&!r.hidden&&i.push("fc-error"),i.length?this.setAttribute("aria-describedby",i.join(" ")):this.removeAttribute("aria-describedby"),this.error?this.setAttribute("aria-invalid","true"):this.removeAttribute("aria-invalid"),this.required?this.setAttribute("aria-required","true"):this.removeAttribute("aria-required"),this.disabled?this.setAttribute("aria-disabled","true"):this.removeAttribute("aria-disabled")}};export{c as FORM_CONTROL_PROPS,m as MixinFormControl,u as formControlTemplate,b as getFormControlTemplate};

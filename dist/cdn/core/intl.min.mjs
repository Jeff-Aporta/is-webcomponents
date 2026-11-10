/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/intl.ts
 */
import"../_chunks/chunk-CMZVHIC2.mjs";function u(l,t){let n=l.map(r=>String(r).trim()).filter(Boolean);if(!n.length)return"";if(n.length===1)return n[0];let e=Intl.ListFormat;if(typeof e=="function")try{return new e(t,{style:"long",type:"conjunction"}).format(n)}catch{}return n.slice(0,-1).join(", ")+" y "+n[n.length-1]}function o(l,t,n){if(!t.length)return"";let e=Math.abs(l);if(t.length===1)return t[0];if(e===0&&t.length>2)return t[2];let r=Intl.PluralRules;if(typeof r=="function")try{return new r(n).select(l)==="one"?t[0]:t[1]}catch{}return e===1?t[0]:t[1]}export{u as lista,o as plural};
